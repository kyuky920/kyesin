import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-navy flex flex-col pb-nav max-w-[430px] mx-auto" style={{ minHeight: "100dvh" }}>
      {/* Logo — fills width, background blends with page */}
      <section className="w-full pt-safe">
        <Image
          src="/logo.jpeg"
          alt="WALK WITH HIM — 2026 계신 청년 하계수련회"
          width={724}
          height={402}
          priority
          className="w-full h-auto"
          style={{ display: "block" }}
        />
      </section>

      {/* Divider */}
      <div className="mx-6 h-px" style={{ background: "#1c2e58" }} />

      {/* Content */}
      <section className="flex-1 flex flex-col px-6 pt-7 pb-4">
        {/* Event label */}
        <p className="text-center text-[11px] tracking-[0.28em] uppercase text-slate-400 mb-6">
          2026 계신 청년 하계수련회
        </p>

        {/* Scripture */}
        <div
          className="rounded-2xl px-5 py-4 mb-6"
          style={{ background: "#0b1838", border: "1px solid #1c2e58" }}
        >
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-gold mb-2">
            창세기 5:24
          </p>
          <p className="text-slate-300 text-sm leading-relaxed italic">
            &ldquo;에녹은 하나님과 동행하더니 하나님이 그를 데려가시므로
            세상에 있지 아니하였더라&rdquo;
          </p>
        </div>

        {/* Event meta */}
        <div className="flex items-center justify-center gap-4 mb-8 text-[12px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gold/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            7.30 — 8.01
          </span>
          <span className="text-navy-border">·</span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gold/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            명륜교회
          </span>
          <span className="text-navy-border">·</span>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-gold/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            136명
          </span>
        </div>

        {/* CTAs */}
        <div className="space-y-3 mt-auto">
          <Link
            href="/lookup"
            className="flex items-center justify-center gap-2 w-full bg-gold text-navy font-bold py-[15px] rounded-2xl text-[15px] tracking-wide active:scale-95 transition-transform shadow-gold-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            셀조 확인하기
          </Link>
          <Link
            href="/schedule"
            className="flex items-center justify-center gap-2 w-full py-[14px] rounded-2xl text-[15px] font-medium text-slate-300 active:scale-95 transition-transform"
            style={{ border: "1px solid #1c2e58" }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            수련회 일정 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
