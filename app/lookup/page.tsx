"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CHURCHES = [
  "가락동부교회",
  "가락성도교회",
  "광흥교회",
  "기독교대한감리회",
  "명륜교회",
  "목양교회",
  "분당우리교회",
  "성락교회",
  "온누리교회",
  "우리교회",
  "은혜교회",
  "이룸교회",
  "장위교회",
  "중앙교회",
  "초월제일교회",
  "평강교회",
  "하늘비전교회",
  "한국교회",
  "기타",
];

export default function LookupPage() {
  const router = useRouter();
  const [churchName, setChurchName] = useState("");
  const [customChurch, setCustomChurch] = useState("");
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const church = churchName === "기타" ? customChurch.trim() : churchName;

    if (!church) {
      setError("소속 교회를 선택해 주세요.");
      return;
    }
    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (!birthYear || birthYear.length !== 4) {
      setError("생년 4자리를 정확히 입력해 주세요. (예: 1998)");
      return;
    }

    const yearNum = parseInt(birthYear);
    if (isNaN(yearNum) || yearNum < 1985 || yearNum > 2015) {
      setError("올바른 생년을 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          church_name: church,
          name: name.trim(),
          birth_year: yearNum,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "참가자 정보를 찾을 수 없습니다. 입력 내용을 확인해 주세요.");
        setLoading(false);
        return;
      }

      router.push(`/me?id=${data.attendee.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-navy flex flex-col pb-nav max-w-[430px] mx-auto">
      {/* Header */}
      <header className="px-5 pt-safe">
        <div className="h-14 flex items-center">
          <h1 className="text-white text-lg font-bold">내 조 확인</h1>
        </div>
      </header>

      <div className="flex-1 px-5 pt-2">
        {/* Description */}
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          소속 교회, 이름, 생년을 입력하면 내 조편성 결과를 확인할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Church */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              소속 교회
            </label>
            <div className="relative">
              <select
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                className="w-full appearance-none rounded-xl px-4 py-[14px] pr-10 text-white focus:outline-none transition-colors"
                style={{
                  background: "#0b1529",
                  border: `1px solid ${churchName ? "#e9b94a" : "#1a2d4a"}`,
                }}
                required
              >
                <option value="" className="bg-[#0b1529]">교회 선택</option>
                {CHURCHES.map((c) => (
                  <option key={c} value={c} className="bg-[#0b1529]">{c}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Custom church */}
          {churchName === "기타" && (
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-2">
                교회명 직접 입력
              </label>
              <input
                type="text"
                value={customChurch}
                onChange={(e) => setCustomChurch(e.target.value)}
                placeholder="교회명을 입력해 주세요"
                className="w-full rounded-xl px-4 py-[14px] text-white placeholder-slate-600 focus:outline-none transition-colors"
                style={{
                  background: "#0b1529",
                  border: `1px solid ${customChurch ? "#e9b94a" : "#1a2d4a"}`,
                }}
                required
              />
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해 주세요"
              autoComplete="name"
              className="w-full rounded-xl px-4 py-[14px] text-white placeholder-slate-600 focus:outline-none transition-colors"
              style={{
                background: "#0b1529",
                border: `1px solid ${name ? "#e9b94a" : "#1a2d4a"}`,
              }}
              required
            />
          </div>

          {/* Birth Year */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              생년 <span className="text-slate-500 font-normal text-xs">· 4자리 연도</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={birthYear}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setBirthYear(v);
              }}
              placeholder="예: 1998"
              maxLength={4}
              className="w-full rounded-xl px-4 py-[14px] text-white placeholder-slate-600 focus:outline-none transition-colors font-mono tracking-widest"
              style={{
                background: "#0b1529",
                border: `1px solid ${birthYear.length === 4 ? "#e9b94a" : "#1a2d4a"}`,
              }}
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-3 animate-fade-in"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 text-sm leading-relaxed">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-navy font-bold py-4 rounded-2xl text-[15px] mt-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform shadow-gold-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                확인 중...
              </span>
            ) : (
              "내 조 확인하기"
            )}
          </button>
        </form>

        <p className="text-slate-600 text-xs text-center mt-6">
          조편성 완료 전에는 결과가 표시되지 않을 수 있습니다.
        </p>
      </div>
    </main>
  );
}
