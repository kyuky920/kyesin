import { NextRequest, NextResponse } from "next/server";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/attendees ────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = parseInt(sp.get("page") ?? "0");
    const sort = (sp.get("sort") ?? "full_name") as "full_name" | "birth_year" | "church_name";
    const dir = sp.get("dir") === "desc" ? false : true;
    const gender = sp.get("gender") ?? "";
    const search = sp.get("search") ?? "";
    const assigned = sp.get("assigned") ?? "";
    const staffFilter = sp.get("staff") ?? "";
    const ageBand = sp.get("age_band") ?? "";
    const attendance = sp.get("attendance") ?? "";
    const PAGE_SIZE = 20;
    const fetchAll = sp.get("all") === "true";

    const supabase = createClient();

    // 최신 수련회 ID 조회 (캐시 효과 없음, 빠른 단일 행 쿼리)
    const { data: retreat } = await supabase
      .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
    const retreatId = retreat ? (retreat as { id: string }).id : null;

    let query = supabase
      .from("attendees")
      .select(
        `id, full_name, gender, birth_year, is_staff, is_leader,
         attends_day1, attends_day2, attends_day3, lodging_required,
         churches(canonical_name),
         group_assignments(retreat_groups(group_code))`,
        { count: "exact" }
      );

    if (retreatId) query = query.eq("retreat_id", retreatId);
    if (gender) query = query.eq("gender", gender);
    if (search) query = query.ilike("full_name", `%${search}%`);
    if (staffFilter === "yes") query = query.eq("is_staff", true);
    else if (staffFilter === "no") query = query.eq("is_staff", false);

    // 연령대 필터 (birth_year 범위로 처리)
    if (ageBand === "20_24") query = query.gte("birth_year", 2002).lte("birth_year", 2006);
    else if (ageBand === "25_28") query = query.gte("birth_year", 1998).lte("birth_year", 2001);
    else if (ageBand === "29_plus") query = query.lte("birth_year", 1997).gt("birth_year", 1900);

    // 참석 유형 필터
    if (attendance === "full") {
      query = query.eq("attends_day1", true).eq("attends_day2", true).eq("attends_day3", true);
    } else if (attendance === "fri_sat") {
      query = query.eq("attends_day1", false).eq("attends_day2", true).eq("attends_day3", true);
    } else if (attendance === "thu_fri") {
      query = query.eq("attends_day1", true).eq("attends_day2", true).eq("attends_day3", false);
    }

    if (sort === "church_name") {
      // church_name_raw는 canonical name으로 정규화된 직접 컬럼 → 교회 내 이름 오름차순 2차 정렬
      query = query
        .order("church_name_raw", { ascending: dir })
        .order("full_name", { ascending: true });
    } else {
      query = query.order(sort, { ascending: dir });
    }
    if (fetchAll) {
      query = query.limit(2000);
    } else {
      query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    let rows = (data ?? []) as unknown[];
    if (assigned === "yes") rows = (rows as { group_assignments?: { retreat_groups: unknown | null }[] }[]).filter((a) => a.group_assignments?.[0]?.retreat_groups);
    else if (assigned === "no") rows = (rows as { group_assignments?: { retreat_groups: unknown | null }[] }[]).filter((a) => !a.group_assignments?.[0]?.retreat_groups);

    return NextResponse.json({ data: rows, count: count ?? 0 });
  } catch (err) {
    console.error("GET attendees error:", err);
    const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? JSON.stringify(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST /api/admin/attendees ───────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name, gender, birth_year, church_name,
      shirt_size, lodging_required,
      attends_day1, attends_day2, attends_day3,
      meal_notes, arrival_notes, admin_notes, is_staff, is_leader,
    } = body as {
      full_name: string; gender: "male" | "female"; birth_year: number; church_name: string;
      shirt_size?: string; lodging_required?: boolean;
      attends_day1?: boolean; attends_day2?: boolean; attends_day3?: boolean;
      meal_notes?: string; arrival_notes?: string; admin_notes?: string;
      is_staff?: boolean; is_leader?: boolean;
    };

    if (!full_name?.trim()) return NextResponse.json({ error: "이름을 입력해 주세요." }, { status: 400 });
    if (!gender) return NextResponse.json({ error: "성별을 선택해 주세요." }, { status: 400 });
    if (!birth_year || birth_year < 1940 || birth_year > 2015) return NextResponse.json({ error: "올바른 생년을 입력해 주세요." }, { status: 400 });
    if (!church_name?.trim()) return NextResponse.json({ error: "교회명을 입력해 주세요." }, { status: 400 });

    const supabase = createClient();

    const { data: retreat } = await supabase
      .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
    if (!retreat) return NextResponse.json({ error: "수련회 데이터가 없습니다." }, { status: 400 });
    const retreatId = (retreat as { id: string }).id;

    const canonicalName = church_name.trim();
    await supabase.from("churches")
      .upsert({ canonical_name: canonicalName, display_name: canonicalName }, { onConflict: "canonical_name" });
    const { data: church } = await supabase.from("churches").select("id").eq("canonical_name", canonicalName).single();
    const churchId = church ? (church as { id: string }).id : null;

    const { data: existing } = await supabase.from("attendees")
      .select("id").eq("retreat_id", retreatId).eq("full_name", full_name.trim()).eq("birth_year", birth_year).maybeSingle();
    if (existing) return NextResponse.json({ error: `${full_name}(${birth_year})은 이미 등록된 참석자입니다.` }, { status: 409 });

    const { data, error } = await supabase.from("attendees").insert({
      retreat_id: retreatId, church_id: churchId, church_name_raw: canonicalName,
      full_name: full_name.trim(), gender, birth_year,
      shirt_size: shirt_size || null, lodging_required: lodging_required ?? false,
      attends_day1: attends_day1 ?? true, attends_day2: attends_day2 ?? true, attends_day3: attends_day3 ?? true,
      meal_notes: meal_notes || null, arrival_notes: arrival_notes || null, admin_notes: admin_notes || null,
      attendance_status: "confirmed", is_staff: is_staff ?? false, is_leader: is_leader ?? false,
    }).select("id, full_name").single();

    if (error) throw error;
    return NextResponse.json({ success: true, attendee: data });
  } catch (err) {
    console.error("Add attendee error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "등록 오류" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/attendees?id=xxx ── 역할 토글 (is_staff / is_leader)
export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    const body = await req.json() as { is_staff?: boolean; is_leader?: boolean };
    const update: Record<string, boolean> = {};
    if (typeof body.is_staff === "boolean") update.is_staff = body.is_staff;
    if (typeof body.is_leader === "boolean") update.is_leader = body.is_leader;
    if (Object.keys(update).length === 0) return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });

    const supabase = createClient();
    const { error } = await supabase.from("attendees").update(update).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH attendee error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "수정 오류" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/attendees?id=xxx  (id 없으면 전체 삭제) ──
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const supabase = createClient();

    if (id) {
      const { error } = await supabase.from("attendees").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // 전체 삭제: 현재 수련회의 모든 참석자 삭제
    const { data: retreat } = await supabase
      .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
    if (!retreat) return NextResponse.json({ error: "수련회 데이터가 없습니다." }, { status: 400 });
    const retreatId = (retreat as { id: string }).id;

    const { count: total } = await supabase
      .from("attendees").select("id", { count: "exact", head: true }).eq("retreat_id", retreatId);

    const { error } = await supabase.from("attendees").delete().eq("retreat_id", retreatId);
    if (error) throw error;

    return NextResponse.json({ success: true, deleted: total ?? 0 });
  } catch (err) {
    console.error("Delete attendee error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "삭제 오류" }, { status: 500 });
  }
}
