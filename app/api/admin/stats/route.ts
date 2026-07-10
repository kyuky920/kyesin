import { NextResponse } from "next/server";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();

    const [attendeesRes, groupsRes, assignmentsRes] = await Promise.all([
      supabase.from("attendees").select("id, gender, birth_year, attendance_type, is_overnight"),
      supabase.from("retreat_groups").select("id, group_code, group_name"),
      supabase.from("group_assignments").select("attendee_id, group_id"),
    ]);

    const attendees = attendeesRes.data || [];
    const groups = groupsRes.data || [];
    const assignments = assignmentsRes.data || [];

    const assignedIds = new Set(assignments.map((a: { attendee_id: string }) => a.attendee_id));

    const currentYear = 2026;
    const stats = {
      total: attendees.length,
      assigned: assignedIds.size,
      unassigned: attendees.length - assignedIds.size,
      groups_count: groups.length,
      male: attendees.filter((a: { gender: string }) => a.gender === "M").length,
      female: attendees.filter((a: { gender: string }) => a.gender === "F").length,
      overnight: attendees.filter((a: { is_overnight: boolean }) => a.is_overnight).length,
      age_20_24: attendees.filter((a: { birth_year: number }) => {
        const age = currentYear - a.birth_year;
        return age >= 20 && age <= 24;
      }).length,
      age_25_28: attendees.filter((a: { birth_year: number }) => {
        const age = currentYear - a.birth_year;
        return age >= 25 && age <= 28;
      }).length,
      age_29_plus: attendees.filter((a: { birth_year: number }) => {
        const age = currentYear - a.birth_year;
        return age >= 29;
      }).length,
      attendance_full: attendees.filter((a: { attendance_type: string }) => a.attendance_type === "full").length,
      attendance_fri_sat: attendees.filter((a: { attendance_type: string }) => a.attendance_type === "fri_sat").length,
      attendance_thu_fri: attendees.filter((a: { attendance_type: string }) => a.attendance_type === "thu_fri").length,
      // Per-group stats
      groups: groups.map((g: { id: string; group_code: number; group_name: string }) => {
        const groupAssignments = assignments.filter((a: { group_id: string }) => a.group_id === g.id);
        return {
          id: g.id,
          group_code: g.group_code,
          group_name: g.group_name,
          member_count: groupAssignments.length,
        };
      }),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "통계 데이터를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
