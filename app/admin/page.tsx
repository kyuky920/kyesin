import Link from "next/link";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AttendeeStats {
  id: string;
  gender: "male" | "female";
  birth_year: number;
  attends_day1: boolean;
  attends_day2: boolean;
  attends_day3: boolean;
}

interface Stats {
  total: number;
  assigned: number;
  unassigned: number;
  groups: number;
  male: number;
  female: number;
  age20_24: number;
  age25_28: number;
  age29plus: number;
  full: number;
  fri_sat: number;
  thu_fri: number;
}

function ageBand(birthYear: number): string | null {
  if (birthYear <= 1900 || birthYear < 1940) return null; // 생년 미상 제외
  const age = 2026 - birthYear;
  if (age >= 20 && age <= 24) return "20_24";
  if (age >= 25 && age <= 28) return "25_28";
  return "29_plus";
}

async function getStats(): Promise<Stats> {
  try {
    const supabase = createClient();

    const { data: retreat } = await supabase
      .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
    const retreatId = retreat ? (retreat as { id: string }).id : null;

    const [attendeesRes, groupsRes] = await Promise.all([
      retreatId
        ? supabase.from("attendees").select("id, gender, birth_year, attends_day1, attends_day2, attends_day3").eq("retreat_id", retreatId)
        : supabase.from("attendees").select("id, gender, birth_year, attends_day1, attends_day2, attends_day3"),
      retreatId
        ? supabase.from("retreat_groups").select("id").eq("retreat_id", retreatId)
        : supabase.from("retreat_groups").select("id"),
    ]);

    const attendees = (attendeesRes.data ?? []) as AttendeeStats[];
    const groupIds = (groupsRes.data ?? []).map((g: { id: string }) => g.id);

    // 배정 현황 — 현재 수련회 조에 속한 경우만
    let assignedIds = new Set<string>();
    if (groupIds.length > 0) {
      const { data: assignments } = await supabase
        .from("group_assignments").select("attendee_id").in("group_id", groupIds);
      assignedIds = new Set((assignments ?? []).map((a: { attendee_id: string }) => a.attendee_id));
    }

    return {
      total: attendees.length,
      assigned: assignedIds.size,
      unassigned: attendees.length - assignedIds.size,
      groups: groupIds.length,
      male: attendees.filter((a) => a.gender === "male").length,
      female: attendees.filter((a) => a.gender === "female").length,
      age20_24:  attendees.filter((a) => ageBand(a.birth_year) === "20_24").length,
      age25_28:  attendees.filter((a) => ageBand(a.birth_year) === "25_28").length,
      age29plus: attendees.filter((a) => ageBand(a.birth_year) === "29_plus").length,
      full:    attendees.filter((a) => a.attends_day1 && a.attends_day2 && a.attends_day3).length,
      fri_sat: attendees.filter((a) => !a.attends_day1 && a.attends_day2 && a.attends_day3).length,
      thu_fri: attendees.filter((a) => a.attends_day1 && a.attends_day2 && !a.attends_day3).length,
    };
  } catch {
    return { total: 0, assigned: 0, unassigned: 0, groups: 0, male: 0, female: 0, age20_24: 0, age25_28: 0, age29plus: 0, full: 0, fri_sat: 0, thu_fri: 0 };
  }
}

