import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
