import { NextRequest, NextResponse } from "next/server";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

// 엑셀 포맷: 헤더 행 1개 + 데이터
// 컬럼 A: 번호(무시) | B: 교회명 | C: 이름
// 또는 단순 2컬럼: A: 교회명 | B: 이름
// 이름 하나만 있어도 동작 (교회명 있으면 중복 이름 구분에 사용)

const CHURCH_MAP: Record<string, string> = {
  "가락동부": "가락동부교회",
  "광흥": "광흥교회",
  "도봉": "도봉교회",
  "도봉장로교회": "도봉교회",
  "명륜": "명륜교회",
  "상대원": "상대원교회",
  "성산": "성산교회",
  "송탄북부": "송탄북부교회",
  "안산북부": "안산북부교회",
  "초월제일": "초월제일교회",
  "평강": "평강교회",
  "평촌 평강교회": "평강교회",
  "평촌평강교회": "평강교회",
};

function normalizeChurch(raw: string): string {
  const t = raw.trim();
  return CHURCH_MAP[t] ?? t;
}

function isHeaderRow(row: (string | number | undefined)[]): boolean {
  const joined = row.map((c) => String(c ?? "").trim()).join("");
  return /이름|성명|교회|번호/.test(joined);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일을 첨부해 주세요." }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext ?? "")) {
      return NextResponse.json({ error: ".xlsx 또는 .xls 파일만 가능합니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number | undefined)[][];

    // 헤더 행 건너뛰기
    const dataRows = rawRows.filter((r) => r.some((c) => c !== undefined && c !== "")).filter((r) => !isHeaderRow(r));

    // 이름/교회 파싱 — 컬럼 수에 따라 유연하게 처리
    const entries: { name: string; church: string | null }[] = [];
    for (const r of dataRows) {
      const cols = r.map((c) => String(c ?? "").trim()).filter(Boolean);
      if (cols.length === 0) continue;

      let name = "", church: string | null = null;

      if (cols.length === 1) {
        // 이름만
        name = cols[0];
      } else if (cols.length === 2) {
        // 교회 | 이름  또는  번호 | 이름
        if (/^\d+$/.test(cols[0])) {
          name = cols[1];
        } else {
          church = normalizeChurch(cols[0]);
          name = cols[1];
        }
      } else {
        // 번호 | 교회 | 이름 | ...
        const firstIsNum = /^\d+$/.test(cols[0]);
        if (firstIsNum) {
          church = normalizeChurch(cols[1]);
          name = cols[2];
        } else {
          church = normalizeChurch(cols[0]);
          name = cols[1];
        }
      }

      if (name) entries.push({ name, church });
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: "파일에서 이름을 읽을 수 없습니다." }, { status: 400 });
    }

    const supabase = createClient();

    const { data: retreat } = await supabase
      .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
    if (!retreat) return NextResponse.json({ error: "수련회 데이터가 없습니다." }, { status: 400 });
    const retreatId = (retreat as { id: string }).id;

    // 전체 참석자 로드 (이름+교회 매칭용)
    const { data: allAttendees } = await supabase
      .from("attendees")
      .select("id, full_name, churches(canonical_name)")
      .eq("retreat_id", retreatId);

    type AttRow = { id: string; full_name: string; churches: { canonical_name: string } | null };
    const attendees = (allAttendees ?? []) as unknown as AttRow[];

    const matched: string[] = [];
    const notFound: string[] = [];
    const ambiguous: string[] = [];
    const idsToUpdate: string[] = [];

    for (const { name, church } of entries) {
      const byName = attendees.filter((a) => a.full_name === name);

      if (byName.length === 0) {
        notFound.push(name);
        continue;
      }

      if (byName.length === 1) {
        matched.push(name);
        idsToUpdate.push(byName[0].id);
        continue;
      }

      // 동명이인 — 교회로 구분
      if (church) {
        const byChurch = byName.filter((a) => a.churches?.canonical_name === church);
        if (byChurch.length === 1) {
          matched.push(`${name} (${church})`);
          idsToUpdate.push(byChurch[0].id);
          continue;
        }
      }
      ambiguous.push(`${name}${church ? ` (${church})` : ""} — ${byName.length}명 동명이인`);
    }

    // is_leader 일괄 업데이트
    let updated = 0;
    if (idsToUpdate.length > 0) {
      const { error } = await supabase
        .from("attendees")
        .update({ is_leader: true })
        .in("id", idsToUpdate);
      if (error) throw error;
      updated = idsToUpdate.length;
    }

    return NextResponse.json({
      success: true,
      total: entries.length,
      updated,
      matched,
      not_found: notFound,
      ambiguous,
    });
  } catch (err) {
    console.error("Import leaders error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "업로드 오류" }, { status: 500 });
  }
}
