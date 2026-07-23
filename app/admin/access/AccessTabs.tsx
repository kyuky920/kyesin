"use client";

import { useState } from "react";

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

function formatKST(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm  = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd  = String(kst.getUTCDate()).padStart(2, "0");
  const hh  = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

export interface PageViewRow {
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

export interface AttendeeRow {
  id: string;
  full_name: string;
  gender: "male" | "female";
  churches: { canonical_name: string } | null;
}

interface AttendeeLog {
  id: string;
  full_name: string;
  gender: "male" | "female";
  church: string;
  group: string;
  viewCount: number;
  pagesSeen: string[];
  lastSeen: string | null;
}

interface DayStat {
  label: string;
  dateKST: string;
  count: number;
  pct: number;
}

interface Props {
  totalViews: number;
  uniqueVisitorCount: number;
  notViewedCount: number;
  accessRate: number;
  dayStats: DayStat[];
  topPages: [string, number][];
  maxPageCount: number;
  attendeeLogs: AttendeeLog[];
  notViewed: AttendeeRow[];
}

type Tab = "summary" | "pages" | "attendees" | "unvisited";

const TABS: { key: Tab; label: string }[] = [
  { key: "summary",   label: "요약"     },
  { key: "pages",     label: "페이지별" },
  { key: "attendees", label: "참가자별" },
  { key: "unvisited", label: "미접속"   },
];

export default function AccessTabs({
  totalViews,
  uniqueVisitorCount,
  notViewedCount,
  accessRate,
  dayStats,
  topPages,
  maxPageCount,
  attendeeLogs,
  notViewed,
}: Props) {
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <>
      {/* 탭 바 */}
      <div className="sticky top-[57px] z-10 bg-navy border-b border-slate-800 px-6">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); window.scrollTo(0, 0); }}
              className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-gold text-gold"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.label}
              {t.key === "unvisited" && notViewedCount > 0 && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {notViewedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">

        {/* ── 요약 탭 ── */}
        {tab === "summary" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "전체 페이지뷰", value: String(totalViews),          color: "text-white"        },
                { label: "접속 참가자",   value: String(uniqueVisitorCount),  color: "text-gold"         },
                { label: "미접속 참가자", value: String(notViewedCount),       color: "text-slate-300"    },
                { label: "접속률",        value: `${accessRate}%`,            color: "text-emerald-400"  },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl px-5 py-5" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                  <p className="text-slate-500 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>

            <section>
              <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">수련회 일자별 접속자</h2>
              <div className="space-y-2">
                {dayStats.map(({ label, dateKST, count, pct }) => (
                  <div key={dateKST} className="rounded-xl px-4 py-4" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 text-sm font-medium">{label}</span>
                      <span className="text-gold font-bold text-sm">{count}명 · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "#0e1e45" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #e9b94a60, #e9b94a)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── 페이지별 탭 ── */}
        {tab === "pages" && (
          <section>
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">페이지별 조회수</h2>
            {topPages.length === 0 ? (
              <div className="rounded-xl px-4 py-8 text-center text-slate-500 text-sm" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                데이터가 없습니다.
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                {topPages.map(([page, count], idx) => (
                  <div key={page} className={`flex items-center gap-3 px-4 py-4 ${idx > 0 ? "border-t border-slate-800/60" : ""}`}>
                    <span className="text-slate-600 text-xs w-4 text-right flex-shrink-0">{idx + 1}</span>
                    <span className="text-slate-200 text-sm font-semibold w-24 flex-shrink-0">{page}</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "#0e1e45" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.round((count / maxPageCount) * 100)}%`, background: "linear-gradient(90deg, #e9b94a60, #e9b94a)" }}
                      />
                    </div>
                    <span className="text-gold text-base font-black w-10 text-right flex-shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── 참가자별 탭 ── */}
        {tab === "attendees" && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">참가자별 접속 이력</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500">{attendeeLogs.length}명</span>
            </div>
            {attendeeLogs.length === 0 ? (
              <div className="rounded-xl px-4 py-8 text-center text-slate-500 text-sm" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                아직 접속 기록이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {attendeeLogs.map((a) => (
                  <div key={a.id} className="rounded-xl px-4 py-3" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs flex-shrink-0 ${a.gender === "male" ? "text-blue-400" : "text-pink-400"}`}>
                            {a.gender === "male" ? "♂" : "♀"}
                          </span>
                          <p className="text-slate-200 text-sm font-semibold truncate">{a.full_name}</p>
                          <span className="text-gold text-xs font-bold flex-shrink-0">{a.group}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{a.church}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-gold text-sm font-black">{a.viewCount}뷰</p>
                        <p className="text-slate-500 text-[10px]">{a.lastSeen ? formatKST(a.lastSeen) : "-"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {a.pagesSeen.map((p) => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#0e1e45", color: "#94a3b8" }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── 미접속 탭 ── */}
        {tab === "unvisited" && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">미접속 참가자</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-500">{notViewedCount}명</span>
            </div>
            {notViewed.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl px-4 py-4" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-emerald-300 text-sm">모든 참가자가 접속했습니다!</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                {notViewed.map((a, idx) => (
                  <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? "border-t border-slate-800/60" : ""}`}>
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
        )}

      </div>
    </>
  );
}
