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

  if (mode === "not-found" && savedProfile) {
    return (
      <main className="bg-navy flex flex-col pb-nav max-w-[430px] mx-auto" style={{ minHeight: "100dvh" }}>
        <header className="px-5 pt-safe">
          <div className="h-14 flex items-center">
            <h1 className="text-white text-lg font-semibold tracking-tight">내 조 확인</h1>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-900/20 border border-red-700/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-white font-semibold text-lg mb-1">참가자 정보를 찾을 수 없어요</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              {savedProfile.church_name} · {savedProfile.name}
              <br />등록된 참가자 정보와 일치하지 않습니다.
            </p>
          </div>
          <Link
            href="/venues"
            className="w-full flex items-center justify-center gap-2 bg-gold text-navy font-bold py-[15px] rounded-2xl text-[15px] active:scale-95 transition-transform"
          >
            내 정보 수정하기
          </Link>
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
