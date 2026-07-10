"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScheduleItem } from "@/types";

const DAYS = [
  { label: "7/30", sub: "목 · 1일차", date: "2026-07-30" },
  { label: "7/31", sub: "금 · 2일차", date: "2026-07-31" },
  { label: "8/1",  sub: "토 · 3일차", date: "2026-08-01" },
];

const MOCK_SCHEDULE: ScheduleItem[] = [
  // ── 7월 30일 (목) ─────────────────────────────────────────────
  { id: "m1",  retreat_id: "2026", day_date: "2026-07-30", start_time: "13:00", end_time: "15:00", title: "도착 및 등록", body: "명륜교회 도착, 등록 및 숙소 배정 (안내 및 짐 정리)", audience_note: "명륜교회", item_type: "arrival" },
  { id: "m2",  retreat_id: "2026", day_date: "2026-07-30", start_time: "16:00", end_time: "17:00", title: "개회 예배", body: "본문: 창 5:21~24\n제목: 하나님과 동행한 에녹의 믿음", subtitle: "이용주 목사 (계신 총회장)", audience_note: "본당", item_type: "worship" },
  { id: "m3",  retreat_id: "2026", day_date: "2026-07-30", start_time: "17:00", end_time: "18:30", title: "저녁 식사", audience_note: "식당", item_type: "meal" },
  { id: "m4",  retreat_id: "2026", day_date: "2026-07-30", start_time: "18:30", end_time: "19:30", title: "특강 (1) — 문명에 대한 그리스도인의 이해", subtitle: "서문 강 교수", audience_note: "본당", item_type: "lecture" },
  { id: "m5",  retreat_id: "2026", day_date: "2026-07-30", start_time: "19:30", end_time: "21:00", title: "조별 나눔", body: "연령대별 조별 나눔", audience_note: "조별나눔실", item_type: "group" },
  { id: "m6",  retreat_id: "2026", day_date: "2026-07-30", start_time: "21:00", end_time: "22:00", title: "찬양과 기도회", audience_note: "본당", item_type: "worship" },
  { id: "m7",  retreat_id: "2026", day_date: "2026-07-30", start_time: "22:00", end_time: "24:00", title: "오병이어와 친교", item_type: "activity" },
  { id: "m8",  retreat_id: "2026", day_date: "2026-07-30", start_time: "24:00", title: "취침", item_type: "break" },
  // ── 7월 31일 (금) ─────────────────────────────────────────────
  { id: "m9",  retreat_id: "2026", day_date: "2026-07-31", start_time: "07:00", end_time: "08:00", title: "기상 및 개인 경건의 시간", item_type: "worship" },
  { id: "m10", retreat_id: "2026", day_date: "2026-07-31", start_time: "08:00", end_time: "09:00", title: "아침 식사", audience_note: "식당", item_type: "meal" },
  { id: "m11", retreat_id: "2026", day_date: "2026-07-31", start_time: "09:00", end_time: "10:00", title: "휴식", item_type: "break" },
  { id: "m12", retreat_id: "2026", day_date: "2026-07-31", start_time: "10:00", end_time: "11:00", title: "특강 (2) — AI가 대신할 수 없는 교회의 본질·예배", subtitle: "서창원 교수", audience_note: "본당", item_type: "lecture" },
  { id: "m13", retreat_id: "2026", day_date: "2026-07-31", start_time: "11:00", end_time: "12:00", title: "점심 식사", audience_note: "식당", item_type: "meal" },
  { id: "m14", retreat_id: "2026", day_date: "2026-07-31", start_time: "12:00", end_time: "16:00", title: "교회별 친교 활동", body: "외부 활동 가능", item_type: "activity" },
  { id: "m15", retreat_id: "2026", day_date: "2026-07-31", start_time: "16:00", end_time: "17:00", title: "공동체 어울림 활동", item_type: "activity" },
  { id: "m16", retreat_id: "2026", day_date: "2026-07-31", start_time: "17:00", end_time: "18:30", title: "저녁 식사", audience_note: "식당", item_type: "meal" },
  { id: "m17", retreat_id: "2026", day_date: "2026-07-31", start_time: "18:30", end_time: "19:30", title: "특강 (3) — AI 시대에 그리스도인으로 산다는 것", subtitle: "윤석헌 교수", audience_note: "본당", item_type: "lecture" },
  { id: "m18", retreat_id: "2026", day_date: "2026-07-31", start_time: "19:30", end_time: "21:00", title: "조별 나눔", body: "연령대별 조별 나눔", audience_note: "조별나눔실", item_type: "group" },
  { id: "m19", retreat_id: "2026", day_date: "2026-07-31", start_time: "21:00", end_time: "22:00", title: "찬양과 기도회", audience_note: "본당", item_type: "worship" },
  { id: "m20", retreat_id: "2026", day_date: "2026-07-31", start_time: "22:00", end_time: "24:00", title: "오병이어와 친교", item_type: "activity" },
  { id: "m21", retreat_id: "2026", day_date: "2026-07-31", start_time: "24:00", title: "취침", item_type: "break" },
  // ── 8월 1일 (토) ──────────────────────────────────────────────
  { id: "m22", retreat_id: "2026", day_date: "2026-08-01", start_time: "07:00", end_time: "08:00", title: "기상 및 개인 경건의 시간", item_type: "worship" },
  { id: "m23", retreat_id: "2026", day_date: "2026-08-01", start_time: "08:00", end_time: "09:00", title: "아침 식사", audience_note: "식당", item_type: "meal" },
  { id: "m24", retreat_id: "2026", day_date: "2026-08-01", start_time: "09:00", end_time: "10:00", title: "숙소 정리 및 청소", item_type: "break" },
  { id: "m25", retreat_id: "2026", day_date: "2026-08-01", start_time: "10:00", end_time: "11:00", title: "특강 (4) — AI 시대, 왜 주일이 더 중요해졌는가", subtitle: "강정주 교수", audience_note: "본당", item_type: "lecture" },
  { id: "m26", retreat_id: "2026", day_date: "2026-08-01", start_time: "11:00", end_time: "12:00", title: "폐회 예배", body: "본문: 마 6:33~34\n제목: 알고리즘의 예측을 넘어 하늘 아버지를 향한 시선으로", subtitle: "김재현 목사 (가락동부교회)", audience_note: "본당", item_type: "worship" },
  { id: "m27", retreat_id: "2026", day_date: "2026-08-01", start_time: "12:00", end_time: "13:00", title: "점심 식사", audience_note: "식당", item_type: "meal" },
  { id: "m28", retreat_id: "2026", day_date: "2026-08-01", start_time: "13:00", title: "귀가", item_type: "departure" },
];

