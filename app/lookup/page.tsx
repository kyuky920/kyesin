"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STORAGE_KEY = "keysin2026_profile";

type Profile = {
  church_name: string;
  name: string;
  birth_year: number;
  attendee_id?: string;
};

type PageMode = "init" | "auto-loading" | "no-profile" | "not-found";

export default function LookupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>("init");
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null);

  const [showRegister, setShowRegister] = useState(false);
  const [regGender, setRegGender] = useState<"male" | "female" | "">("");
  const [regDay1, setRegDay1] = useState(false);
  const [regDay2, setRegDay2] = useState(false);
  const [regDay3, setRegDay3] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  useEffect(() => {
    let profile: Profile | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) profile = JSON.parse(raw) as Profile;
    } catch {
      profile = null;
    }

    if (!profile) {
      setMode("no-profile");
      return;
    }

    // attendee_id 이미 저장돼 있으면 즉시 이동
    if (profile.attendee_id) {
      router.replace(`/me?id=${profile.attendee_id}`);
      return;
    }

    // 프로필은 있지만 attendee_id 없음 → API로 조회
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
          setMode("not-found");
          return;
        }
        const updated: Profile = { ...profile!, attendee_id: data.attendee.id };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        router.replace(`/me?id=${data.attendee.id}`);
      })
      .catch(() => setMode("not-found"));
  }, [router]);

  if (mode === "init") return null;

  if (mode === "auto-loading" && savedProfile) {
    return (
      <main className="bg-navy flex flex-col items-center justify-center pb-nav max-w-[430px] mx-auto px-5" style={{ minHeight: "100dvh" }}>
        <div className="flex flex-col items-center gap-5">
          <svg className="w-10 h-10 text-gold animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div className="text-center">
            <p className="text-slate-400 text-sm">저장된 정보로 조회 중...</p>
            <p className="text-white text-lg font-semibold mt-1">{savedProfile.name}</p>
            <p className="text-slate-500 text-xs mt-0.5">{savedProfile.church_name}</p>
          </div>
        </div>
        <Link
          href="/venues"
          className="absolute bottom-28 text-slate-500 text-xs underline underline-offset-2 hover:text-slate-300"
        >
          내 정보 수정하기
        </Link>
      </main>
    );
  }

  const handleRegister = async () => {
    if (!savedProfile || !regGender) {
      setRegError("성별을 선택해 주세요.");
      return;
    }
    if (!regDay1 && !regDay2 && !regDay3) {
      setRegError("참석 일정을 하나 이상 선택해 주세요.");
      return;
    }
    setRegLoading(true);
    setRegError("");
    try {
      const res = await fetch("/api/admin/attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: savedProfile.name,
          gender: regGender,
          birth_year: savedProfile.birth_year,
          church_name: savedProfile.church_name,
          attends_day1: regDay1,
          attends_day2: regDay2,
          attends_day3: regDay3,
        }),
      });
      const data = await res.json() as { success?: boolean; attendee?: { id: string }; error?: string };
      if (!res.ok || data.error) {
        setRegError(data.error ?? "등록에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      const updated: Profile = { ...savedProfile, attendee_id: data.attendee!.id };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      router.replace(`/me?id=${data.attendee!.id}`);
    } catch {
      setRegError("네트워크 오류가 발생했습니다.");
    } finally {
      setRegLoading(false);
    }
  };

  if (mode === "not-found" && savedProfile) {
    return (
      <main className="bg-navy flex flex-col pb-nav max-w-[430px] mx-auto" style={{ minHeight: "100dvh" }}>
        <header className="px-5 pt-safe">
          <div className="h-14 flex items-center">
            <h1 className="text-white text-lg font-semibold tracking-tight">내 조 확인</h1>
          </div>
        </header>
        <div className="flex-1 px-5 pt-4 pb-8 flex flex-col gap-4">
          {/* 못 찾음 안내 */}
          <div className="rounded-2xl px-5 py-5 text-center" style={{ background: "#0b1838", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div className="w-14 h-14 rounded-full bg-red-900/20 border border-red-700/30 flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white font-semibold text-base mb-1">참가자 정보를 찾을 수 없어요</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              {savedProfile.church_name} · {savedProfile.name} · {savedProfile.birth_year}년생
              <br />등록된 참가자 정보와 일치하지 않습니다.
            </p>
          </div>

          {/* 등록 폼 */}
          {!showRegister ? (
            <div className="space-y-2.5">
              <button
                onClick={() => setShowRegister(true)}
                className="w-full flex items-center justify-center gap-2 py-[15px] rounded-2xl text-[15px] font-bold active:scale-95 transition-transform"
                style={{ background: "rgba(233,185,74,0.1)", border: "1px solid rgba(233,185,74,0.4)", color: "#e9b94a" }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                참가자 등록하기
              </button>
              <Link
                href="/venues"
                className="w-full flex items-center justify-center py-[13px] rounded-2xl text-[14px] font-medium text-slate-400 active:scale-95 transition-transform"
                style={{ border: "1px solid #1c2e58" }}
              >
                내 정보 수정하기
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl px-5 py-5 space-y-4" style={{ background: "#0b1838", border: "1px solid rgba(233,185,74,0.3)" }}>
              <p className="text-gold text-sm font-semibold">참가자 등록</p>

              {/* 확인용 정보 */}
              <div className="rounded-xl px-4 py-3 space-y-1" style={{ background: "#0e1e45" }}>
                {[
                  { label: "이름", value: savedProfile.name },
                  { label: "교회", value: savedProfile.church_name },
                  { label: "생년", value: `${savedProfile.birth_year}년생` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-slate-500 text-xs w-8">{label}</span>
                    <span className="text-slate-200 text-sm font-medium">{value}</span>
                  </div>
                ))}
                <p className="text-slate-600 text-[10px] pt-1">정보가 틀리면 아래 취소 후 &apos;내 정보 수정하기&apos;를 눌러주세요.</p>
              </div>

              {/* 성별 */}
              <div>
                <p className="text-slate-400 text-xs mb-2">성별 <span className="text-red-400">*</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setRegGender(g)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                        regGender === g
                          ? g === "male"
                            ? "bg-blue-900/40 border-blue-500/60 text-blue-300"
                            : "bg-pink-900/40 border-pink-500/60 text-pink-300"
                          : "border-slate-700 text-slate-500"
                      }`}
                    >
                      {g === "male" ? "남" : "여"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 참석 일정 */}
              <div>
                <p className="text-slate-400 text-xs mb-2">참석 일정 <span className="text-red-400">*</span></p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "목요일", state: regDay1, set: setRegDay1 },
                    { label: "금요일", state: regDay2, set: setRegDay2 },
                    { label: "토요일", state: regDay3, set: setRegDay3 },
                  ].map(({ label, state, set }) => (
                    <button
                      key={label}
                      onClick={() => set(!state)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                        state
                          ? "bg-gold/10 border-gold/50 text-gold"
                          : "border-slate-700 text-slate-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {regError && (
                <p className="text-red-400 text-xs">{regError}</p>
              )}

              <div className="space-y-2 pt-1">
                <button
                  onClick={handleRegister}
                  disabled={regLoading}
                  className="w-full flex items-center justify-center gap-2 py-[14px] rounded-2xl text-[15px] font-bold bg-gold text-navy active:scale-95 transition-transform disabled:opacity-60"
                >
                  {regLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      등록 중...
                    </>
                  ) : "등록하기"}
                </button>
                <button
                  onClick={() => { setShowRegister(false); setRegError(""); }}
                  className="w-full py-[13px] rounded-2xl text-[14px] text-slate-400 border border-slate-700 active:scale-95 transition-transform"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // no-profile 상태
  return (
    <main className="bg-navy flex flex-col pb-nav max-w-[430px] mx-auto" style={{ minHeight: "100dvh" }}>
      <header className="px-5 pt-safe">
        <div className="h-14 flex items-center">
          <h1 className="text-white text-lg font-semibold tracking-tight">내 조 확인</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">
        {/* 안내 카드 */}
        <div
          className="w-full rounded-2xl px-5 py-6 flex flex-col items-center gap-4 text-center"
          style={{ background: "#0b1838", border: "1px solid #1c2e58" }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(233,185,74,0.1)", border: "1px solid rgba(233,185,74,0.2)" }}>
            <svg className="w-8 h-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-base mb-1">내 정보를 먼저 입력해 주세요</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              교회, 이름, 생년을 입력하면<br />
              조편성 결과를 바로 확인할 수 있어요.
            </p>
          </div>
        </div>

        <Link
          href="/venues"
          className="w-full flex items-center justify-center gap-2 bg-gold text-navy font-bold py-[15px] rounded-2xl text-[15px] active:scale-95 transition-transform shadow-gold-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          내 정보 입력하기
        </Link>
      </div>
    </main>
  );
}
