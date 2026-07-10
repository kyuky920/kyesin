"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScheduleItem } from "@/types";

const DAYS = [
  { label: "7/30", sub: "목 · 1일차", date: "2026-07-30", dayIndex: 0 },
  { label: "7/31", sub: "금 · 2일차", date: "2026-07-31", dayIndex: 1 },
  { label: "8/1",  sub: "토 · 3일차", date: "2026-08-01", dayIndex: 2 },
];

const MOCK_SCHEDULE: ScheduleItem[] = [
  { id: "m1", retreat_id: "2026", day_index: 0, date: "2026-07-30", start_time: "13:00", end_time: "15:00", title: "등록 및 입소", description: "수련회 등록 및 숙소 배정", venue: "교회 로비", category: "registration" },
  { id: "m2", retreat_id: "2026", day_index: 0, date: "2026-07-30", start_time: "15:30", end_time: "17:00", title: "개회 예배", description: "2026 계신 청년 하계수련회 개회 예배", speaker: "박OO 목사", venue: "본당", category: "worship" },
  { id: "m3", retreat_id: "2026", day_index: 0, date: "2026-07-30", start_time: "17:30", end_time: "18:30", title: "저녁 식사", venue: "식당", category: "meal" },
  { id: "m4", retreat_id: "2026", day_index: 0, date: "2026-07-30", start_time: "19:00", end_time: "20:30", title: "첫 번째 강의 — AI 시대의 신앙", description: "AI 시대에도 흔들리지 않는 믿음의 기초", speaker: "이OO 목사", venue: "본당", category: "lecture" },
  { id: "m5", retreat_id: "2026", day_index: 0, date: "2026-07-30", start_time: "20:45", end_time: "21:45", title: "조별 나눔 (1)", description: "오늘 강의 나눔 및 조원 소개", venue: "조별나눔실", category: "group" },
  { id: "m6", retreat_id: "2026", day_index: 0, date: "2026-07-30", start_time: "22:00", end_time: "22:30", title: "저녁 기도회", venue: "본당", category: "prayer" },
  { id: "m7", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "07:00", end_time: "07:30", title: "아침 기도", venue: "본당", category: "prayer" },
  { id: "m8", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "07:30", end_time: "08:30", title: "아침 식사", venue: "식당", category: "meal" },
  { id: "m9", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "09:00", end_time: "10:30", title: "두 번째 강의 — 에녹의 동행", description: "창세기 5:24 본문 강해 및 적용", speaker: "김OO 목사", venue: "본당", category: "lecture" },
  { id: "m10", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "10:45", end_time: "12:00", title: "세 번째 강의 — 현대 기술과 하나님 나라", description: "테크놀로지를 신앙으로 바라보는 관점", speaker: "정OO 교수", venue: "본당", category: "lecture" },
  { id: "m11", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "12:00", end_time: "13:00", title: "점심 식사", venue: "식당", category: "meal" },
  { id: "m12", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "13:30", end_time: "15:30", title: "야외 활동 — 조별 미션 투어", description: "조별 협동 미션을 수행하는 야외 활동", venue: "외부활동공간", category: "activity" },
  { id: "m13", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "15:30", end_time: "16:00", title: "자유 시간 및 휴식", category: "break" },
  { id: "m14", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "17:00", end_time: "18:30", title: "찬양 집회", description: "찬양팀과 함께하는 저녁 찬양 예배", venue: "본당", category: "worship" },
  { id: "m15", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "18:30", end_time: "19:30", title: "저녁 식사", venue: "식당", category: "meal" },
  { id: "m16", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "20:00", end_time: "21:30", title: "조별 나눔 (2)", description: "깊은 나눔 — 신앙의 도전과 동행의 경험", venue: "조별나눔실", category: "group" },
  { id: "m17", retreat_id: "2026", day_index: 1, date: "2026-07-31", start_time: "22:00", end_time: "23:00", title: "저녁 기도회 (중보기도)", venue: "본당", category: "prayer" },
  { id: "m18", retreat_id: "2026", day_index: 2, date: "2026-08-01", start_time: "07:00", end_time: "07:30", title: "아침 기도", venue: "본당", category: "prayer" },
  { id: "m19", retreat_id: "2026", day_index: 2, date: "2026-08-01", start_time: "07:30", end_time: "08:30", title: "아침 식사", venue: "식당", category: "meal" },
  { id: "m20", retreat_id: "2026", day_index: 2, date: "2026-08-01", start_time: "09:00", end_time: "10:30", title: "네 번째 강의 — 동행의 실천", description: "일상에서 하나님과 동행하는 구체적인 방법", speaker: "박OO 목사", venue: "본당", category: "lecture" },
  { id: "m21", retreat_id: "2026", day_index: 2, date: "2026-08-01", start_time: "10:45", end_time: "12:00", title: "간증 & 나눔 발표", description: "조별 대표 간증 및 수련회 나눔", venue: "본당", category: "testimony" },
  { id: "m22", retreat_id: "2026", day_index: 2, date: "2026-08-01", start_time: "12:00", end_time: "13:00", title: "점심 식사", venue: "식당", category: "meal" },
  { id: "m23", retreat_id: "2026", day_index: 2, date: "2026-08-01", start_time: "13:30", end_time: "15:00", title: "폐회 예배", description: "2026 계신 청년 하계수련회 폐회 및 파송 예배", speaker: "박OO 목사", venue: "본당", category: "worship" },
  { id: "m24", retreat_id: "2026", day_index: 2, date: "2026-08-01", start_time: "15:00", end_time: "16:00", title: "퇴소", description: "숙소 정리 및 귀가", venue: "교회 로비", category: "registration" },
];

