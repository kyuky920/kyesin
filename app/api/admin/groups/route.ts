import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RawAssignment = {
  id: string;
  attendees: {
    id: string;
    full_name: string;
    gender: "male" | "female";
    birth_year: number;
    is_leader: boolean;
    attends_day1: boolean;
    attends_day2: boolean;
    attends_day3: boolean;
    churches: { canonical_name: string } | null;
  } | null;
};

type RawGroup = {
  id: string;
  group_code: string;
  group_name: string;
  leader_attendee_id: string | null;
  group_assignments: RawAssignment[];
};

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: retreat } = await supabase
      .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
    if (!retreat) return NextResponse.json({ groups: [], retreat_id: null });
    const retreatId = (retreat as { id: string }).id;

    const { data, error } = await supabase
      .from("retreat_groups")
      .select(`
        id, group_code, group_name, leader_attendee_id,
        group_assignments(
          id,
          attendees(id, full_name, gender, birth_year, is_leader, attends_day1, attends_day2, attends_day3, churches(canonical_name))
        )
      `)
      .eq("retreat_id", retreatId)
      .order("group_code");

    if (error) throw error;

    const sorted = ((data ?? []) as unknown as RawGroup[])
      .slice()
      .sort((a, b) => parseInt(a.group_code) - parseInt(b.group_code));

    return NextResponse.json({ groups: sorted, retreat_id: retreatId });
  } catch (err) {
    console.error("GET groups error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "조 조회 오류" },
      { status: 500 }
    );
  }
}
