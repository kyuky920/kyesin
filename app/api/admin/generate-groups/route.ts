import { NextResponse } from "next/server";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

interface Attendee {
  id: string;
  full_name: string;
  gender: "male" | "female";
  birth_year: number;
  age_band: string;
  church_id: string | null;
  churches: { canonical_name: string } | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// birth_year → 연령대 (DB의 age_band 컬럼이 NULL이므로 직접 계산)
function computeBand(birthYear: number): string {
  if (!birthYear || birthYear <= 1900) return "29_plus";
  const age = 2026 - birthYear;
  if (age <= 24) return "20_24";
  if (age <= 28) return "25_28";
  return "29_plus";
}

// 인원 균등 + 동일 연령대 집중 배정
// 1) 선배정(조장·초월제일) 인원을 반영한 목표치 계산 → 균등 분배 보장
// 2) 20_24 → 25_28 → 29_plus 순 풀 + 순차 채우기 → 동일 연령대 집중
function distributeBalanced(members: Attendee[], slots: Attendee[][]): void {
  const n = slots.length;
  const total = members.length + slots.reduce((s, sl) => s + sl.length, 0);
  const base = Math.floor(total / n);
  const extra = total % n;

  // 현재 인원 적은 슬롯부터 +1 target 부여 (초월제일 선배정 슬롯은 이미 크므로 base만)
  const bySize = slots.map((sl, i) => ({ i, len: sl.length }))
    .sort((a, b) => a.len - b.len);
  const targets = new Array<number>(n).fill(base);
  for (let k = 0; k < extra; k++) targets[bySize[k].i]++;

  // 연령대별 분류 + 내부 남녀 교차 셔플
  const bandOrder = ["20_24", "25_28", "29_plus"];
  const byBand: Record<string, { male: Attendee[]; female: Attendee[] }> = {
    "20_24":   { male: [], female: [] },
    "25_28":   { male: [], female: [] },
    "29_plus": { male: [], female: [] },
  };
  for (const m of members) {
    const b = computeBand(m.birth_year);
    byBand[b][m.gender].push(m);
  }

  const bandQueues: Attendee[][] = bandOrder.map((b) => {
    const males   = shuffle(byBand[b].male);
    const females = shuffle(byBand[b].female);
    const q: Attendee[] = [];
    const max = Math.max(males.length, females.length);
    for (let i = 0; i < max; i++) {
      if (i < males.length)   q.push(males[i]);
      if (i < females.length) q.push(females[i]);
    }
    return q;
  });

  // 동일 연령대 집중: 20_24 전체 → 25_28 전체 → 29_plus 전체 순으로 배정
  const pool: Attendee[] = [...bandQueues[0], ...bandQueues[1], ...bandQueues[2]];

  // 순차 채우기: 앞 슬롯을 목표치까지 채운 뒤 다음 슬롯으로 이동
  let si = 0;
  for (const member of pool) {
    while (si < n - 1 && slots[si].length >= targets[si]) si++;
    slots[si].push(member);
  }
}

const TARGET_SIZE = 5;
const MAX_SIZE = 6;

const FLOWER_NAMES = [
  "장미", "튤립", "라일락", "해바라기", "벚꽃",
  "수선화", "코스모스", "진달래", "개나리", "목련",
  "국화", "백합", "동백", "매화", "난초",
  "수국", "안개꽃", "무궁화", "채송화", "나팔꽃",
  "민들레", "봉선화", "카네이션", "클로버", "히아신스",
];

export async function POST() {
  try {
    const supabase = createClient();

    const { data: retreat } = await supabase
      .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
    if (!retreat) return NextResponse.json({ error: "수련회 데이터가 없습니다." }, { status: 400 });
    const retreatId = (retreat as { id: string }).id;

    // 사전 검증 — 컬럼 없으면 데이터 지우기 전에 미리 실패
    const { error: preCheck } = await supabase
      .from("attendees").select("id, is_staff, is_leader").limit(1);
    if (preCheck) {
      return NextResponse.json(
        { error: "DB 마이그레이션이 필요합니다: is_staff / is_leader 컬럼을 추가해 주세요." },
        { status: 400 }
      );
    }

    // 기존 배정 초기화
    const { data: existingGroups } = await supabase
      .from("retreat_groups").select("id").eq("retreat_id", retreatId);
    if (existingGroups && existingGroups.length > 0) {
      await supabase.from("group_assignments").delete()
        .in("group_id", existingGroups.map((g: { id: string }) => g.id));
    }
    await supabase.from("retreat_groups").delete().eq("retreat_id", retreatId);

    // 조장 로드
    const { data: leaderData } = await supabase
      .from("attendees")
      .select("id, full_name, gender, birth_year, age_band, church_id, churches(canonical_name)")
      .eq("retreat_id", retreatId)
      .eq("is_staff", false)
      .eq("is_leader", true);
    const leaders = (leaderData ?? []) as unknown as Attendee[];

    // 일반 참석자 로드 (교역자·조장 제외)
    const { data: memberData, error: mErr } = await supabase
      .from("attendees")
      .select("id, full_name, gender, birth_year, age_band, church_id, churches(canonical_name)")
      .eq("retreat_id", retreatId)
      .eq("is_staff", false)
      .eq("is_leader", false);
    if (mErr) throw new Error("참석자 데이터를 불러올 수 없습니다.");
    const members = (memberData ?? []) as unknown as Attendee[];

    // 초월제일교회 멤버는 반드시 같은 조에 편성
    const FIXED_CHURCH = "초월제일교회";
    const fixedMembers = members.filter(
      (m) => m.churches?.canonical_name === FIXED_CHURCH
    );
    const regularMembers = members.filter(
      (m) => m.churches?.canonical_name !== FIXED_CHURCH
    );

    let numGroups: number;
    let slots: Attendee[][];
    let leaderIds: (string | null)[];

    if (leaders.length > 0) {
      // ── 조장 기반 조편성 ──────────────────────────────
      numGroups = leaders.length;
      slots = shuffle(leaders).map((leader) => [leader]);
      leaderIds = slots.map((slot) => slot[0].id);

      // 초월제일교회 조장이 있는 슬롯 우선, 없으면 첫 슬롯에 고정 배치
      const fixedLeaderIdx = slots.findIndex(
        (slot) => slot[0]?.churches?.canonical_name === FIXED_CHURCH
      );
      const fixedSlotIdx = fixedLeaderIdx >= 0 ? fixedLeaderIdx : 0;
      for (const m of fixedMembers) slots[fixedSlotIdx].push(m);

      distributeBalanced(regularMembers, slots);
    } else {
      // ── 조장 없을 때: 인원 기반 자동 계산 ──────────────
      numGroups = Math.max(
        Math.round(members.length / TARGET_SIZE),
        Math.ceil(members.length / MAX_SIZE),
        1,
      );
      slots = Array.from({ length: numGroups }, () => []);
      leaderIds = Array(numGroups).fill(null);

      // 초월제일교회 멤버를 첫 슬롯에 고정
      for (const m of fixedMembers) slots[0].push(m);

      distributeBalanced(regularMembers, slots);
    }

    // 경고 수집
    const warnings: string[] = [];
    for (const slot of slots) {
      const churchCounts: Record<string, number> = {};
      for (const m of slot) {
        const cn = m.churches?.canonical_name ?? "미상";
        churchCounts[cn] = (churchCounts[cn] ?? 0) + 1;
      }
      for (const [church, cnt] of Object.entries(churchCounts)) {
        if (cnt > 2) warnings.push(`${church} ${cnt}명이 같은 조에 배정됨`);
      }
      if (slot.length < 2) warnings.push(`${slots.indexOf(slot) + 1}번 조 인원 부족 (${slot.length}명)`);
    }

    // 조 생성 (group_code는 text 타입, age_band는 NOT NULL이라 기본값 설정)
    const groupInserts = slots.map((_, i) => ({
      retreat_id: retreatId,
      group_code: String(i + 1),
      group_name: `${FLOWER_NAMES[i % FLOWER_NAMES.length]}조`,
      leader_attendee_id: leaderIds[i] ?? null,
      age_band: "mixed",
    }));

    const { data: createdGroups, error: gErr } = await supabase
      .from("retreat_groups").insert(groupInserts).select("id, group_code");
    if (gErr || !createdGroups) throw new Error("조 생성 실패: " + gErr?.message);

    // 배정 저장 — 모든 슬롯 멤버(조장 포함)
    const assignments: { group_id: string; attendee_id: string; retreat_id: string }[] = [];
    for (const g of createdGroups as { id: string; group_code: string }[]) {
      const slotIdx = parseInt(g.group_code) - 1;
      for (const m of slots[slotIdx]) {
        assignments.push({ group_id: g.id, attendee_id: m.id, retreat_id: retreatId });
      }
    }

    if (assignments.length > 0) {
      const { error: aErr } = await supabase.from("group_assignments").insert(assignments);
      if (aErr) throw new Error("배정 저장 실패: " + aErr.message);
    }

    try {
      await supabase.from("group_generation_runs").insert({
        retreat_id: retreatId,
        target_group_size: TARGET_SIZE,
        total_groups: createdGroups.length,
        total_assigned: assignments.length,
        settings: { leader_based: leaders.length > 0, leader_count: leaders.length },
      });
    } catch { /* 이력 저장 실패 무시 */ }

    return NextResponse.json({
      groups_created: createdGroups.length,
      total_assigned: assignments.length,
      leader_count: leaders.length,
      warnings,
    });
  } catch (err) {
    console.error("Generate groups error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "자동 조편성 오류" },
      { status: 500 }
    );
  }
}
