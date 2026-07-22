import Link from "next/link";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 수련회 일자 (KST)
const RETREAT_DAYS = [
  { label: "1일차 (7/30 목)", dateKST: "2026-07-30" },
  { label: "2일차 (7/31 금)", dateKST: "2026-07-31" },
  { label: "3일차 (8/1 토)",  dateKST: "2026-08-01" },
];

const PAGE_LABELS: Record<string, string> = {
  "/":         "홈",
  "/lookup":   "내 조 찾기",
  "/me":       "내 조 확인",
  "/cell":     "셀 자료",
  "/schedule": "일정",
  "/venues":   "내 정보",
};

function pageLabel(path: string) {
  if (path.startsWith("/me")) return "내 조 확인";
  return PAGE_LABELS[path] ?? path;
}

function toKSTDate(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function formatKST(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm  = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd  = String(kst.getUTCDate()).padStart(2, "0");
  const hh  = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

interface PageViewRow {
  id: string;
  attendee_id: string | null;
  page_path: string;
  created_at: string;
  attendees: {
    full_name: string;
    gender: "male" | "female";
    churches: { canonical_name: string } | null;
    group_assignments: { retreat_groups: { group_code: string; group_name: string } | null }[];
  } | null;
}

interface AttendeeRow {
  id: string;
  full_name: string;
  gender: "male" | "female";
  is_staff: boolean;
  first_viewed_at: string | null;
  churches: { canonical_name: string } | null;
}

async function getData() {
  const supabase = createClient();

  const { data: retreat } = await supabase
    .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
  const retreatId = retreat ? (retreat as { id: string }).id : null;

  const [viewsResult, attendeesResult] = await Promise.all([
    supabase
      .from("page_views")
      .select(`
        id, attendee_id, page_path, created_at,
        attendees(full_name, gender, churches(canonical_name), group_assignments(retreat_groups(group_code, group_name)))
      `)
      .order("created_at", { ascending: false })
      .limit(5000),
    retreatId
      ? supabase
          .from("attendees")
          .select("id, full_name, gender, is_staff, first_viewed_at, churches(canonical_name)")
          .eq("retreat_id", retreatId)
          .eq("is_staff", false)
      : { data: [] },
  ]);

  return {
    views: (viewsResult.data ?? []) as unknown as PageViewRow[],
    attendees: (attendeesResult.data ?? []) as unknown as AttendeeRow[],
  };
}

export default async function AccessPage() {
  const { views, attendees } = await getData();

  const totalViews = views.length;
  const uniqueAttendeeIds = new Set(views.map((v) => v.attendee_id).filter(Boolean));
  const totalAttendees = attendees.length;
  const accessRate = totalAttendees > 0 ? Math.round((uniqueAttendeeIds.size / totalAttendees) * 100) : 0;

  // 페이지별 집계
  const pageCount: Record<string, number> = {};
  for (const v of views) {
    const key = pageLabel(v.page_path);
    pageCount[key] = (pageCount[key] ?? 0) + 1;
  }
  const topPages = Object.entries(pageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxPageCount = topPages[0]?.[1] ?? 1;

  // 일자별 집계 (수련회 기간 + 그 외)
  const dayCount: Record<string, Set<string>> = {};
  for (const v of views) {
    const dateKST = toKSTDate(v.created_at);
    if (!dayCount[dateKST]) dayCount[dateKST] = new Set();
    if (v.attendee_id) dayCount[dateKST].add(v.attendee_id);
  }

  // 참가자별 집계
  type AttendeeLog = {
    id: string;
    full_name: string;
    gender: "male" | "female";
    church: string;
    group: string;
    viewCount: number;
    pagesSeen: Set<string>;
    lastSeen: string | null;
    firstSeen: string | null;
  };
  const attendeeMap = new Map<string, AttendeeLog>();
  for (const v of views) {
    if (!v.attendee_id || !v.attendees) continue;
    const existing = attendeeMap.get(v.attendee_id);
    const group = v.attendees.group_assignments?.[0]?.retreat_groups;
    if (!existing) {
      attendeeMap.set(v.attendee_id, {
        id: v.attendee_id,
        full_name: v.attendees.full_name,
        gender: v.attendees.gender,
        church: v.attendees.churches?.canonical_name ?? "",
        group: group ? `${group.group_code}조` : "미배정",
        viewCount: 1,
        pagesSeen: new Set([pageLabel(v.page_path)]),
        lastSeen: v.created_at,
        firstSeen: v.created_at,
      });
    } else {
      existing.viewCount++;
      existing.pagesSeen.add(pageLabel(v.page_path));
      if (!existing.lastSeen || v.created_at > existing.lastSeen) existing.lastSeen = v.created_at;
      if (!existing.firstSeen || v.created_at < existing.firstSeen) existing.firstSeen = v.created_at;
    }
  }
  const attendeeLogs = Array.from(attendeeMap.values())
    .sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""));

  // 미접속 참가자
  const notViewed = attendees.filter((a) => !uniqueAttendeeIds.has(a.id));

  return (
    <main className="min-h-screen bg-navy flex flex-col max-w-3xl mx-auto">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center gap-4 sticky top-0 bg-navy z-10">
        <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-white font-bold text-lg">접속 현황</h1>
          <p className="text-slate-400 text-xs">전체 서비스 접속 로그 분석</p>
        </div>
      </header>

      <div className="px-6 py-5 space-y-7">

        {/* ── 요약 카드 ── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "전체 뷰", value: String(totalViews), color: "text-white" },
            { label: "접속 참가자", value: String(uniqueAttendeeIds.size), color: "text-gold" },
            { label: "미접속", value: String(notViewed.length), color: "text-slate-300" },
            { label: "접속률", value: `${accessRate}%`, color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl px-3 py-3 text-center" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── 일자별 접속자 ── */}
        <section>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">수련회 일자별 접속자</h2>
          <div className="grid grid-cols-3 gap-2">
            {RETREAT_DAYS.map(({ label, dateKST }) => {
              const count = dayCount[dateKST]?.size ?? 0;
              const pct = totalAttendees > 0 ? Math.round((count / totalAttendees) * 100) : 0;
              return (
                <div key={dateKST} className="rounded-xl px-4 py-4" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                  <p className="text-gold text-lg font-black">{count}명</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{label}</p>
                  <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "#0e1e45" }}>
                    <div className="h-full rounded-full bg-gold/60" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-slate-600 text-[10px] mt-1">{pct}%</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 페이지별 통계 ── */}
        <section>
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">페이지별 조회수</h2>
          <div className="rounded-xl overflow-hidden" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
            {topPages.length === 0 ? (
              <p className="text-slate-500 text-sm px-4 py-6 text-center">데이터가 없습니다.</p>
            ) : (
              topPages.map(([page, count], idx) => (
                <div key={page} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? "border-t border-slate-800/60" : ""}`}>
                  <span className="text-slate-500 text-xs w-4 text-right flex-shrink-0">{idx + 1}</span>
                  <span className="text-slate-200 text-sm font-medium w-24 flex-shrink-0">{page}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#0e1e45" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round((count / maxPageCount) * 100)}%`, background: "linear-gradient(90deg, #e9b94a80, #e9b94a)" }}
                    />
                  </div>
                  <span className="text-gold text-sm font-bold w-10 text-right flex-shrink-0">{count}</span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── 참가자별 접속 이력 ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">참가자별 접속 이력</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500">{attendeeLogs.length}명</span>
          </div>
          {attendeeLogs.length === 0 ? (
            <div className="rounded-xl px-4 py-6 text-center text-slate-500 text-sm" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
              아직 접속 기록이 없습니다.
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(233,185,74,0.2)" }}>
              {/* 헤더 */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 border-b border-slate-800/60">
                <span className="text-slate-500 text-[10px]">이름 · 교회 · 조</span>
                <span className="text-slate-500 text-[10px] w-16 text-center">뷰</span>
                <span className="text-slate-500 text-[10px] w-24 text-center">방문 페이지</span>
                <span className="text-slate-500 text-[10px] w-20 text-right">마지막 접속</span>
              </div>
              {attendeeLogs.map((a, idx) => (
                <div
                  key={a.id}
                  className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-4 py-2.5 ${idx > 0 ? "border-t border-slate-800/40" : ""}`}
                  style={{ background: idx % 2 === 0 ? "#0b1838" : "#0d1c3d" }}
                >
                  <div className="min-w-0">
                    <p className="text-slate-200 text-[13px] font-medium truncate">{a.full_name}</p>
                    <p className="text-slate-500 text-[10px] truncate">{a.church} · {a.group}</p>
                  </div>
                  <span className="text-gold text-sm font-bold w-16 text-center">{a.viewCount}</span>
                  <div className="w-24 flex flex-wrap gap-0.5 justify-center">
                    {Array.from(a.pagesSeen).map((p) => (
                      <span key={p} className="text-[9px] px-1 py-px rounded bg-slate-800 text-slate-400">{p}</span>
                    ))}
                  </div>
                  <span className="text-slate-400 text-[10px] w-20 text-right">
                    {a.lastSeen ? formatKST(a.lastSeen) : "-"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 미접속 참가자 ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">미접속 참가자</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500">{notViewed.length}명</span>
          </div>
          {notViewed.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-emerald-300 text-sm">모든 참가자가 접속했습니다!</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
              {notViewed.map((a, idx) => (
                <div key={a.id} className={`flex items-center gap-3 px-4 py-2.5 ${idx > 0 ? "border-t border-slate-800/60" : ""}`}>
                  <span className={`text-sm flex-shrink-0 ${a.gender === "male" ? "text-blue-400/50" : "text-pink-400/50"}`}>
                    {a.gender === "male" ? "♂" : "♀"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-[13px] truncate">{a.full_name}</p>
                    <p className="text-slate-600 text-[10px]">{a.churches?.canonical_name ?? ""}</p>
                  </div>
                  <span className="text-slate-700 text-[11px]">미접속</span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
