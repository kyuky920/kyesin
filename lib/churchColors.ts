export type ChurchColor = {
  dot: string;      // 컬러 원 색상
  text: string;     // 교회명 텍스트 색상
  bg: string;       // 배지 배경
  border: string;   // 배지 테두리
};

export const CHURCH_COLORS: Record<string, ChurchColor> = {
  "가락동부교회": { dot: "#f59e0b", text: "#fde68a", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.30)" },
  "광흥교회":    { dot: "#3b82f6", text: "#93c5fd", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.30)"  },
  "덕평교회":    { dot: "#84cc16", text: "#bef264", bg: "rgba(132,204,22,0.12)", border: "rgba(132,204,22,0.30)" },
  "도봉교회":    { dot: "#10b981", text: "#6ee7b7", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.30)"  },
  "명륜교회":    { dot: "#8b5cf6", text: "#c4b5fd", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.30)"  },
  "상대원교회":  { dot: "#ec4899", text: "#f9a8d4", bg: "rgba(236,72,153,0.12)",  border: "rgba(236,72,153,0.30)"  },
  "서광교회":    { dot: "#eab308", text: "#fef08a", bg: "rgba(234,179,8,0.12)",   border: "rgba(234,179,8,0.30)"   },
  "성산교회":    { dot: "#f97316", text: "#fdba74", bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.30)"  },
  "송탄북부교회": { dot: "#06b6d4", text: "#67e8f9", bg: "rgba(6,182,212,0.12)",  border: "rgba(6,182,212,0.30)"  },
  "안산북부교회": { dot: "#ef4444", text: "#fca5a5", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.30)"  },
  "초월제일교회": { dot: "#14b8a6", text: "#5eead4", bg: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.30)" },
  "평강교회":    { dot: "#6366f1", text: "#a5b4fc", bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.30)"  },
};

export const DEFAULT_CHURCH_COLOR: ChurchColor = {
  dot: "#64748b", text: "#94a3b8", bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.30)",
};

export function getChurchColor(name: string | null | undefined): ChurchColor {
  if (!name) return DEFAULT_CHURCH_COLOR;
  return CHURCH_COLORS[name] ?? DEFAULT_CHURCH_COLOR;
}