type Category = {
  dot: string;
  badge: string;
  label: string;
};

const CAT: Record<string, Category> = {
  worship:      { dot: "bg-purple-400",  badge: "text-purple-300 bg-purple-900/40 border-purple-700/30",  label: "예배" },
  lecture:      { dot: "bg-blue-400",    badge: "text-blue-300 bg-blue-900/40 border-blue-700/30",        label: "강의" },
  prayer:       { dot: "bg-indigo-400",  badge: "text-indigo-300 bg-indigo-900/40 border-indigo-700/30",  label: "기도" },
  group:        { dot: "bg-green-400",   badge: "text-green-300 bg-green-900/40 border-green-700/30",     label: "조모임" },
  meal:         { dot: "bg-orange-400",  badge: "text-orange-300 bg-orange-900/40 border-orange-700/30",  label: "식사" },
  activity:     { dot: "bg-yellow-400",  badge: "text-yellow-300 bg-yellow-900/40 border-yellow-700/30",  label: "활동" },
  testimony:    { dot: "bg-rose-400",    badge: "text-rose-300 bg-rose-900/40 border-rose-700/30",        label: "간증" },
  break:        { dot: "bg-slate-400",   badge: "text-slate-400 bg-slate-800/60 border-slate-700/30",     label: "자유" },
  registration: { dot: "bg-slate-400",   badge: "text-slate-400 bg-slate-800/60 border-slate-700/30",     label: "등록" },
  default:      { dot: "bg-slate-500",   badge: "text-slate-400 bg-slate-800/40 border-slate-700/20",     label: "" },
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
          .order("day_index")
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

  const items = (schedule || MOCK_SCHEDULE).filter((i) => i.day_index === activeDay);

  return (
    <main className="h-screen bg-navy flex flex-col max-w-[430px] mx-auto overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-safe">
        <div className="h-14 flex items-center">
          <h1 className="text-white text-lg font-bold">수련회 일정</h1>
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
            style={
              activeDay === idx
                ? { background: "#e9b94a" }
                : {}
            }
          >
            <span
              className={`block text-sm font-bold leading-tight ${
                activeDay === idx ? "text-navy" : "text-slate-400"
              }`}
            >
              {d.label}
            </span>
            <span
              className={`block text-[10px] mt-0.5 ${
                activeDay === idx ? "text-navy/70 font-medium" : "text-slate-600"
              }`}
            >
              {d.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-4 pb-nav"
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
              const cat = CAT[item.category ?? "default"] || CAT.default;
              const isLast = i === items.length - 1;
              return (
                <div key={item.id} className="flex gap-3">
                  {/* Time + connector */}
                  <div className="flex flex-col items-center w-12 flex-shrink-0">
                    <p className="text-white text-xs font-mono font-semibold text-right w-full">
                      {item.start_time}
                    </p>
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${cat.dot}`} />
                    {!isLast && (
                      <div className="w-px flex-1 mt-1" style={{ background: "#1c2e58" }} />
                    )}
                  </div>

                  {/* Content card */}
                  <div
                    className="flex-1 rounded-2xl px-4 py-3 mb-2"
                    style={{ background: "#0b1838", border: "1px solid #1c2e58" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-white text-sm font-semibold leading-snug flex-1">
                        {item.title}
                      </h3>
                      {cat.label && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 font-medium ${cat.badge}`}
                        >
                          {cat.label}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-slate-500 text-xs leading-relaxed mb-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {item.speaker && (
                        <span className="flex items-center gap-1 text-slate-400 text-xs">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {item.speaker}
                        </span>
                      )}
                      {item.venue && (
                        <span className="flex items-center gap-1 text-slate-400 text-xs">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {item.venue}
                        </span>
                      )}
                      {item.end_time && (
                        <span className="flex items-center gap-1 text-slate-500 text-xs">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          ~{item.end_time}
                        </span>
                      )}
                    </div>
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
