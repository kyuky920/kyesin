import Link from "next/link";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AccessRow {
  id: string;
  full_name: string;
  gender: "male" | "female";
  birth_year: number;
  is_staff: boolean;
  first_viewed_at: string | null;
  churches: { canonical_name: string } | null;
  group_assignments: { retreat_groups: { group_code: string; group_name: string } | null }[];
}

async function getAccessData(): Promise<AccessRow[]> {
  const supabase = createClient();

  const { data: retreat } = await supabase
    .from("retreats").select("id").order("start_date", { ascending: false }).limit(1).single();
  if (!retreat) return [];
  const retreatId = (retreat as { id: string }).id;

  const { data } = await supabase
    .from("attendees")
    .select(`
      id, full_name, gender, birth_year, is_staff, first_viewed_at,
      churches(canonical_name),
      group_assignments(retreat_groups(group_code, group_name))
    `)
    .eq("retreat_id", retreatId)
    .eq("is_staff", false)
    .order("first_viewed_at", { ascending: false, nullsFirst: false });

  return (data ?? []) as unknown as AccessRow[];
}

function formatKST(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

export default async function AccessPage() {
  const rows = await getAccessData();
  const viewed = rows.filter((r) => r.first_viewed_at);
  const notViewed = rows.filter((r) => !r.first_viewed_at);
  const total = rows.length;
  const viewedPct = total > 0 ? Math.round((viewed.length / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-navy flex flex-col max-w-3xl mx-auto">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center gap-4 sticky top-0 bg-navy z-10">
        <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-white font-bold text-lg">접속 현황</h1>
          <p className="text-slate-400 text-xs">내 조 확인 페이지 접속자</p>
        </div>
      </header>

      <div className="px-6 py-5 space-y-6">
        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl px-4 py-4 text-center" style={{ background: "#0b1838", border: "1px solid rgba(233,185,74,0.3)" }}>
            <p className="text-gold text-2xl font-black">{viewed.length}</p>
            <p className="text-slate-400 text-xs mt-0.5">접속함</p>
          </div>
          <div className="rounded-xl px-4 py-4 text-center" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
            <p className="text-slate-300 text-2xl font-black">{notViewed.length}</p>
            <p className="text-slate-400 text-xs mt-0.5">미접속</p>
          </div>
          <div className="rounded-xl px-4 py-4 text-center" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
            <p className="text-white text-2xl font-black">{viewedPct}%</p>
            <p className="text-slate-400 text-xs mt-0.5">접속률</p>
          </div>
        </div>

        {/* 진행 바 */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>접속 현황 ({total}명 중 {viewed.length}명)</span>
            <span>{viewedPct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#0e1e45" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${viewedPct}%`, background: "linear-gradient(90deg, #e9b94a, #f5d07c)" }}
            />
          </div>
        </div>

        {/* 접속자 목록 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-white font-semibold text-sm">접속한 참가자</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(233,185,74,0.15)", color: "#e9b94a", border: "1px solid rgba(233,185,74,0.3)" }}>
              {viewed.length}명
            </span>
          </div>

          {viewed.length === 0 ? (
            <div className="rounded-xl px-4 py-6 text-center text-slate-500 text-sm" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
              아직 접속자가 없습니다.
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(233,185,74,0.2)" }}>
              {viewed.map((r, idx) => {
                const group = r.group_assignments?.[0]?.retreat_groups;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${idx > 0 ? "border-t border-slate-800/60" : ""}`}
                    style={{ background: idx % 2 === 0 ? "#0b1838" : "#0d1c3d" }}
                  >
                    <span className={`flex-shrink-0 text-sm ${r.gender === "male" ? "text-blue-400" : "text-pink-400"}`}>
                      {r.gender === "male" ? "♂" : "♀"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-[13px] font-medium leading-tight">{r.full_name}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">
                        {r.churches?.canonical_name ?? ""}
                        {group ? ` · ${group.group_code}조 ${group.group_name}` : " · 미배정"}
                      </p>
                    </div>
                    <span className="text-gold text-[11px] font-medium flex-shrink-0">
                      {formatKST(r.first_viewed_at!)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 미접속자 목록 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-white font-semibold text-sm">미접속 참가자</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {notViewed.length}명
            </span>
          </div>

          {notViewed.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-emerald-300 text-sm">모든 참가자가 접속했습니다!</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
              {notViewed.map((r, idx) => {
                const group = r.group_assignments?.[0]?.retreat_groups;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${idx > 0 ? "border-t border-slate-800/60" : ""}`}
                  >
                    <span className={`flex-shrink-0 text-sm ${r.gender === "male" ? "text-blue-400/50" : "text-pink-400/50"}`}>
                      {r.gender === "male" ? "♂" : "♀"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-400 text-[13px] leading-tight">{r.full_name}</p>
                      <p className="text-slate-600 text-[10px] mt-0.5">
                        {r.churches?.canonical_name ?? ""}
                        {group ? ` · ${group.group_code}조` : " · 미배정"}
                      </p>
                    </div>
                    <span className="text-slate-700 text-[11px]">미접속</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
