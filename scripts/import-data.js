// scripts/import-data.js
// 참석자 명단 + 조장 명단을 Supabase에 업로드

require("dotenv").config({ path: ".env.local" });
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CHURCH_MAP = {
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
  "서광": "서광교회",
  "덕평": "덕평교회",
};

function normalizeChurch(raw) {
  const t = String(raw ?? "").trim();
  return CHURCH_MAP[t] ?? t;
}

function parseBirthYear(raw) {
  if (!raw || raw === "0000년") return null;
  if (typeof raw === "number") return raw >= 1940 && raw <= 2015 ? raw : null;
  const m = String(raw).match(/\b(19[4-9]\d|20[0-1]\d)\b/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y >= 1940 && y <= 2015 ? y : null;
}

function parseAttendance(raw) {
  if (!raw) return { day1: true, day2: true, day3: true };
  const s = String(raw);
  return { day1: s.includes("목"), day2: s.includes("금"), day3: s.includes("토") };
}

async function main() {
  // ── 1. 수련회 ID 확인 ──────────────────────────────────────
  const { data: retreat, error: rErr } = await supabase
    .from("retreats").select("id, name").order("start_date", { ascending: false }).limit(1).single();
  if (rErr || !retreat) {
    console.error("수련회 데이터를 찾을 수 없습니다:", rErr?.message);
    process.exit(1);
  }
  const retreatId = retreat.id;
  console.log(`\n✅ 수련회: ${retreat.name} (${retreatId})`);

  // ── 2. 참석자 명단 파싱 ──────────────────────────────────────
  const wb = XLSX.readFile("docs/2026_list.xlsx");
  const ws = wb.Sheets["참석명단"] ?? wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // 헤더 없이 데이터 바로 시작 — church(col1) + name(col2) 있는 행만
  const dataRows = rawRows.filter(r => r[1] && r[2] && String(r[2]).trim().length > 0);

  const parsed = dataRows.map((r, idx) => {
    const churchRaw = String(r[1] ?? "").trim();
    return {
      _row: idx + 1,
      churchRaw,
      churchCanonical: normalizeChurch(churchRaw),
      fullName: String(r[2] ?? "").trim(),
      gender: String(r[3] ?? "").trim() === "남" ? "male" : "female",
      birthYear: parseBirthYear(r[4]),
      shirtSize: String(r[6] ?? "").trim() || null,
      lodgingRequired: String(r[7] ?? "").trim() === "예",
      ...parseAttendance(String(r[8] ?? "")),
      mealNotes: String(r[9] ?? "").trim() || null,
      arrivalNotes: String(r[10] ?? "").trim() || null,
    };
  });

  const invalid = parsed.filter(p => !p.birthYear);
  const valid = parsed.filter(p => p.birthYear);
  console.log(`\n📋 참석자: 전체 ${parsed.length}명, 유효 ${valid.length}명, 생년 없음 ${invalid.length}명`);
  if (invalid.length > 0) {
    invalid.forEach(p => console.log(`  ⚠️  행 ${p._row}: ${p.churchRaw} ${p.fullName}`));
  }

  // ── 3. 교회 upsert ──────────────────────────────────────────
  const churchSet = [...new Set(valid.map(p => p.churchCanonical))];
  const { error: cErr } = await supabase.from("churches").upsert(
    churchSet.map(c => ({ canonical_name: c, display_name: c })),
    { onConflict: "canonical_name" }
  );
  if (cErr) { console.error("교회 upsert 오류:", cErr.message); process.exit(1); }

  const { data: allChurches } = await supabase.from("churches").select("id, canonical_name");
  const churchMap = {};
  (allChurches ?? []).forEach(c => { churchMap[c.canonical_name] = c.id; });

  // 교회 별칭 upsert
  const aliasSet = new Set();
  const aliasRows = [];
  valid.forEach(p => {
    if (!aliasSet.has(p.churchRaw) && churchMap[p.churchCanonical]) {
      aliasSet.add(p.churchRaw);
      aliasRows.push({ church_id: churchMap[p.churchCanonical], alias_name: p.churchRaw });
    }
  });
  if (aliasRows.length > 0) {
    try {
      await supabase.from("church_aliases").upsert(aliasRows, { onConflict: "alias_name" });
    } catch (_) {}
  }
  console.log(`🏛  교회 ${churchSet.length}개 upsert 완료`);

  // ── 4. 참석자 삽입 (기존 중복 제외) ─────────────────────────
  // 기존 참석자 목록 로드 (full_name + birth_year 기준 중복 체크)
  const { data: existingAttendees } = await supabase
    .from("attendees")
    .select("full_name, birth_year")
    .eq("retreat_id", retreatId);
  const existingKeys = new Set(
    (existingAttendees ?? []).map(a => `${a.full_name}__${a.birth_year}`)
  );

  const toInsert = valid.filter(p => !existingKeys.has(`${p.fullName}__${p.birthYear}`));
  const skippedDupe = valid.length - toInsert.length;
  console.log(`  → 이미 DB에 있음: ${skippedDupe}명, 신규 삽입 대상: ${toInsert.length}명`);

  let inserted = 0;
  const errors = [];
  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50).map(p => ({
      retreat_id: retreatId,
      church_id: churchMap[p.churchCanonical] ?? null,
      church_name_raw: p.churchCanonical, // canonical name 저장 (정렬용)
      full_name: p.fullName,
      gender: p.gender,
      birth_year: p.birthYear,
      shirt_size: p.shirtSize,
      lodging_required: p.lodgingRequired,
      attends_day1: p.day1,
      attends_day2: p.day2,
      attends_day3: p.day3,
      meal_notes: p.mealNotes,
      arrival_notes: p.arrivalNotes,
      attendance_status: "confirmed",
      is_staff: false,
      is_leader: false,
    }));
    const { error } = await supabase.from("attendees").insert(batch);
    if (error) errors.push(`배치 ${i + 1}~${i + batch.length}: ${error.message}`);
    else inserted += batch.length;
  }
  if (errors.length > 0) errors.forEach(e => console.error("  ❌", e));
  console.log(`👥 참석자 ${inserted}명 신규 삽입 완료`);

  // ── 5. 조장 명단 파싱 ─────────────────────────────────────────
  const wb2 = XLSX.readFile("docs/cell_leaders.xlsx");
  const ws2 = wb2.Sheets[wb2.SheetNames[0]];
  const leaderRows = XLSX.utils.sheet_to_json(ws2, { header: 1 });

  // 헤더 행 건너뛰기 (교회명, 이름, 나이, 성별, 비고 포함 행)
  const leaderData = leaderRows.filter(r =>
    r[0] && r[1] &&
    !String(r[0]).includes("■") &&
    String(r[0]).trim() !== "교회명"
  );

  console.log(`\n📌 조장 후보: ${leaderData.length}명`);

  // ── 6. 전체 참석자 로드 (이름+교회 매칭) ─────────────────────
  const { data: allAttendees } = await supabase
    .from("attendees")
    .select("id, full_name, churches(canonical_name)")
    .eq("retreat_id", retreatId);

  let leaderUpdated = 0;
  const leaderNotFound = [];
  const leaderAmbiguous = [];
  const idsToMark = [];

  for (const row of leaderData) {
    const churchRaw = normalizeChurch(String(row[0] ?? "").trim());
    const name = String(row[1] ?? "").trim();
    if (!name) continue;

    const byName = (allAttendees ?? []).filter(a => a.full_name === name);
    if (byName.length === 0) {
      leaderNotFound.push(`${name} (${churchRaw})`);
      continue;
    }
    if (byName.length === 1) {
      idsToMark.push(byName[0].id);
      continue;
    }
    // 동명이인 — 교회로 구분
    const byChurch = byName.filter(a => a.churches?.canonical_name === churchRaw);
    if (byChurch.length === 1) {
      idsToMark.push(byChurch[0].id);
    } else {
      leaderAmbiguous.push(`${name} (${churchRaw}) — ${byName.length}명 동명이인`);
    }
  }

  if (idsToMark.length > 0) {
    const { error } = await supabase.from("attendees").update({ is_leader: true }).in("id", idsToMark);
    if (error) console.error("조장 업데이트 오류:", error.message);
    else leaderUpdated = idsToMark.length;
  }

  console.log(`🏆 조장 ${leaderUpdated}명 지정 완료`);
  if (leaderNotFound.length > 0) {
    console.log(`\n⚠️  참석자 명단에 없는 조장 ${leaderNotFound.length}명:`);
    leaderNotFound.forEach(n => console.log(`  - ${n}`));
  }
  if (leaderAmbiguous.length > 0) {
    console.log(`\n⚠️  동명이인 (수동 확인 필요) ${leaderAmbiguous.length}건:`);
    leaderAmbiguous.forEach(n => console.log(`  - ${n}`));
  }

  // ── 7. 최종 집계 ─────────────────────────────────────────────
  const { count: totalCount } = await supabase
    .from("attendees").select("id", { count: "exact", head: true }).eq("retreat_id", retreatId);
  console.log(`\n✨ 완료! DB 총 참석자: ${totalCount}명`);
}

main().catch(e => { console.error("오류:", e); process.exit(1); });
