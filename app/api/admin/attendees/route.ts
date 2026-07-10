import { NextRequest, NextResponse } from "next/server";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/attendees ────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = parseInt(sp.get("page") ?? "0");
    const sort = (sp.get("sort") ?? "full_name") as "full_name" | "birth_year";
    const dir = sp.get("dir") === "desc" ? false : true;
    const gender = sp.get("gender") ?? "";
    const search = sp.get("search") ?? "";
    const assigned = sp.get("assigned") ?? "";
    const PAGE_SIZE = 20;

    const supabase = createClient();
    let query = supabase
      .from("attendees")
      .select(
        `id, full_name, gender, birth_year,
         attends_day1, attends_day2, attends_day3, lodging_required,
         churches(canonical_name),
         group_assignments(retreat_groups(group_number, group_name))`,
        { count: "exact" }
      );

    if (gender) query = query.eq("gender", gender);
    if (search) query = query.ilike("full_name", `%${search}%`);
    query = query.order(sort, { ascending: dir });
    query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    let rows = (data ?? []) as unknown[];
    if (assigned === "yes") rows = (rows as { group_assignments?: { retreat_groups: unknown | null }[] }[]).filter((a) => a.group_assignments?.[0]?.retreat_groups);
    else if (assigned === "no") rows = (rows as { group_assignments?: { retreat_groups: unknown | null }[] }[]).filter((a) => !a.group_assignments?.[0]?.retreat_groups);

    return NextResponse.json({ data: rows, count: count ?? 0 });
  } catch (err) {
    console.error("GET attendees error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "조회 오류" }, { status: 500 });
  }
}

// ─── POST /api/admin/attendees ───────────────────────────────
// 단일 참석자 수동 등록
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name,
      gender,
      birth_year,
      church_name,
      shirt_size,
      lodging_required,
      attends_day1,
      attends_day2,
      attends_day3,
      meal_notes,
      arrival_notes,
      admin_notes,
    } = body as {
      full_name: string;
      gender: "male" | "female";
      birth_year: number;
      church_name: string;
      shirt_size?: string;
      lodging_required?: boolean;
      attends_day1?: boolean;
      attends_day2?: boolean;
      attends_day3?: boolean;
      meal_notes?: string;
      arrival_notes?: string;
      admin_notes?: string;
    };

    if (!full_name?.trim()) return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
    if (!gender) return NextResponse.json({ error: "성별을 선택해 주세요." }, { status: 400 });
    if (!birth_year || birth_year < 1955 || birth_year > 2015) return NextResponse.json({ error: "올바른 생년을 입력해 주세요." }, { status: 400 });
    if (!church_name?.trim()) return NextResponse.json({ error: "교회명을 입력해 주세요." }, { status: 400 });

    const supabase = await createClient();

    // 수련회 ID
    const { data: retreat } = await supabase
      .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
    if (!retreat) return NextResponse.json({ error: "수련회 데이터가 없습니다." }, { status: 400 });

    const retreatId = (retreat as { id: string }).id;

    // 교회 upsert
    const canonicalName = church_name.trim();
    await supabase.from("churches")
      .upsert({ canonical_name: canonicalName, display_name: canonicalName }, { onConflict: "canonical_name" });

    const { data: church } = await supabase.from("churches").select("id").eq("canonical_name", canonicalName).single();
    const churchId = church ? (church as { id: string }).id : null;

    // 중복 체크
    const { data: existing } = await supabase.from("attendees")
      .select("id")
      .eq("retreat_id", retreatId)
      .eq("full_name", full_name.trim())
      .eq("birth_year", birth_year)
      .maybeSingle();

    if (existing) return NextResponse.json({ error: `${full_name}(${birth_year})은 이미 등록된 참석자입니다.` }, { status: 409 });

    const { data, error } = await supabase.from("attendees").insert({
      retreat_id: retreatId,
      church_id: churchId,
      church_name_raw: canonicalName,
      full_name: full_name.trim(),
      gender,
      birth_year,
      shirt_size: shirt_size || null,
      lodging_required: lodging_required ?? false,
      attends_day1: attends_day1 ?? true,
      attends_day2: attends_day2 ?? true,
      attends_day3: attends_day3 ?? true,
      meal_notes: meal_notes || null,
      arrival_notes: arrival_notes || null,
      admin_notes: admin_notes || null,
      attendance_status: "confirmed",
    }).select("id, full_name").single();

    if (error) throw error;

    return NextResponse.json({ success: true, attendee: data });
  } catch (err) {
    console.error("Add attendee error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "등록 오류" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/attendees?id=xxx ─────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

    const supabase = await createClient();
    const { error } = await supabase.from("attendees").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete attendee error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "삭제 오류" }, { status: 500 });
  }
}
