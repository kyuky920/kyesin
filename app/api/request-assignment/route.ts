import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const ASSIGNMENT_REQUEST_MARKER = "ASSIGNMENT_REQUESTED";

export async function POST(req: NextRequest) {
  try {
    const { attendee_id } = await req.json() as { attendee_id: string };
    if (!attendee_id) return NextResponse.json({ error: "attendee_id 필요" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("attendees")
      .update({ arrival_notes: ASSIGNMENT_REQUEST_MARKER })
      .eq("id", attendee_id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "오류" }, { status: 500 });
  }
}
