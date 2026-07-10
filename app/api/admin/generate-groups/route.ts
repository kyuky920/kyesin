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

// 연령대+성별 균형 라운드로빈 분배
function distributeRoundRobin(members: Attendee[], slots: Attendee[][]): void {
  const bands: Record<string, { male: Attendee[]; female: Attendee[] }> = {
    "20_24": { male: [], female: [] },
    "25_28": { male: [], female: [] },
    "29_plus": { male: [], female: [] },
  };
  for (const a of members) {
    const band = a.age_band ?? "29_plus";
    if (!bands[band]) bands[band] = { male: [], female: [] };
    bands[band][a.gender].push(a);
  }
  for (const b of Object.values(bands)) {
    b.male = shuffle(b.male);
    b.female = shuffle(b.female);
  }

  let gi = 0;
  const n = slots.length;
  for (const { male, female } of Object.values(bands)) {
    let mi = 0, fi = 0;
    while (mi < male.length || fi < female.length) {
      const slot = slots[gi % n];
      const slotMales = slot.filter((m) => m.gender === "male").length;
      const slotFemales = slot.filter((m) => m.gender === "female").length;
      if (slotMales <= slotFemales && mi < male.length) slot.push(male[mi++]);
      else if (fi < female.length) slot.push(female[fi++]);
      else slot.push(male[mi++]);
      gi++;
    }
  }
}

const TARGET_SIZE = 5;
const MAX_SIZE = 6;

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

    let numGroups: number;
    let slots: Attendee[][];
    let leaderIds: (string | null)[];

    if (leaders.length > 0) {
      // ── 조장 기반 조편성 ──────────────────────────────
      numGroups = leaders.length;
      // 각 슬롯을 조장으로 초기화 (조장 자신도 조원)
      slots = shuffle(leaders).map((leader) => [leader]);
      leaderIds = slots.map((slot) => slot[0].id);
      distributeRoundRobin(members, slots);
    } else {
      // ── 조장 없을 때: 인원 기반 자동 계산 ──────────────
      numGroups = Math.max(
        Math.round(members.length / TARGET_SIZE),
        Math.ceil(members.length / MAX_SIZE),
        1,
      );
      slots = Array.from({ length: numGroups }, () => []);
      leaderIds = Array(numGroups).fill(null);
      distributeRoundRobin(members, slots);
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

    // 조 생성
    const groupInserts = slots.map((_, i) => ({
      retreat_id: retreatId,
      group_code: i + 1,
      group_name: `${i + 1}조`,
      leader_attendee_id: leaderIds[i] ?? null,
    }));

    const { data: createdGroups, error: gErr } = await supabase
      .from("retreat_groups").insert(groupInserts).select("id, group_code");
    if (gErr || !createdGroups) throw new Error("조 생성 실패: " + gErr?.message);

    // 배정 저장 — 모든 슬롯 멤버(조장 포함)
    const assignments: { group_id: string; attendee_id: string }[] = [];
    for (const g of createdGroups as { id: string; group_code: number }[]) {
      const slotIdx = g.group_code - 1;
      for (const m of slots[slotIdx]) {
        assignments.push({ group_id: g.id, attendee_id: m.id });
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
