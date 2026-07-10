import { NextRequest, NextResponse } from "next/server";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { church_name, name, birth_year } = body as {
      church_name: string;
      name: string;
      birth_year: number;
    };

    if (!church_name || !name || !birth_year) {
      return NextResponse.json(
        { error: "교회명, 이름, 생년을 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    // 1) church_aliases 에서 입력 교회명과 매칭되는 church_id 수집
    const { data: aliasMatch } = await supabase
      .from("church_aliases")
      .select("church_id")
      .eq("alias_name", church_name.trim());

    const { data: directMatch } = await supabase
      .from("churches")
      .select("id")
      .eq("canonical_name", church_name.trim());

    const churchIds = [
      ...((aliasMatch ?? []).map((a) => a.church_id)),
      ...((directMatch ?? []).map((c) => c.id)),
    ];

    // 2) 참석자 조회 — full_name + birth_year 기준, church_id 우선
    const selectFields = `
      id, full_name, birth_year, gender, age, age_band,
      lodging_required, attends_day1, attends_day2, attends_day3,
      church_id, church_name_raw, arrival_notes,
      churches(canonical_name),
      group_assignments(
        group_id,
        retreat_groups(id, group_number, group_name)
      )
    `;

    let attendee = null;

    if (churchIds.length > 0) {
      const { data } = await supabase
        .from("attendees")
        .select(selectFields)
        .in("church_id", churchIds)
        .eq("full_name", name.trim())
        .eq("birth_year", birth_year)
        .maybeSingle();
      attendee = data;
    }

    // fallback: 교회 없이 이름+생년만으로 조회
    if (!attendee) {
      const { data } = await supabase
        .from("attendees")
        .select(selectFields)
        .eq("full_name", name.trim())
        .eq("birth_year", birth_year)
        .maybeSingle();
      attendee = data;
    }

    // 3) 조회 로그 저장 (테이블이 있으면)
    try {
      await supabase.from("attendee_lookup_logs").insert({
        attendee_id: attendee ? (attendee as { id: string }).id : null,
        church_name_input: church_name,
        name_input: name,
        birth_year_input: birth_year,
        found: !!attendee,
        ip_address: ip,
      });
    } catch {
      // 로그 저장 실패는 무시
    }

    if (!attendee) {
      return NextResponse.json(
        { error: "참가자 정보를 찾을 수 없습니다. 소속 교회, 이름, 생년을 다시 확인해 주세요." },
        { status: 404 }
      );
    }

    return NextResponse.json({ attendee });
  } catch (err) {
    console.error("Lookup error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
