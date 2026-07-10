// scripts/insert-missing.js
// 생년 미상 3명 (1900년생으로) + 조장 명단에만 있는 2명 삽입

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CHURCH_MAP = {
  "가락동부": "가락동부교회",
  "상대원": "상대원교회",
  "명륜": "명륜교회",
};
const norm = (r) => CHURCH_MAP[r] ?? r;

async function main() {
  const { data: retreat } = await supabase
    .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
  const retreatId = retreat.id;

  const { data: allChurches } = await supabase.from("churches").select("id, canonical_name");
  const churchMap = {};
  (allChurches ?? []).forEach(c => { churchMap[c.canonical_name] = c.id; });

  // ── 삽입 대상 ──────────────────────────────────────────────
  const toInsert = [
    // 생년 미상 3명 → 1900년생
    {
      church: "가락동부교회", churchRaw: "가락동부",
      full_name: "김정자", gender: "female", birth_year: 1900,
      shirt_size: "L", lodging_required: true,
      attends_day1: true, attends_day2: true, attends_day3: true,
      arrival_notes: "7월 30일 (목) 오후 3시부터 참여 예정",
      is_staff: false, is_leader: false,
    },
    {
      church: "가락동부교회", churchRaw: "가락동부",
      full_name: "정호진", gender: "male", birth_year: 1900,
      shirt_size: "XL", lodging_required: false,
      attends_day1: true, attends_day2: false, attends_day3: false,
      arrival_notes: "7월 30일 (목) 오후 3시부터 참여 예정",
      is_staff: false, is_leader: false,
    },
    {
      church: "상대원교회", churchRaw: "상대원",
      full_name: "주은경", gender: "female", birth_year: 1900,
      shirt_size: "S", lodging_required: true,
      attends_day1: true, attends_day2: true, attends_day3: true,
      arrival_notes: "7월 31일 (금) 오후부터 참여 예정(12시~), 8월 1일 (토) 오전부터 참여 예정",
      is_staff: false, is_leader: false,
    },
    // 조장 명단에만 있는 2명 (나이 기준 생년 계산, 없으면 2000)
    {
      church: "명륜교회", churchRaw: "명륜교회",
      full_name: "한주영", gender: "male", birth_year: 2004, // 나이 22세
      shirt_size: "L", lodging_required: true,
      attends_day1: true, attends_day2: true, attends_day3: true,
      is_staff: false, is_leader: true,
    },
    {
      church: "가락동부교회", churchRaw: "가락동부교회",
      full_name: "박상숭", gender: "male", birth_year: 2000, // 나이 미상 → 기본값
      shirt_size: "L", lodging_required: true,
      attends_day1: true, attends_day2: true, attends_day3: true,
      is_staff: false, is_leader: true,
    },
  ];

  let ok = 0;
  for (const p of toInsert) {
    // 이미 존재하면 스킵
    const { data: exist } = await supabase.from("attendees")
      .select("id").eq("retreat_id", retreatId).eq("full_name", p.full_name).eq("birth_year", p.birth_year).maybeSingle();
    if (exist) {
      console.log(`⏭  이미 존재: ${p.full_name} (${p.birth_year})`);
      continue;
    }
    const { error } = await supabase.from("attendees").insert({
      retreat_id: retreatId,
      church_id: churchMap[p.church] ?? null,
      church_name_raw: p.churchRaw,
      full_name: p.full_name,
      gender: p.gender,
      birth_year: p.birth_year,
      shirt_size: p.shirt_size,
      lodging_required: p.lodging_required,
      attends_day1: p.attends_day1,
      attends_day2: p.attends_day2,
      attends_day3: p.attends_day3,
      arrival_notes: p.arrival_notes ?? null,
      attendance_status: "confirmed",
      is_staff: p.is_staff,
      is_leader: p.is_leader,
    });
    if (error) console.error(`❌ ${p.full_name}: ${error.message}`);
    else { console.log(`✅ 삽입: ${p.full_name} (${p.church}, ${p.birth_year}년생${p.is_leader ? ", 조장" : ""})`); ok++; }
  }

  const { count } = await supabase
    .from("attendees").select("id", { count: "exact", head: true }).eq("retreat_id", retreatId);
  console.log(`\n완료: ${ok}명 삽입, DB 총 참석자 ${count}명`);
}

main().catch(e => { console.error(e); process.exit(1); });
