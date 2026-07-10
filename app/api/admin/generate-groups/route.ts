import { NextResponse } from "next/server";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

interface Attendee {
  id: string;
  full_name: string;
  gender: "male" | "female";
  birth_year: number;
  age_band: string;
  church_id: string | null;
  attends_day1: boolean;
  attends_day2: boolean;
  attends_day3: boolean;
  churches: { canonical_name: string } | null;
}

const TARGET_SIZE = 5;
const MAX_SIZE = 6;
const CHOWOL = "초월제일교회";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST() {
  try {
    const supabase = await createClient();

    // 1. 수련회 ID
    const { data: retreat } = await supabase
      .from("retreats")
      .select("id")
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (!retreat) return NextResponse.json({ error: "수련회 데이터가 없습니다." }, { status: 400 });
    const retreatId = (retreat as { id: string }).id;

    // 2. 기존 배정 초기화
    const { data: existingGroups } = await supabase
      .from("retreat_groups").select("id").eq("retreat_id", retreatId);
    if (existingGroups && existingGroups.length > 0) {
      await supabase.from("group_assignments").delete()
        .in("group_id", existingGroups.map((g: { id: string }) => g.id));
    }
    await supabase.from("retreat_groups").delete().eq("retreat_id", retreatId);

    // 3. 참석자 로드
    const { data, error } = await supabase
      .from("attendees")
      .select("id, full_name, gender, birth_year, age_band, church_id, attends_day1, attends_day2, attends_day3, churches(canonical_name)")
      .eq("retreat_id", retreatId);

    if (error || !data) throw new Error("참석자 데이터를 불러올 수 없습니다.");
    const attendees = data as unknown as Attendee[];

    // 4. 초월제일교회 분리
    const chowol = attendees.filter((a) => a.churches?.canonical_name === CHOWOL);
    const regular = attendees.filter((a) => a.churches?.canonical_name !== CHOWOL);

    // 5. 연령대 + 성별로 분류
    const bands: Record<string, { male: Attendee[]; female: Attendee[] }> = {
      "20_24": { male: [], female: [] },
      "25_28": { male: [], female: [] },
      "29_plus": { male: [], female: [] },
    };
    for (const a of regular) {
      const band = a.age_band ?? "29_plus";
      if (!bands[band]) bands[band] = { male: [], female: [] };
      bands[band][a.gender].push(a);
    }
    for (const b of Object.values(bands)) {
      b.male = shuffle(b.male);
      b.female = shuffle(b.female);
    }

    // 6. 그룹 수 계산
    const numGroups = Math.max(
      Math.round(regular.length / TARGET_SIZE),
      Math.ceil(regular.length / MAX_SIZE)
    );
    const slots: Attendee[][] = Array.from({ length: numGroups }, () => []);

    // 7. 라운드로빈 방식으로 배분 (연령대별, 성별 균형)
    let gi = 0;
    for (const { male, female } of Object.values(bands)) {
      let mi = 0, fi = 0;
      while (mi < male.length || fi < female.length) {
        const slot = slots[gi % numGroups];
        const slotMales = slot.filter((m) => m.gender === "male").length;
        const slotFemales = slot.filter((m) => m.gender === "female").length;

        if (slotMales <= slotFemales && mi < male.length) {
          slot.push(male[mi++]);
        } else if (fi < female.length) {
          slot.push(female[fi++]);
        } else {
          slot.push(male[mi++]);
        }
        gi++;
      }
    }

    // 8. 경고 수집
    const warnings: string[] = [];
    for (const slot of slots) {
      const churchCounts: Record<string, number> = {};
      for (const m of slot) {
        const cn = m.churches?.canonical_name ?? "미상";
        churchCounts[cn] = (churchCounts[cn] ?? 0) + 1;
      }
      for (const [church, cnt] of Object.entries(churchCounts)) {
        if (cnt > 2) warnings.push(`${church} 교회 ${cnt}명이 같은 조에 배정됨`);
      }
      if (slot.length < 3) warnings.push(`${slots.indexOf(slot) + 1}번 슬롯 인원 부족 (${slot.length}명)`);
    }

    // 9. 조 생성
    const groupInserts = slots.map((_, i) => ({
      retreat_id: retreatId,
      group_code: i + 1,
      group_name: `${i + 1}조`,
    }));
    if (chowol.length > 0) {
      groupInserts.push({
        retreat_id: retreatId,
        group_code: slots.length + 1,
        group_name: "초월제일조",
      });
    }

    const { data: createdGroups, error: gErr } = await supabase
      .from("retreat_groups").insert(groupInserts).select("id, group_code");
    if (gErr || !createdGroups) throw new Error("조 생성 실패");

    // 10. 배정 저장
    const assignments: { group_id: string; attendee_id: string }[] = [];
    for (const g of createdGroups as { id: string; group_code: number }[]) {
      if (g.group_code <= slots.length) {
        for (const m of slots[g.group_code - 1]) {
          assignments.push({ group_id: g.id, attendee_id: m.id });
        }
      } else if (chowol.length > 0) {
        for (const m of chowol) {
          assignments.push({ group_id: g.id, attendee_id: m.id });
        }
      }
    }

    if (assignments.length > 0) {
      const { error: aErr } = await supabase.from("group_assignments").insert(assignments);
      if (aErr) throw new Error("배정 저장 실패: " + aErr.message);
    }

    // 11. 실행 이력
    try {
      await supabase.from("group_generation_runs").insert({
        retreat_id: retreatId,
        target_group_size: TARGET_SIZE,
        total_groups: createdGroups.length,
        total_assigned: assignments.length,
        settings: { chowol_fixed: chowol.length > 0 },
      });
    } catch { /* 이력 저장 실패는 무시 */ }

    return NextResponse.json({
      groups_created: createdGroups.length,
      total_assigned: assignments.length,
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