// 카테고리별 색상 시스템
// border: 왼쪽 강조 테두리, bg: 카드 배경 색조, dot: 타임라인 점
// label / labelFg / labelBg: 배지 텍스트·배경
type CatStyle = {
  border: string;
  bg: string;
  dot: string;
  label: string;
  labelFg: string;
  labelBg: string;
};

const CAT: Record<string, CatStyle> = {
  worship:   {
    border: "#8b5cf6", bg: "rgba(139,92,246,0.09)",
    dot: "#a78bfa",    label: "예배",
    labelFg: "#c4b5fd", labelBg: "rgba(139,92,246,0.20)",
  },
  lecture:   {
    border: "#3b82f6", bg: "rgba(59,130,246,0.09)",
    dot: "#60a5fa",    label: "강의",
    labelFg: "#93c5fd", labelBg: "rgba(59,130,246,0.20)",
  },
  group:     {
    border: "#10b981", bg: "rgba(16,185,129,0.09)",
    dot: "#34d399",    label: "조모임",
    labelFg: "#6ee7b7", labelBg: "rgba(16,185,129,0.20)",
  },
  meal:      {
    border: "#f59e0b", bg: "rgba(245,158,11,0.09)",
    dot: "#fbbf24",    label: "식사",
    labelFg: "#fde68a", labelBg: "rgba(245,158,11,0.20)",
  },
  activity:  {
    border: "#06b6d4", bg: "rgba(6,182,212,0.08)",
    dot: "#22d3ee",    label: "활동",
    labelFg: "#67e8f9", labelBg: "rgba(6,182,212,0.18)",
  },
  break:     {
    border: "#475569", bg: "rgba(51,65,85,0.25)",
    dot: "#64748b",    label: "휴식",
    labelFg: "#94a3b8", labelBg: "rgba(71,85,105,0.30)",
  },
  arrival:   {
    border: "#475569", bg: "rgba(51,65,85,0.25)",
    dot: "#64748b",    label: "등록",
    labelFg: "#94a3b8", labelBg: "rgba(71,85,105,0.30)",
  },
  departure: {
    border: "#475569", bg: "rgba(51,65,85,0.25)",
    dot: "#64748b",    label: "귀가",
    labelFg: "#94a3b8", labelBg: "rgba(71,85,105,0.30)",
  },
  notice:    {
    border: "#e9b94a", bg: "rgba(233,185,74,0.08)",
    dot: "#e9b94a",    label: "공지",
    labelFg: "#fde68a", labelBg: "rgba(233,185,74,0.18)",
  },
  default:   {
    border: "#334155", bg: "rgba(51,65,85,0.20)",
    dot: "#475569",    label: "",
    labelFg: "#94a3b8", labelBg: "rgba(51,65,85,0.20)",
  },
};

