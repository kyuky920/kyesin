import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { attendee_id } = await req.json() as { attendee_id: string };
    if (!attendee_id) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = createAdminClient();

    // only set if not yet recorded
    const { data: existing } = await supabase
      .from("attendees")
      .select("first_viewed_at")
      .eq("id", attendee_id)
      .single();

    if (existing && !existing.first_viewed_at) {
      await supabase
        .from("attendees")
        .update({ first_viewed_at: new Date().toISOString() })
        .eq("id", attendee_id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
