"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Q = { q: string; hint?: string };

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ no, title, scripture, questions }: {
  no: number; title: string; scripture: string; questions: Q[];
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #1c2e58" }}>
        <div className="flex items-start gap-3">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
            style={{ background: "rgba(233,185,74,0.12)", color: "#e9b94a", border: "1px solid rgba(233,185,74,0.25)" }}
          >
            {no}
          </span>
          <div>
            <p className="text-white text-[14px] font-bold leading-snug">{title}</p>
            <p className="text-[10px] mt-1" style={{ color: "rgba(233,185,74,0.45)" }}>[본문 : {scripture}]</p>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 space-y-3.5">
        {questions.map((item, i) => (
          <div key={i} className="flex gap-2.5">
            <span className="text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ color: "rgba(233,185,74,0.4)" }}>
              {i + 1})
            </span>
            <div className="flex-1">
              <p className="text-slate-200 text-[13px] leading-relaxed">{item.q}</p>
              {item.hint && (
                <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">예시: {item.hint}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrayerCard({ title, items, emerald }: { title: string; items: string[]; emerald?: boolean }) {
  const bg = emerald ? "rgba(16,185,129,0.06)" : "rgba(233,185,74,0.06)";
  const border = emerald ? "rgba(16,185,129,0.2)" : "rgba(233,185,74,0.2)";
  const titleColor = emerald ? "#6ee7b7" : "#e9b94a";
  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: bg, border: `1px solid ${border}` }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: titleColor }}>
        {title}
      </p>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <span className="flex-shrink-0 mt-0.5 text-[12px]" style={{ color: titleColor }}>▶</span>
            <p className="text-slate-300 text-[13px] leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Day 1 Data ─────────────────────────────────────────────────────────────────

const D1: { no: number; title: string; scripture: string; questions: Q[] }[] = [
  {
    no: 1,
    title: "어두운 시대 속에서 말씀으로 기준 세우기",
    scripture: "창세기 5:21, 유다서 1:14-15",
    questions: [
      { q: "에녹이 살던 시대가 부패했다는 사실은 오늘 우리가 사는 시대와 어떤 점에서 비슷하다고 생각합니까?" },
      { q: "요즘 청년들이 하나님의 말씀보다 더 쉽게 영향을 받는 것은 무엇입니까?", hint: "SNS, 유튜브, 친구들의 생각, 세상의 성공 기준, 연애관, 돈, 자기감정, AI의 답변 등" },
      { q: "나는 요즘 중요한 결정을 할 때 무엇을 가장 많이 의지하고 기준으로 삼고 있습니까?" },
      { q: "내 삶 속에서 하나님의 말씀과 세상의 기준이 충돌하는 영역은 어디입니까?" },
      { q: '"하나님의 말씀을 믿는다"는 것은 단순히 성경 지식을 아는 것과 어떻게 다르다고 생각합니까?' },
    ],
  },
  {
    no: 2,
    title: "일상에서 끊임없이 주님과 보폭 맞추기",
    scripture: "창세기 5:22",
    questions: [
      { q: '"하나님과 동행한다"는 말을 들을 때 가장 먼저 떠오르는 이미지는 무엇입니까?' },
      { q: "하나님과 동행하는 삶은 교회 안에서만 가능한 것입니까? 학교, 직장, 군대, 가정, 연애, 친구관계 속에서는 어떻게 나타날 수 있습니까?" },
      { q: "에녹은 삼백 년을 동행했습니다. 우리는 왜 신앙생활을 오래 지속하는 것을 어려워할까요?" },
      { q: '수련회 때는 가슴이 뜨겁지만 일상으로 돌아가면 "매일의 행동"이 약한 이유는 무엇이라고 생각합니까?' },
      { q: "나의 일상 중에서 하나님과 동행하기 가장 어려운 영역은 어디입니까?", hint: "시간 사용, 스마트폰, 정욕, 인간관계, 진로 불안, 돈, 예배 태도, 말씀 묵상, 기도 생활" },
      { q: "하나님과 동행하기 위해 내가 멈추어야 할 습관은 무엇입니까?" },
    ],
  },
  {
    no: 3,
    title: "하나님을 기쁘시게 하는 마음",
    scripture: "히브리서 11:5-6",
    questions: [
      { q: "요즘 청년들이 가장 기쁘게 하고 싶어 하는 대상은 누구 또는 무엇입니까?", hint: "부모님, 친구, 연인, 교수, 상사, 사람들의 시선, 자기만족, SNS 반응" },
      { q: "하나님을 기쁘시게 하는 선택과 나를 편하게 하는 선택이 충돌했던 경험이 있습니까?" },
      { q: "나는 사람의 인정과 하나님의 기쁨 중 어느 쪽에 더 민감하게 반응하고 있으며, 하나님의 기쁨을 더 중요하게 여겨야 할 영역은 무엇입니까?" },
    ],
  },
  {
    no: 4,
    title: "영원의 관점으로 오늘을 바라보기",
    scripture: "창세기 5:24",
    questions: [
      { q: '창세기 5장에 반복되는 "죽었더라"라는 말 속에서 청년의 때에 죽음, 영생, 천국 소망을 생각하는 것이 왜 필요할까요?' },
      { q: "내가 요즘 가장 많이 붙잡고 있는 소망은 무엇입니까?", hint: "취업, 결혼, 돈, 안정, 성공, 인정, 건강, 자기계발, 행복" },
      { q: "천국 소망이 분명한 사람은 오늘의 삶을 어떻게 다르게 살아갈까요?" },
      { q: "하나님 없이 성공하는 인생과 하나님과 동행하는 인생은 어떤 차이가 있을까요?" },
      { q: "내 인생의 마지막을 생각할 때, 지금의 삶에서 바꾸어야 할 방향은 무엇입니까?" },
      { q: "하나님이 나를 데려가시는 그날, 나는 어떤 사람으로 기억되고 싶습니까?" },
    ],
  },
];

const D1_PRAYER = [
  "하나님의 말씀을 내 삶의 기준으로 믿게 해달라고 기도합시다.",
  "수련회 때만 뜨거운 신앙이 아니라, 일상 속에서 하나님과 동행하는 믿음을 달라고 기도합시다.",
  "사람의 시선보다 하나님을 기쁘시게 하는 청년이 되게 해달라고 기도합시다.",
  "세상의 성공보다 천국 소망을 붙들고 살아가는 믿음을 달라고 기도합시다.",
  "우리 청년부가 함께 하나님과 동행하는 공동체가 되게 해달라고 기도합시다.",
];

// ─── Day 2 Data ─────────────────────────────────────────────────────────────────

const D2_PROMISES = [
  "서로의 경험을 정죄하거나 비교하지 않고, 먼저 존중하며 듣습니다.",
  "편리함을 무조건 죄로 여기지 않되, 무분별한 사용도 가볍게 합리화하지 않습니다.",
  "조언보다 경청을 먼저 하고, 각자의 자리에서 하나님께 순종할 한 걸음을 함께 찾습니다.",
];

const D2: { no: number; title: string; scripture: string; questions: Q[] }[] = [
  {
    no: 1,
    title: "AI는 도구인가, 주인인가",
    scripture: "창세기 1:28, 야고보서 1:17, 고린도전서 10:31",
    questions: [
      { q: "AI를 쓰면서 감사보다 죄책감이나 두려움이 앞섰던 경험이 있나요?" },
      { q: "내가 AI를 '도구'로 쓰는 순간과, AI가 나를 '주인처럼' 끌고 가는 순간은 어떻게 다를까요?" },
      { q: "AI로 아낀 시간과 능력을 하나님 나라와 이웃 사랑에 어떻게 다시 드릴 수 있을까요?" },
    ],
  },
  {
    no: 2,
    title: "나의 가치는 어디에 있는가?",
    scripture: "시편 139:14, 창세기 1:27, 베드로전서 1:18-19",
    questions: [
      { q: "AI 때문에 내 전공·직업·재능·사역이 작아 보인 적이 있나요?" },
      { q: "나는 내 가치를 무엇으로 증명하려 하나요?", hint: "성적, 연봉, 생산성, 인정, 사역 성과 등" },
      { q: "'나는 하나님의 형상으로 지음받은 사람'이라는 진리가 내 불안을 어떻게 다르게 보게 합니까?" },
    ],
  },
  {
    no: 3,
    title: "빠른 답의 시대, 더딘 신앙",
    scripture: "시편 1:2, 요한복음 15:4-5, 갈라디아서 6:9",
    questions: [
      { q: "나는 성경을 직접 읽기보다 요약이나 해설을 먼저 찾는 습관이 있나요?" },
      { q: "기도와 묵상이 느리게 느껴질 때, 나는 어떤 방식으로 도망가나요?" },
      { q: "AI가 신앙에 좋은 도구가 되려면, 어떤 순서와 경계가 필요할까요?" },
    ],
  },
  {
    no: 4,
    title: "AI에게 맡길 수 없는 것",
    scripture: "로마서 12:1-2, 로마서 14:5, 히브리서 4:13",
    questions: [
      { q: "AI가 써준 기도문을 그대로 읽는 것과, 내 마음으로 하나님께 기도하는 것은 무엇이 다를까요?" },
      { q: "어디까지가 '도구 활용'이고, 어디부터가 '신앙의 외주화'일까요?" },
      { q: "내가 하나님 앞에서 직접 씨름해야 하는데 피하고 있는 영역은 무엇인가요?" },
    ],
  },
];

const D2_PRAYER = [
  "문명의 도구를 주신 하나님께 감사하며, 그 도구가 우리를 이끌지 않고 우리가 믿음으로 선하게 다스리게 하소서.",
  "빠른 답과 편리함에 마음을 빼앗기지 않고, 말씀 앞에 머물며 기도와 회개의 길을 사랑하게 하소서.",
  "AI가 대신할 수 없는 복음의 기쁨, 공동체의 돌봄, 사랑의 수고를 끝까지 붙들게 하소서.",
  "청년인 우리가 AI 시대에도 하나님과 동행하며, 각자의 자리에서 소금과 빛으로 살게 하소서.",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CellPage() {
  const [tab, setTab] = useState<"day1" | "day2">("day1");

  function switchTab(t: "day1" | "day2") {
    setTab(t);
    window.scrollTo(0, 0);
  }

  return (
    <main className="min-h-screen bg-navy flex flex-col pb-nav max-w-[430px] mx-auto">
      {/* Sticky header + tab bar */}
      <div className="sticky top-0 z-10 bg-navy" style={{ borderBottom: "1px solid #1c2e58" }}>
        <div className="px-5 pt-safe">
          <div className="h-14 flex items-center gap-3">
            <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-navy-mid transition-colors flex-shrink-0">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-white text-lg font-bold leading-tight">셀모임 자료</h1>
              <p className="text-slate-500 text-xs">AI 시대에도 하나님과 동행하기</p>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div className="px-5 pb-3">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#0b1838" }}>
            {(["day1", "day2"] as const).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className="flex-1 py-2.5 rounded-lg transition-all duration-150 flex flex-col items-center gap-0.5"
                  style={active ? { background: "#e9b94a" } : {}}
                >
                  <span className={`text-sm font-bold ${active ? "text-navy" : "text-slate-400"}`}>
                    {t === "day1" ? "1일차" : "2일차"}
                  </span>
                  <span className={`text-[10px] ${active ? "text-navy/60" : "text-slate-600"}`}>
                    {t === "day1" ? "7.30 목요일" : "7.31 금요일"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-4 pb-6 space-y-3">
        {tab === "day1" ? (
          <>
            {/* Info chip */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(233,185,74,0.06)", border: "1px solid rgba(233,185,74,0.15)" }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[11px]" style={{ color: "rgba(233,185,74,0.65)" }}>
                첫째 날 셀모임 · 목요일 19:30 · 조별 나눔 (연령대별)
              </p>
            </div>

            {D1.map((s) => <SectionCard key={s.no} {...s} />)}

            <PrayerCard title="함께 기도할 제목" items={D1_PRAYER} />
          </>
        ) : (
          <>
            {/* Info chip */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(233,185,74,0.06)", border: "1px solid rgba(233,185,74,0.15)" }}>
              <svg className="w-3.5 h-3.5 flex-shrink-0 text-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[11px]" style={{ color: "rgba(233,185,74,0.65)" }}>
                둘째 날 셀모임 · 금요일 19:30 · 조별 나눔 (연령대별)
              </p>
            </div>

            {/* Workbook title */}
            <div className="rounded-2xl px-4 py-4" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
              <p className="text-[10px] font-semibold tracking-wide mb-1.5" style={{ color: "rgba(233,185,74,0.7)" }}>워크북 주제</p>
              <p className="text-white text-sm font-bold leading-snug">
                「문명에 대한 그리스도인의 이해」를 삶으로 나누는 워크북
              </p>
            </div>

            {/* Preamble + 약속 */}
            <div className="rounded-2xl px-4 py-4" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
              <div>
                <p className="text-[11px] font-semibold mb-2" style={{ color: "rgba(233,185,74,0.65)" }}>▶ 셀 모임 전에</p>
                <p className="text-slate-300 text-[13px] leading-relaxed">
                  AI를 단순히 "좋다/나쁘다"로 판단하기보다, 크리스천 청년으로서 신앙의 눈으로 분별하도록 돕습니다.
                  특강의 핵심을 삶의 언어로 바꾸어 셀 안에서 정직하게 질문하고 함께 적용하도록 돕습니다.
                </p>
                <p className="text-slate-300 text-[13px] leading-relaxed mt-2">
                  정답 발표가 아니라 "하나님 앞에서 나는 어떻게 사용할 것인가?"를 세우는 시간이 됩니다.
                  멋진 답보다 솔직한 한 줄이 더 귀합니다. 떠오르는 생각과 질문과 결심을 자유롭게 나누고,
                  하나님께 더 가까이 가는 계기가 되기를 바랍니다.
                </p>
              </div>
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid #1c2e58" }}>
                <p className="text-[11px] font-semibold mb-3" style={{ color: "rgba(233,185,74,0.65)" }}>▶ 셀 나눔 약속</p>
                <div className="space-y-3">
                  {D2_PROMISES.map((p, i) => (
                    <div key={i} className="flex gap-2.5">
                      <span className="text-slate-400 text-[13px] font-bold flex-shrink-0 w-6">
                        {["하나.", "둘.", "셋."][i]}
                      </span>
                      <p className="text-slate-300 text-[13px] leading-relaxed">{p}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {D2.map((s) => <SectionCard key={s.no} {...s} />)}

            {/* 나의 결단 */}
            <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#c4b5fd" }}>
                수련회 — 나의 결단
              </p>
              <p className="text-slate-300 text-[13px] leading-relaxed">
                하나님 앞에서 더 미루지 않을 결단 한 가지를 나누십시오.
                오늘 순종할 첫 걸음을 분명히 정하십시오.
              </p>
            </div>

            <PrayerCard title="마무리 — 함께 기도" items={D2_PRAYER} emerald />
          </>
        )}
      </div>
    </main>
  );
}
