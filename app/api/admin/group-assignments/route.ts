import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/group-assignments  { attendee_id, group_id }
export async function POST(req: NextRequest) {
  try {
    const { attendee_id, group_id } = await req.json() as { attendee_id: string; group_id: string };
    if (!attendee_id || !group_id) return NextResponse.json({ error: "attendee_id, group_id 필요" }, { status: 400 });

    const supabase = createAdminClient();
    const { data: retreat } = await supabase
      .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
    if (!retreat) return NextResponse.json({ error: "수련회 없음" }, { status: 400 });
    const retreatId = (retreat as { id: string }).id;

    const { data, error } = await supabase
      .from("group_assignments")
      .insert({ group_id, attendee_id, retreat_id: retreatId })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, id: (data as { id: string }).id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "추가 오류" }, { status: 500 });
  }
}

// PATCH /api/admin/group-assignments?id=xxx  { group_id: newGroupId }
export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    const { group_id } = await req.json() as { group_id: string };
    if (!group_id) return NextResponse.json({ error: "group_id 필요" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from("group_assignments").update({ group_id }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "이동 오류" }, { status: 500 });
  }
}

// DELETE /api/admin/group-assignments?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from("group_assignments").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "제거 오류" }, { status: 500 });
  }
}
