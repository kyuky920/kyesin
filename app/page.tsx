import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-navy flex flex-col pb-nav max-w-[430px] mx-auto">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        {/* Eyebrow */}
        <span className="text-gold text-xs font-bold tracking-[0.3em] uppercase mb-6">
          2026 청년 하계 연합수련회
        </span>

        {/* Title */}
        <div className="mb-3">
          <h1 className="text-[52px] font-black text-white leading-none tracking-tight">
            WALK
          </h1>
          <h1 className="text-[52px] font-black leading-none tracking-tight text-gold">
            WITH
          </h1>
          <h1 className="text-[52px] font-black text-white leading-none tracking-tight">
            HIM
          </h1>
        </div>

        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          AI시대에도 하나님과 동행하기
        </p>

        {/* Scripture */}
        <div
          className="w-full rounded-2xl px-5 py-4 mb-8 text-left"
          style={{ background: "#0b1529", border: "1px solid #1a2d4a" }}
        >
          <p className="text-gold text-[10px] font-bold tracking-[0.2em] uppercase mb-2">
            창세기 5:24
          </p>
          <p className="text-slate-300 text-sm leading-relaxed italic">
            &ldquo;에녹은 하나님과 동행하더니 하나님이 그를 데려가시므로 세상에 있지 아니하였더라&rdquo;
          </p>
        </div>

        {/* Event meta */}
        <div className="flex items-center justify-center gap-5 mb-10 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>7.30 — 8.01</span>
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>명륜교회</span>
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>136명</span>
          </div>
        </div>

        {/* CTA */}
        <div className="w-full space-y-3">
          <Link
            href="/lookup"
            className="flex items-center justify-center gap-2 w-full bg-gold text-navy font-bold py-4 rounded-2xl text-[15px] shadow-gold-md active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            내 조 확인하기
          </Link>
          <Link
            href="/schedule"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-[15px] font-semibold text-slate-200 active:scale-95 transition-transform"
            style={{ background: "#0b1529", border: "1px solid #1a2d4a" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            수련회 일정 보기
          </Link>
        </div>
      </section>

      {/* Info strip */}
      <section className="px-6 pb-4">
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "#0b1529", border: "1px solid #1a2d4a" }}
        >
          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            조편성 완료 후 <span className="text-slate-200 font-medium">내 조 확인하기</span>에서 본인의 조를 확인할 수 있습니다.
          </p>
        </div>
      </section>
    </main>
  );
}
