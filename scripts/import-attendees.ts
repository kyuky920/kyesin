#!/usr/bin/env npx tsx
/**
 * 2026 계신 청년 하계수련회 참석자 명단 임포트 스크립트
 *
 * 사용법:
 *   npm run import                              # 기본 경로 (data/participants.xlsx)
 *   npm run import -- path/to/file.xlsx         # 파일 직접 지정
 *   npm run import -- path/to/file.xlsx --dry-run  # 미리보기 (DB 저장 없음)
 *
 * 엑셀 컬럼 구조 (1행=타이틀, 2행~=데이터):
 *   col[0] 번호 | col[1] 교회 | col[2] 이름 | col[3] 성별
 *   col[4] 생년 | col[5] 나이 | col[6] 티셔츠 | col[7] 숙박여부
 *   col[8] 참석일자 | col[9] 식사정보 | col[10] 비고
 */

import * as xlsx from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// .env.local 로드
config({ path: path.join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌  .env.local 에 SUPABASE_URL / SUPABASE_SERVICE_KEY 가 없습니다.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─────────────────────────────────────────────────────────
// 교회명 정규화 (raw → canonical)
// ─────────────────────────────────────────────────────────
const CHURCH_NORMALIZE: Record<string, string> = {
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

function normalizeChurch(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = String(raw).trim();
  return CHURCH_NORMALIZE[t] ?? t;
}

// ─────────────────────────────────────────────────────────
// 파싱 헬퍼
// ─────────────────────────────────────────────────────────
function parseBirthYear(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === null || raw === 0 || raw === "0") return null;
  if (typeof raw === "number") return raw >= 1955 && raw <= 2015 ? raw : null;
  const match = String(raw).match(/\b(19[5-9]\d|20[0-1]\d)\b/);
  if (!match) return null;
  const y = parseInt(match[1], 10);
  return y >= 1955 && y <= 2015 ? y : null;
}

function parseGender(raw: string | undefined): "male" | "female" | null {
  if (!raw) return null;
  return String(raw).trim() === "남" ? "male" : "female";
}

function calcAge(birthYear: number): number {
  return 2026 - birthYear;
}

function calcAgeBand(birthYear: number): string {
  const age = calcAge(birthYear);
  if (age <= 24) return "20_24";
  if (age <= 28) return "25_28";
  return "29_plus";
}

function parseAttendanceDays(raw: string | undefined): { day1: boolean; day2: boolean; day3: boolean } {
  if (!raw) return { day1: true, day2: true, day3: true };
  return {
    day1: raw.includes("목"),
    day2: raw.includes("금"),
    day3: raw.includes("토"),
  };
}

// ─────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const filePath =
    args.find((a) => !a.startsWith("--")) ??
    path.join(__dirname, "../data/participants.xlsx");

  if (!fs.existsSync(filePath)) {
    console.error(`❌  파일을 찾을 수 없습니다: ${filePath}`);
    console.error("    사용법: npm run import -- [엑셀 파일 경로] [--dry-run]");
    process.exit(1);
  }

  console.log("─".repeat(58));
  console.log("📂  파일:", path.resolve(filePath));
  console.log(isDryRun ? "🔍  [DRY-RUN — DB 저장 없음]" : "💾  [실제 저장 모드]");
  console.log("─".repeat(58));

  // ── 엑셀 읽기 ─────────────────────────────────────────
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames.includes("참석명단") ? "참석명단" : wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1 }) as (string | number | undefined)[][];
  // 인덱스 0: 타이틀 행, 1~: 실제 데이터
  const dataRows = rawRows.slice(1).filter((r) => r[1] && r[2]);

  // ── 파싱 ───────────────────────────────────────────────
  const parsed = dataRows.map((r, idx) => {
    const churchRaw = String(r[1] ?? "").trim();
    const churchCanonical = normalizeChurch(churchRaw);
    const fullName = String(r[2] ?? "").trim();
    const gender = parseGender(r[3] as string);
    const birthYear = parseBirthYear(r[4] as string | number);
    const attendanceRaw = String(r[8] ?? "").trim();
    const { day1, day2, day3 } = parseAttendanceDays(attendanceRaw);

    return {
      _row: idx + 2,
      registrationNo: (r[0] as number) || idx + 1,
      churchRaw,
      churchCanonical,
      fullName,
      gender,
      birthYear,
      age: birthYear ? calcAge(birthYear) : null,
      ageBand: birthYear ? calcAgeBand(birthYear) : null,
      shirtSize: String(r[6] ?? "").trim() || null,
      lodgingRequired: String(r[7] ?? "").trim() === "예",
      attendsDay1: day1,
      attendsDay2: day2,
      attendsDay3: day3,
      mealNotes: String(r[9] ?? "").trim() || null,
      arrivalNotes: String(r[10] ?? "").trim() || null,
    };
  });

  // ── 유효성 검사 ────────────────────────────────────────
  const invalid = parsed.filter((p) => !p.churchCanonical || !p.fullName || !p.gender || !p.birthYear);
  const valid = parsed.filter((p) => p.churchCanonical && p.fullName && p.gender && p.birthYear);

  console.log(`\n📊  총 데이터: ${parsed.length}행`);
  console.log(`✅  유효:      ${valid.length}명`);
  if (invalid.length > 0) {
    console.log(`⚠️   스킵:      ${invalid.length}명`);
    invalid.forEach((p) =>
      console.log(`    행${p._row}: 이름="${p.fullName}" 교회="${p.churchRaw}" 생년=${JSON.stringify(p.birthYear)}`)
    );
  }

  // ── 요약 출력 ─────────────────────────────────────────
  const churchSet = new Set(valid.map((p) => p.churchCanonical as string));
  const bandCounts: Record<string, number> = {};
  valid.forEach((p) => {
    if (p.ageBand) bandCounts[p.ageBand] = (bandCounts[p.ageBand] ?? 0) + 1;
  });

  console.log(`\n⛪  교회 (${churchSet.size}개): ${[...churchSet].sort().join(", ")}`);
  console.log(`👕  남: ${valid.filter((p) => p.gender === "male").length}명  여: ${valid.filter((p) => p.gender === "female").length}명`);
  console.log(`🏨  숙박: ${valid.filter((p) => p.lodgingRequired).length}명  비숙박: ${valid.filter((p) => !p.lodgingRequired).length}명`);
  console.log(`📅  3일: ${valid.filter((p) => p.attendsDay1 && p.attendsDay2 && p.attendsDay3).length}명  부분: ${valid.filter((p) => !(p.attendsDay1 && p.attendsDay2 && p.attendsDay3)).length}명`);
  console.log(`🎂  연령대: 20-24세 ${bandCounts["20_24"] ?? 0}명 / 25-28세 ${bandCounts["25_28"] ?? 0}명 / 29세↑ ${bandCounts["29_plus"] ?? 0}명`);

  if (isDryRun) {
    console.log("\n─".repeat(58));
    console.log("DRY-RUN 완료. --dry-run 제거 후 재실행하면 DB에 저장됩니다.");
    return;
  }

  // ── Supabase 저장 ─────────────────────────────────────
  console.log("\n─".repeat(58));
  console.log("DB 저장 시작...");

  // 1) 수련회 ID 조회
  const { data: retreat, error: rErr } = await supabase
    .from("retreats")
    .select("id, name")
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (rErr || !retreat) {
    console.error("❌  수련회 없음. Supabase에 retreats 데이터를 먼저 넣어 주세요.");
    process.exit(1);
  }
  console.log(`🏕️   수련회: ${retreat.name}`);

  // 2) 교회 upsert (canonical_name, display_name 컬럼)
  const uniqueChurches = [...churchSet].sort();
  await supabase
    .from("churches")
    .upsert(
      uniqueChurches.map((canonical_name) => ({ canonical_name, display_name: canonical_name })),
      { onConflict: "canonical_name" }
    );

  const { data: allChurches } = await supabase
    .from("churches")
    .select("id, canonical_name");
  const churchMap: Record<string, string> = {};
  (allChurches ?? []).forEach((c) => { churchMap[c.canonical_name] = c.id; });
  console.log(`⛪  교회 처리: ${Object.keys(churchMap).length}개`);

  // 3) 교회 별칭 upsert (alias_name 컬럼)
  const aliasRows: { church_id: string; alias_name: string }[] = [];
  const seenAliases = new Set<string>();
  parsed.forEach((p) => {
    if (!p.churchCanonical || !churchMap[p.churchCanonical]) return;
    if (!seenAliases.has(p.churchRaw)) {
      seenAliases.add(p.churchRaw);
      aliasRows.push({ church_id: churchMap[p.churchCanonical], alias_name: p.churchRaw });
    }
  });
  if (aliasRows.length > 0) {
    await supabase.from("church_aliases").upsert(aliasRows, { onConflict: "alias_name" });
    console.log(`🔗  교회 별칭: ${aliasRows.length}개`);
  }

  // 4) 기존 참석자 삭제 (조편성 포함)
  console.log("🗑️   기존 데이터 정리 중...");
  const { data: existingGroups } = await supabase
    .from("retreat_groups")
    .select("id")
    .eq("retreat_id", retreat.id);
  if (existingGroups && existingGroups.length > 0) {
    const groupIds = existingGroups.map((g) => g.id);
    await supabase.from("group_assignments").delete().in("group_id", groupIds);
    await supabase.from("retreat_groups").delete().eq("retreat_id", retreat.id);
  }
  await supabase.from("attendees").delete().eq("retreat_id", retreat.id);

  // 5) 참석자 insert
  console.log(`👥  참석자 삽입 (${valid.length}명)...`);

  const importBatchId = crypto.randomUUID();

  const attendees = valid.map((p) => ({
    retreat_id: retreat.id,
    registration_no: p.registrationNo,
    church_id: p.churchCanonical ? (churchMap[p.churchCanonical] ?? null) : null,
    church_name_raw: p.churchRaw,
    full_name: p.fullName,
    gender: p.gender as "male" | "female",
    birth_year: p.birthYear as number,
    // age, age_band 는 DB generated column — 직접 삽입 안 함
    shirt_size: p.shirtSize,
    lodging_required: p.lodgingRequired,
    attends_day1: p.attendsDay1,
    attends_day2: p.attendsDay2,
    attends_day3: p.attendsDay3,
    meal_notes: p.mealNotes,
    arrival_notes: p.arrivalNotes,
    attendance_status: "confirmed",
    identity_church_input: p.churchRaw,
    identity_name_input: p.fullName,
    identity_birth_year_input: p.birthYear as number,
  }));

  let inserted = 0;
  for (let i = 0; i < attendees.length; i += 50) {
    const batch = attendees.slice(i, i + 50);
    const { error } = await supabase.from("attendees").insert(batch);
    if (error) {
      console.error(`\n   ❌  배치 ${i + 1}~${i + batch.length} 오류: ${error.message}`);
    } else {
      inserted += batch.length;
      process.stdout.write(`\r   ${inserted}/${attendees.length}명...`);
    }
  }

  console.log(`\n\n✅  완료! ${inserted}명 저장됨 (batch: ${importBatchId.slice(0, 8)}...)`);
  console.log("─".repeat(58));
}

main().catch((err) => {
  console.error("❌ 오류:", err.message);
  process.exit(1);
});
