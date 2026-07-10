import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { Venue } from "@/types";

const MOCK_VENUES: Venue[] = [
  { id: "v1", retreat_id: "2026", name: "본당", type: "worship", description: "수련회 주요 예배 및 강의가 진행되는 메인 공간. 전체 집회, 찬양 예배, 개/폐회 예배.", capacity: 300, floor: "2층", building: "본관" },
  { id: "v2", retreat_id: "2026", name: "식당", type: "dining", description: "아침, 점심, 저녁 식사가 제공되는 공간. 식사 시간표에 맞춰 이용해 주세요.", capacity: 150, floor: "1층", building: "별관" },
  { id: "v3", retreat_id: "2026", name: "숙소 (남)", type: "accommodation_male", description: "남성 참가자 숙소. 지정 방 배정 확인 후 이용 바랍니다. 취침 시간 이후 정숙.", floor: "3층", building: "생활관" },
  { id: "v4", retreat_id: "2026", name: "숙소 (여)", type: "accommodation_female", description: "여성 참가자 숙소. 지정 방 배정 확인 후 이용 바랍니다. 취침 시간 이후 정숙.", floor: "4층", building: "생활관" },
  { id: "v5", retreat_id: "2026", name: "조별나눔실", type: "group_room", description: "조별 나눔 시간에 활용하는 소그룹 방. 조 배정에 따라 지정된 나눔실을 이용합니다.", floor: "2층", building: "교육관" },
  { id: "v6", retreat_id: "2026", name: "외부활동공간", type: "outdoor", description: "야외 조별 활동이 진행되는 공간. 운동장 및 야외 정원을 활용합니다.", building: "야외" },
];

type VenueConfig = {
  emoji: string;
  label: string;
  accent: string;
  bg: string;
  border: string;
};

const VENUE_CFG: Record<string, VenueConfig> = {
  worship:             { emoji: "⛪", label: "예배 공간",  accent: "text-purple-300", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
  dining:              { emoji: "🍽️", label: "식사 공간",  accent: "text-orange-300", bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.2)" },
  accommodation_male:  { emoji: "🛏️", label: "숙소 (남)",  accent: "text-blue-300",   bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.2)" },
  accommodation_female:{ emoji: "🛏️", label: "숙소 (여)",  accent: "text-pink-300",   bg: "rgba(236,72,153,0.08)",  border: "rgba(236,72,153,0.2)" },
  group_room:          { emoji: "💬", label: "조별 나눔실", accent: "text-green-300",  bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.2)" },
  outdoor:             { emoji: "🌿", label: "외부 활동",  accent: "text-yellow-300", bg: "rgba(234,179,8,0.08)",   border: "rgba(234,179,8,0.2)" },
};

const DEFAULT_CFG: VenueConfig = {
  emoji: "📍", label: "공간", accent: "text-slate-300",
  bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)",
};

export default async function VenuesPage() {
  let venues: Venue[] = MOCK_VENUES;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("venues").select("*").order("type");
    if (!error && data && data.length > 0) {
      venues = data as Venue[];
    }
  } catch {
    // fallback to mock
  }

  return (
    <main className="min-h-screen bg-navy flex flex-col pb-nav max-w-[430px] mx-auto">
      {/* Header */}
      <header className="px-5 pt-safe">
        <div className="h-14 flex items-center justify-between">
          <h1 className="text-white text-lg font-bold">장소 안내</h1>
          <span className="text-slate-500 text-xs">명륜교회</span>
        </div>
      </header>

      <div className="flex-1 px-4 pt-2 space-y-3">
        {venues.map((venue) => {
          const cfg = VENUE_CFG[venue.type] ?? DEFAULT_CFG;
          return (
            <div
              key={venue.id}
              className="rounded-2xl px-4 py-4"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
            >
              <div className="flex items-start gap-3">
                {/* Emoji icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {cfg.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-white font-bold text-base">{venue.name}</h2>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.accent}`}
                      style={{ background: "rgba(255,255,255,0.06)" }}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* Description */}
                  {venue.description && (
                    <p className="text-slate-400 text-sm leading-relaxed mb-3">
                      {venue.description}
                    </p>
                  )}

                  {/* Meta chips */}
                  <div className="flex flex-wrap gap-2">
                    {venue.building && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                        </svg>
                        {venue.building}
                      </span>
                    )}
                    {venue.floor && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                        </svg>
                        {venue.floor}
                      </span>
                    )}
                    {venue.capacity && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857" />
                        </svg>
                        최대 {venue.capacity}명
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Note */}
        <div
          className="rounded-2xl px-4 py-3 flex items-start gap-3"
          style={{ background: "#0b1838", border: "1px solid #1c2e58" }}
        >
          <svg className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-500 text-xs leading-relaxed">
            모든 공간은 수련회 일정에 따라 이용 가능합니다. 지정된 시간 외 이용 시 담당자에게 문의해 주세요.
          </p>
        </div>
      </div>
    </main>
  );
}