function StatCard({
  label, value, sub, color = "text-white", href,
}: {
  label: string; value: number | string; sub?: string; color?: string; href?: string;
}) {
  const inner = (
    <div className={`bg-navy-mid border border-slate-700 rounded-xl p-4 h-full ${href ? "hover:border-slate-500 hover:bg-slate-800/40 transition-colors" : ""}`}>
      <p className="text-slate-400 text-xs font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
      {href && <p className="text-slate-600 text-[10px] mt-2">탭하여 목록 보기 →</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

export default async function AdminPage() {
  const stats = await getStats();
  const assignedPct = stats.total > 0 ? Math.round((stats.assigned / stats.total) * 100) : 0;

  return (
    <main className="min-h-screen bg-navy flex flex-col">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">관리자 대시보드</h1>
            <p className="text-slate-400 text-xs">WALK WITH HIM 2026</p>
          </div>
        </div>
        <span className="text-xs bg-gold/20 text-gold border border-gold/30 px-2 py-1 rounded-full">Admin</span>
      </header>

      <div className="flex-1 px-6 py-6 max-w-4xl mx-auto w-full space-y-6">
        {/* 전체 현황 */}
        <section>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">전체 현황</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="총 참가자" value={stats.total} color="text-white"
              href="/admin/attendees" />
            <StatCard label="조 배정 완료" value={stats.assigned} sub={`${assignedPct}%`} color="text-green-400"
              href="/admin/attendees?assigned=yes" />
            <StatCard label="미배정" value={stats.unassigned} color={stats.unassigned > 0 ? "text-yellow-400" : "text-slate-400"}
              href="/admin/attendees?assigned=no" />
            <StatCard label="총 조 수" value={stats.groups} sub="목표 28~34개" color="text-gold"
              href="/admin/groups" />
          </div>
        </section>

        {/* 조편성 진행률 */}
        <section>
          <div className="bg-navy-mid border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 text-sm font-medium">조편성 진행률</span>
              <span className="text-gold font-bold">{assignedPct}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="bg-gold h-2 rounded-full transition-all duration-300" style={{ width: `${assignedPct}%` }} />
            </div>
            <p className="text-slate-500 text-xs mt-2">{stats.assigned}명 배정 완료 · {stats.unassigned}명 미배정</p>
          </div>
        </section>

        {/* 성별 분포 */}
        <section>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">성별 분포</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="남성" value={stats.male}
              sub={`${stats.total > 0 ? Math.round((stats.male / stats.total) * 100) : 0}%`}
              color="text-blue-300" href="/admin/attendees?gender=male" />
            <StatCard label="여성" value={stats.female}
              sub={`${stats.total > 0 ? Math.round((stats.female / stats.total) * 100) : 0}%`}
              color="text-pink-300" href="/admin/attendees?gender=female" />
          </div>
        </section>

        {/* 연령대 분포 */}
        <section>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">연령대 분포</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="20–24세" value={stats.age20_24}
              sub={`${stats.total > 0 ? Math.round((stats.age20_24 / stats.total) * 100) : 0}%`}
              color="text-white" href="/admin/attendees?age_band=20_24" />
            <StatCard label="25–28세" value={stats.age25_28}
              sub={`${stats.total > 0 ? Math.round((stats.age25_28 / stats.total) * 100) : 0}%`}
              color="text-white" href="/admin/attendees?age_band=25_28" />
            <StatCard label="29세+" value={stats.age29plus}
              sub={`${stats.total > 0 ? Math.round((stats.age29plus / stats.total) * 100) : 0}%`}
              color="text-white" href="/admin/attendees?age_band=29_plus" />
          </div>
        </section>

        {/* 참석 유형 */}
        <section>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">참석 유형</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="3일 (목금토)" value={stats.full}
              href="/admin/attendees?attendance=full" />
            <StatCard label="2일 (금토)" value={stats.fri_sat}
              href="/admin/attendees?attendance=fri_sat" />
            <StatCard label="2일 (목금)" value={stats.thu_fri}
              href="/admin/attendees?attendance=thu_fri" />
          </div>
        </section>

        {/* 운영 바로가기 */}
        <section>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">운영 바로가기</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/admin/attendees" className="bg-navy-mid hover:bg-slate-700 border border-slate-700 rounded-xl p-5 flex items-center gap-4 transition-colors group">
              <div className="w-10 h-10 bg-blue-900/40 border border-blue-700/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">참석자 관리</p>
                <p className="text-slate-500 text-xs">전체 {stats.total}명 목록 확인</p>
              </div>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/admin/groups" className="bg-navy-mid hover:bg-slate-700 border border-slate-700 rounded-xl p-5 flex items-center gap-4 transition-colors group">
              <div className="w-10 h-10 bg-gold/10 border border-gold/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">조편성 관리</p>
                <p className="text-slate-500 text-xs">현재 {stats.groups}개 조 편성됨</p>
              </div>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/admin/access" className="bg-navy-mid hover:bg-slate-700 border border-slate-700 rounded-xl p-5 flex items-center gap-4 transition-colors group">
              <div className="w-10 h-10 bg-emerald-900/30 border border-emerald-700/40 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">접속 현황</p>
                <p className="text-slate-500 text-xs">내 조 확인 접속자 추적</p>
              </div>
              <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
