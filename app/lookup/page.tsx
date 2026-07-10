"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "keysin2026_profile";

type Profile = {
  church_name: string;
  name: string;
  birth_year: number;
  attendee_id?: string;
};

type PageMode = "init" | "auto-loading" | "form";

export default function LookupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>("init");
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null);

  const [churches, setChurches] = useState<string[]>([]);
  const [churchesLoading, setChurchesLoading] = useState(true);

  const [churchName, setChurchName] = useState("");
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let profile: Profile | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) profile = JSON.parse(raw) as Profile;
    } catch {
      profile = null;
    }

    if (profile?.attendee_id) {
      router.replace(`/me?id=${profile.attendee_id}`);
      return;
    }

    if (profile) {
      setSavedProfile(profile);
      setMode("auto-loading");

      fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          church_name: profile.church_name,
          name: profile.name,
          birth_year: profile.birth_year,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok || data.error) {
            localStorage.removeItem(STORAGE_KEY);
            setSavedProfile(null);
            setMode("form");
            return;
          }
          const updated: Profile = { ...profile!, attendee_id: data.attendee.id };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          router.replace(`/me?id=${data.attendee.id}`);
        })
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          setSavedProfile(null);
          setMode("form");
        });
    } else {
      setMode("form");
    }
  }, [router]);

  useEffect(() => {
    if (mode !== "form") return;
    fetch("/api/lookup")
      .then((r) => r.json())
      .then((d) => setChurches(d.churches ?? []))
      .catch(() => setChurches([]))
      .finally(() => setChurchesLoading(false));
  }, [mode]);

  const handleClearAndShowForm = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedProfile(null);
    setMode("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!churchName) { setError("소속 교회를 선택해 주세요."); return; }
    if (!name.trim()) { setError("이름을 입력해 주세요."); return; }
    if (!birthYear || birthYear.length !== 4) { setError("생년 4자리를 정확히 입력해 주세요. (예: 1998)"); return; }

    const yearNum = parseInt(birthYear);
    if (isNaN(yearNum) || yearNum < 1940 || yearNum > 2015) { setError("올바른 생년을 입력해 주세요."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ church_name: churchName, name: name.trim(), birth_year: yearNum }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "참가자 정보를 찾을 수 없습니다. 입력 내용을 확인해 주세요.");
        setLoading(false);
        return;
      }
      const profile: Profile = {
        church_name: churchName,
        name: name.trim(),
        birth_year: yearNum,
        attendee_id: data.attendee.id,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      router.push(`/me?id=${data.attendee.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  };

  const inputStyle = (filled: boolean) => ({
    background: "#0b1838",
    border: `1px solid ${filled ? "#e9b94a" : "#1c2e58"}`,
  });

  if (mode === "init") return null;

  if (mode === "auto-loading" && savedProfile) {
    return (
      <main className="min-h-screen bg-navy flex flex-col items-center justify-center pb-nav max-w-[430px] mx-auto px-5">
        <div className="flex flex-col items-center gap-5">
          <svg className="w-10 h-10 text-gold animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-400 text-sm">저장된 정보로 조회 중...</p>
          <p className="text-white text-lg font-semibold">{savedProfile.name}</p>
        </div>
        <button
          onClick={handleClearAndShowForm}
          className="absolute bottom-24 text-slate-500 text-xs underline underline-offset-2"
        >
          다른 정보로 조회
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy flex flex-col pb-nav max-w-[430px] mx-auto">
      <header className="px-5 pt-safe">
        <div className="h-14 flex items-center">
          <h1 className="text-white text-lg font-semibold tracking-tight">내 조 확인</h1>
        </div>
      </header>

      <div className="flex-1 px-5 pt-1">
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          소속 교회, 이름, 생년을 입력하면 조편성 결과를 확인할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">소속 교회</label>
            <div className="relative">
              {churchesLoading ? (
                <div
                  className="w-full rounded-xl px-4 py-[14px] flex items-center gap-2"
                  style={inputStyle(false)}
                >
                  <svg className="w-4 h-4 text-slate-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-slate-500 text-sm">교회 목록 불러오는 중...</span>
                </div>
              ) : (
                <>
                  <select
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    className="w-full appearance-none rounded-xl px-4 py-[14px] pr-10 text-white focus:outline-none transition-colors"
                    style={inputStyle(!!churchName)}
                    required
                  >
                    <option value="" className="bg-[#0b1838]">교회 선택</option>
                    {churches.map((c) => (
                      <option key={c} value={c} className="bg-[#0b1838]">{c}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해 주세요"
              autoComplete="name"
              className="w-full rounded-xl px-4 py-[14px] text-white placeholder-slate-600 focus:outline-none transition-colors"
              style={inputStyle(!!name)}
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              생년
              <span className="text-slate-500 font-normal text-xs ml-1.5">· 4자리 연도</span>
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
              style={inputStyle(birthYear.length === 4)}
              required
            />
          </div>

          {error && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 text-sm leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || churchesLoading}
            className="w-full bg-gold text-navy font-bold py-[15px] rounded-2xl text-[15px] mt-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                확인 중...
              </span>
            ) : "내 조 확인하기"}
          </button>
        </form>

        <p className="text-slate-600 text-xs text-center mt-6">
          조편성 완료 전에는 결과가 표시되지 않을 수 있습니다.
        </p>
      </div>
    </main>
  );
}
