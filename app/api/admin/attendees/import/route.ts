import { NextRequest, NextResponse } from "next/server";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

// 교회명 정규화
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

function parseBirthYear(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === null || raw === 0 || raw === "0") return null;
  if (typeof raw === "number") return raw >= 1955 && raw <= 2015 ? raw : null;
  const m = String(raw).match(/\b(19[5-9]\d|20[0-1]\d)\b/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y >= 1955 && y <= 2015 ? y : null;
}

function parseGender(raw: string | undefined): "male" | "female" | null {
  if (!raw) return null;
  return String(raw).trim() === "남" ? "male" : "female";
}

function parseAttendance(raw: string | undefined) {
  if (!raw) return { day1: true, day2: true, day3: true };
  return {
    day1: raw.includes("목"),
    day2: raw.includes("금"),
    day3: raw.includes("토"),
  };
}

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "엑셀 파일을 첨부해 주세요." }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext ?? "")) {
      return NextResponse.json({ error: ".xlsx 또는 .xls 파일만 업로드 가능합니다." }, { status: 400 });
    }

    // 파일 파싱
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames.includes("참석명단") ? "참석명단" : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number | undefined)[][];
    const dataRows = rawRows.slice(1).filter((r) => r[1] && r[2]);

    // 파싱
    const parsed = dataRows.map((r, idx) => {
      const churchRaw = String(r[1] ?? "").trim();
      const churchCanonical = normalizeChurch(churchRaw);
      const fullName = String(r[2] ?? "").trim();
      const gender = parseGender(r[3] as string);
      const birthYear = parseBirthYear(r[4] as string | number);
      const { day1, day2, day3 } = parseAttendance(String(r[8] ?? ""));
      return {
        _row: idx + 2,
        churchRaw, churchCanonical, fullName, gender, birthYear,
        shirtSize: String(r[6] ?? "").trim() || null,
        lodgingRequired: String(r[7] ?? "").trim() === "예",
        attendsDay1: day1, attendsDay2: day2, attendsDay3: day3,
        mealNotes: String(r[9] ?? "").trim() || null,
        arrivalNotes: String(r[10] ?? "").trim() || null,
      };
    });

    const invalid = parsed.filter((p) => !p.churchCanonical || !p.fullName || !p.gender || !p.birthYear);
    const valid = parsed.filter((p) => p.churchCanonical && p.fullName && p.gender && p.birthYear);

    const supabase = await createClient();

    // 수련회 ID
    const { data: retreat } = await supabase
      .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
    if (!retreat) return NextResponse.json({ error: "수련회 데이터가 없습니다." }, { status: 400 });
    const retreatId = (retreat as { id: string }).id;

    // 교회 upsert
    const churchSet = new Set(valid.map((p) => p.churchCanonical as string));
    await supabase.from("churches").upsert(
      [...churchSet].map((c) => ({ canonical_name: c, display_name: c })),
      { onConflict: "canonical_name" }
    );

    const { data: allChurches } = await supabase.from("churches").select("id, canonical_name");
    const churchMap: Record<string, string> = {};
    (allChurches ?? []).forEach((c: { id: string; canonical_name: string }) => { churchMap[c.canonical_name] = c.id; });

    // 교회 별칭
    const aliasRows: { church_id: string; alias_name: string }[] = [];
    const seenAliases = new Set<string>();
    parsed.forEach((p) => {
      if (!p.churchCanonical || !churchMap[p.churchCanonical] || seenAliases.has(p.churchRaw)) return;
      seenAliases.add(p.churchRaw);
      aliasRows.push({ church_id: churchMap[p.churchCanonical], alias_name: p.churchRaw });
    });
    if (aliasRows.length > 0) {
      await supabase.from("church_aliases").upsert(aliasRows, { onConflict: "alias_name" });
    }

    // 참석자 insert (중복 skip)
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < valid.length; i += 50) {
      const batch = valid.slice(i, i + 50).map((p) => ({
        retreat_id: retreatId,
        church_id: p.churchCanonical ? (churchMap[p.churchCanonical] ?? null) : null,
        church_name_raw: p.churchRaw,
        full_name: p.fullName,
        gender: p.gender as "male" | "female",
        birth_year: p.birthYear as number,
        shirt_size: p.shirtSize,
        lodging_required: p.lodgingRequired,
        attends_day1: p.attendsDay1,
        attends_day2: p.attendsDay2,
        attends_day3: p.attendsDay3,
        meal_notes: p.mealNotes,
        arrival_notes: p.arrivalNotes,
        attendance_status: "confirmed",
      }));

      const { error } = await supabase.from("attendees").upsert(batch, {
        onConflict: "retreat_id,full_name,birth_year",
        ignoreDuplicates: true,
      });

      if (error) {
        errors.push(`배치 ${i + 1}~${i + batch.length}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      total: parsed.length,
      valid: valid.length,
      inserted,
      skipped: invalid.length,
      skipped_rows: invalid.map((p) => `행 ${p._row}: ${p.fullName || "(이름 없음)"}`),
      errors,
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "임포트 오류" }, { status: 500 });
  }
}
