"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "keysin2026_profile";

interface Profile {
  church_name: string;
  name: string;
  birth_year: number;
}

export default function VenuesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [churches, setChurches] = useState<string[]>([]);
  const [churchesLoading, setChurchesLoading] = useState(true);
  const [churchName, setChurchName] = useState("");
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Profile = JSON.parse(raw);
        setProfile(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!profile || editMode) {
      setChurchesLoading(true);
      fetch("/api/lookup")
        .then((r) => r.json())
        .then((d) => setChurches(d.churches ?? []))
        .catch(() => setChurches([]))
        .finally(() => setChurchesLoading(false));
    }
  }, [profile, editMode]);

  const inputStyle = (filled: boolean) => ({
    background: "#0b1838",
    border: `1px solid ${filled ? "#e9b94a" : "#1c2e58"}`,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!churchName) { setError("소속 교회를 선택해 주세요."); return; }
    if (!name.trim()) { setError("이름을 입력해 주세요."); return; }
    if (!birthYear || birthYear.length !== 4) { setError("생년 4자리를 정확히 입력해 주세요. (예: 1998)"); return; }

    const yearNum = parseInt(birthYear);
    if (isNaN(yearNum) || yearNum < 1940 || yearNum > 2015) { setError("올바른 생년을 입력해 주세요."); return; }

    const newProfile: Profile = { church_name: churchName, name: name.trim(), birth_year: yearNum };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    setProfile(newProfile);
    setEditMode(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleEditMode = () => {
    if (profile) {
      setChurchName(profile.church_name);
      setName(profile.name);
      setBirthYear(String(profile.birth_year));
    }
    setError("");
    setEditMode(true);
  };

  const showForm = !profile || editMode;

  return (
    <main className="min-h-screen bg-navy flex flex-col pb-nav max-w-[430px] mx-auto">
      <header className="px-5 pt-safe">
        <div className="h-14 flex items-center">
          <h1 className="text-white text-lg font-semibold tracking-tight">내 정보</h1>
        </div>
      </header>

      <div className="flex-1 px-5 pt-1">
        {saved && (
          <div
            className="rounded-xl px-4 py-3 mb-5 flex items-center gap-3"
            style={{ background: "rgba(233,185,74,0.10)", border: "1px solid rgba(233,185,74,0.3)" }}
          >
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#e9b94a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium" style={{ color: "#e9b94a" }}>저장되었습니다</p>
          </div>
        )}

        {!showForm && profile ? (
          <div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              저장된 내 정보입니다.
            </p>
            <div
              className="rounded-xl px-5 py-5 space-y-4 mb-6"
              style={{ background: "#0b1838", border: "1px solid #1c2e58" }}
            >
              <div>
                <p className="text-slate-500 text-xs font-medium mb-1">소속 교회</p>
                <p className="text-white text-base font-semibold">{profile.church_name}</p>
              </div>
              <div className="border-t" style={{ borderColor: "#1c2e58" }} />
              <div>
                <p className="text-slate-500 text-xs font-medium mb-1">이름</p>
                <p className="text-white text-base font-semibold">{profile.name}</p>
              </div>
              <div className="border-t" style={{ borderColor: "#1c2e58" }} />
              <div>
                <p className="text-slate-500 text-xs font-medium mb-1">생년</p>
                <p className="text-white text-base font-semibold font-mono">{profile.birth_year}년</p>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href="/lookup"
                className="w-full flex items-center justify-center font-bold py-[15px] rounded-2xl text-[15px] active:scale-95 transition-transform"
                style={{ background: "#e9b94a", color: "#0b1838" }}
              >
                내 조 확인
              </Link>
              <button
                onClick={handleEditMode}
                className="w-full font-semibold py-[14px] rounded-2xl text-[15px] active:scale-95 transition-transform"
                style={{ background: "#0b1838", border: "1px solid #1c2e58", color: "#94a3b8" }}
              >
                정보 수정
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              소속 교회, 이름, 생년을 저장해 두면 다음에 빠르게 조편성을 확인할 수 있습니다.
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
                disabled={churchesLoading}
                className="w-full font-bold py-[15px] rounded-2xl text-[15px] mt-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                style={{ background: "#e9b94a", color: "#0b1838" }}
              >
                저장
              </button>

              {editMode && (
                <button
                  type="button"
                  onClick={() => { setEditMode(false); setError(""); }}
                  className="w-full font-semibold py-[14px] rounded-2xl text-[15px] active:scale-95 transition-transform"
                  style={{ background: "#0b1838", border: "1px solid #1c2e58", color: "#94a3b8" }}
                >
                  취소
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