export default function SchedulePage() {
  const [activeDay, setActiveDay] = useState(0);
  const [schedule, setSchedule] = useState<ScheduleItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("schedule_items")
          .select("*")
          .order("day_date")
          .order("start_time");
        if (!error && data && data.length > 0) {
          setSchedule(data as ScheduleItem[]);
        } else {
          setSchedule(MOCK_SCHEDULE);
        }
      } catch {
        setSchedule(MOCK_SCHEDULE);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  const handleDayChange = (idx: number) => {
    setActiveDay(idx);
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const items = (schedule || MOCK_SCHEDULE).filter(
    (i) => i.day_date === DAYS[activeDay].date
  );

  return (
    <main className="h-screen bg-navy flex flex-col max-w-[430px] mx-auto overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-safe">
        <div className="h-14 flex items-center">
          <h1 className="text-white text-lg font-semibold tracking-tight">수련회 일정</h1>
          <span className="ml-2 text-slate-500 text-xs">2026.07.30–08.01</span>
        </div>
      </header>

      {/* Day Tabs */}
      <div
        className="flex-shrink-0 flex mx-4 rounded-2xl p-1 gap-1"
        style={{ background: "#0b1838", border: "1px solid #1c2e58" }}
      >
        {DAYS.map((d, idx) => (
          <button
            key={idx}
            onClick={() => handleDayChange(idx)}
            className="flex-1 py-2 rounded-xl text-center transition-colors active:scale-95"
            style={activeDay === idx ? { background: "#e9b94a" } : {}}
          >
            <span className={`block text-sm font-bold leading-tight ${activeDay === idx ? "text-navy" : "text-slate-400"}`}>
              {d.label}
            </span>
            <span className={`block text-[10px] mt-0.5 ${activeDay === idx ? "text-navy/70 font-medium" : "text-slate-600"}`}>
              {d.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3 pb-nav"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <svg className="w-6 h-6 text-gold animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => {
              const cat = CAT[item.item_type ?? "default"] ?? CAT.default;
              const isLast = i === items.length - 1;

              return (
                <div key={item.id} className="flex gap-2.5">
                  {/* ── 시간 + 타임라인 ── */}
                  <div className="flex flex-col items-center w-[42px] flex-shrink-0 pt-[11px]">
                    <p className="text-slate-300 text-[11px] font-mono font-bold leading-none text-right w-full">
                      {item.start_time}
                    </p>
                    {/* 타임라인 점 — 카테고리 색상 */}
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ring-2 ring-navy"
                      style={{ background: cat.dot }}
                    />
                    {!isLast && (
                      <div className="w-px flex-1 mt-1" style={{ background: "#1c2e58" }} />
                    )}
                  </div>

                  {/* ── 카드 — 카테고리 색상 시스템 ── */}
                  <div
                    className="flex-1 rounded-xl px-3.5 py-2.5 mb-2 overflow-hidden"
                    style={{
                      background: cat.bg,
                      border: "1px solid rgba(28,46,88,0.5)",
                      borderLeft: `3px solid ${cat.border}`,
                    }}
                  >
                    {/* 제목 행 */}
                    <div className="flex items-start gap-2">
                      <h3 className="text-white text-[13px] font-semibold leading-snug flex-1">
                        {item.title}
                      </h3>
                      {/* 카테고리 배지 */}
                      {cat.label && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 tracking-wide"
                          style={{ color: cat.labelFg, background: cat.labelBg }}
                        >
                          {cat.label}
                        </span>
                      )}
                    </div>

                    {/* 본문 설명 */}
                    {item.body && (
                      <p
                        className="text-[11px] leading-relaxed mt-1.5 whitespace-pre-line"
                        style={{ color: cat.labelFg, opacity: 0.85 }}
                      >
                        {item.body}
                      </p>
                    )}

                    {/* 메타 정보 (강사 · 장소 · 종료시간) */}
                    {(item.subtitle || item.audience_note || item.end_time) && (
                      <div className="flex flex-wrap gap-2.5 mt-2">
                        {item.subtitle && (
                          <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {item.subtitle}
                          </span>
                        )}
                        {item.audience_note && (
                          <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {item.audience_note}
                          </span>
                        )}
                        {item.end_time && (
                          <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            ~{item.end_time}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
