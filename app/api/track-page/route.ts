import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { attendee_id, page_path } = await req.json() as {
      attendee_id?: string;
      page_path: string;
    };
    if (!page_path) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = createAdminClient();

    await supabase.from("page_views").insert({
      attendee_id: attendee_id ?? null,
      page_path,
    });

    // /me 페이지 최초 접속 시 first_viewed_at 기록
    if (attendee_id && page_path.startsWith("/me")) {
      const { data } = await supabase
        .from("attendees")
        .select("first_viewed_at")
        .eq("id", attendee_id)
        .single();
      if (data && !data.first_viewed_at) {
        await supabase
          .from("attendees")
          .update({ first_viewed_at: new Date().toISOString() })
          .eq("id", attendee_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
