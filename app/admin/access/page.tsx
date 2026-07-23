import Link from "next/link";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import AccessTabs, { type PageViewRow, type AttendeeRow } from "./AccessTabs";

export const dynamic = "force-dynamic";

const RETREAT_DAYS = [
  { label: "1일차 (7/30 목)", dateKST: "2026-07-30" },
  { label: "2일차 (7/31 금)", dateKST: "2026-07-31" },
  { label: "3일차 (8/1 토)",  dateKST: "2026-08-01" },
];

function toKSTDate(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function pageLabel(path: string): string {
  const map: Record<string, string> = {
    "/": "홈", "/lookup": "내 조 찾기", "/me": "내 조 확인",
    "/cell": "셀 자료", "/schedule": "일정", "/venues": "내 정보",
  };
  if (path.startsWith("/me")) return "내 조 확인";
  return map[path] ?? path;
}

async function getData() {
  const supabase = createClient();

  const { data: retreat } = await supabase
    .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
  const retreatId = retreat ? (retreat as { id: string }).id : null;

  const [viewsResult, attendeesResult] = await Promise.all([
    supabase
      .from("page_views")
      .select(`id, attendee_id, page_path, created_at,
        attendees(full_name, gender, churches(canonical_name),
          group_assignments(retreat_groups(group_code, group_name)))`)
      .order("created_at", { ascending: false })
      .limit(5000),
    retreatId
      ? supabase
          .from("attendees")
          .select("id, full_name, gender, is_staff, churches(canonical_name)")
          .eq("retreat_id", retreatId)
          .eq("is_staff", false)
      : { data: [] },
  ]);

  return {
    views: (viewsResult.data ?? []) as unknown as PageViewRow[],
    attendees: (attendeesResult.data ?? []) as unknown as (AttendeeRow & { is_staff: boolean })[],
  };
}

export default async function AccessPage() {
  const { views, attendees } = await getData();

  // 요약 집계
  const uniqueAttendeeIds = new Set(views.map((v) => v.attendee_id).filter(Boolean));
  const totalAttendees = attendees.length;
  const accessRate = totalAttendees > 0 ? Math.round((uniqueAttendeeIds.size / totalAttendees) * 100) : 0;

  // 페이지별
  const pageCount: Record<string, number> = {};
  for (const v of views) {
    const key = pageLabel(v.page_path);
    pageCount[key] = (pageCount[key] ?? 0) + 1;
  }
  const topPages = Object.entries(pageCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxPageCount = topPages[0]?.[1] ?? 1;

  // 일자별
  const dayCountMap: Record<string, Set<string>> = {};
  for (const v of views) {
    const d = toKSTDate(v.created_at);
    if (!dayCountMap[d]) dayCountMap[d] = new Set();
    if (v.attendee_id) dayCountMap[d].add(v.attendee_id);
  }
  const dayStats = RETREAT_DAYS.map(({ label, dateKST }) => {
    const count = dayCountMap[dateKST]?.size ?? 0;
    return { label, dateKST, count, pct: totalAttendees > 0 ? Math.round((count / totalAttendees) * 100) : 0 };
  });

  // 참가자별
  const attendeeMap = new Map<string, {
    id: string; full_name: string; gender: "male" | "female";
    church: string; group: string; viewCount: number;
    pagesSeen: Set<string>; lastSeen: string | null;
  }>();
  for (const v of views) {
    if (!v.attendee_id || !v.attendees) continue;
    const group = v.attendees.group_assignments?.[0]?.retreat_groups;
    const existing = attendeeMap.get(v.attendee_id);
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
      });
    } else {
      existing.viewCount++;
      existing.pagesSeen.add(pageLabel(v.page_path));
      if (!existing.lastSeen || v.created_at > existing.lastSeen) existing.lastSeen = v.created_at;
    }
  }
  const attendeeLogs = Array.from(attendeeMap.values())
    .map((a) => ({ ...a, pagesSeen: Array.from(a.pagesSeen) }))
    .sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""));

  // 미접속
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

      <AccessTabs
        totalViews={views.length}
        uniqueVisitorCount={uniqueAttendeeIds.size}
        notViewedCount={notViewed.length}
        accessRate={accessRate}
        dayStats={dayStats}
        topPages={topPages}
        maxPageCount={maxPageCount}
        attendeeLogs={attendeeLogs}
        notViewed={notViewed}
      />
    </main>
  );
}
