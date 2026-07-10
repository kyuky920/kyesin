import Link from "next/link";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { getChurchColor } from "@/lib/churchColors";

interface AttendeeRow {
  id: string;
  full_name: string;
  birth_year: number;
  gender: "male" | "female";
  age?: number;
  churches: { canonical_name: string } | null;
  group_assignments: {
    retreat_groups: { id: string; group_code: number; group_name: string } | null;
  }[];
}

interface MemberRow {
  id: string;
  full_name: string;
  gender: "male" | "female";
  is_leader: boolean;
  churches: { canonical_name: string } | null;
}

async function getAttendee(id: string): Promise<AttendeeRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendees")
    .select(`
      id, full_name, birth_year, gender, age,
      churches(canonical_name),
      group_assignments(
        retreat_groups(id, group_code, group_name)
      )
    `)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as AttendeeRow;
}

async function getGroupMembers(groupId: string, myId: string): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_assignments")
    .select(`attendees(id, full_name, gender, is_leader, churches(canonical_name))`)
    .eq("group_id", groupId);
  if (error || !data) return [];
  return (data as unknown as { attendees: MemberRow | null }[])
    .map((d) => d.attendees)
    .filter((a): a is MemberRow => a !== null && a.id !== myId);
}

function ErrorState({ message, sub }: { message: string; sub: string }) {
  return (
    <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-5 pb-nav max-w-[430px] mx-auto">
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-white text-lg font-bold mb-2">{message}</h2>
        <p className="text-slate-400 text-sm mb-6">{sub}</p>
        <Link href="/lookup" className="bg-gold text-navy font-bold py-3 px-6 rounded-xl text-sm active:scale-95 transition-transform">
          다시 확인하기
        </Link>
      </div>
    </main>
  );
}

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  if (!id) return <ErrorState message="접근 오류" sub="본인 확인 후 다시 시도해 주세요." />;

  const attendee = await getAttendee(id);

  if (!attendee) {
    return <ErrorState message="참가자를 찾을 수 없습니다" sub="소속 교회, 이름, 생년을 다시 확인해 주세요." />;
  }

  const group = attendee.group_assignments?.[0]?.retreat_groups ?? null;
  const churchName = attendee.churches?.canonical_name ?? "교회 미상";
  const members = group?.id ? await getGroupMembers(group.id, attendee.id) : [];
  const total = members.length + 1;
  const maleCnt = [attendee, ...members].filter((m) => m.gender === "male").length;
  const femaleCnt = total - maleCnt;

  return (
    <main className="min-h-screen bg-navy flex flex-col pb-nav max-w-[430px] mx-auto">
      {/* Header */}
      <header className="px-5 pt-safe">
        <div className="h-14 flex items-center gap-3">
          <Link href="/lookup" className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-navy-mid transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-white text-lg font-bold">내 조 정보</h1>
        </div>
      </header>

      <div className="flex-1 px-5 pt-2 space-y-4">
        {/* Profile */}
        <div className="rounded-2xl px-4 py-4 flex items-center gap-4" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: "#0e1e45" }}>
            {attendee.gender === "male" ? "👨" : "👩"}
          </div>
          <div>
            <p className="text-white text-base font-bold">{attendee.full_name}</p>
            <p className="text-slate-400 text-xs mt-0.5">
              {churchName}
              {attendee.birth_year ? ` · ${attendee.birth_year}년생` : ""}
              {" · "}{attendee.gender === "male" ? "남" : "여"}
            </p>
          </div>
        </div>

        {/* Group */}
        {group ? (
          <div className="rounded-2xl px-5 py-5" style={{ background: "#0b1838", border: "1px solid rgba(233,185,74,0.35)" }}>
            {/* Hero number */}
            <div className="flex items-end gap-3 mb-4">
              <span className="text-[72px] font-black text-gold leading-none">{group.group_code}</span>
              <div className="pb-2">
                <p className="text-gold text-[10px] font-bold tracking-[0.15em] uppercase">조</p>
                <p className="text-white text-xl font-bold leading-tight">{group.group_name}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-3 mb-4">
              {[
                { label: "전체", val: String(total), color: "text-white" },
                { label: "남", val: String(maleCnt), color: "text-blue-300" },
                { label: "여", val: String(femaleCnt), color: "text-pink-300" },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex-1 rounded-xl px-3 py-2.5 text-center" style={{ background: "#0e1e45" }}>
                  <p className={`text-base font-bold ${color}`}>{val}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Members */}
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-2">조원 목록</p>
            <div className="space-y-1.5">
              {/* 나 */}
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(233,185,74,0.08)", border: "1px solid rgba(233,185,74,0.15)" }}>
                <span className="text-sm">{attendee.gender === "male" ? "👨" : "👩"}</span>
                <span className="text-white text-sm font-semibold flex-1">{attendee.full_name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(233,185,74,0.15)", color: "#e9b94a" }}>나</span>
              </div>
              {/* 조장 먼저, 나머지 뒤 */}
              {[...members].sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0)).map((m) => {
                const cc = getChurchColor(m.churches?.canonical_name);
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                    style={m.is_leader
                      ? { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }
                      : { background: "#0e1e45" }
                    }
                  >
                    <span className="text-sm">{m.gender === "male" ? "👨" : "👩"}</span>
                    <span className={`text-sm font-medium ${m.is_leader ? "text-emerald-300" : "text-slate-200"}`}>
                      {m.full_name}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      {m.is_leader && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}>
                          조장
                        </span>
                      )}
                      {m.churches?.canonical_name && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                          style={{ background: cc.bg, border: `1px solid ${cc.border}`, color: cc.text }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cc.dot }} />
                          {m.churches.canonical_name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-6 text-center" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "#0e1e45" }}>
              <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white font-bold mb-1">조편성 준비중</h3>
            <p className="text-slate-400 text-sm">조편성이 완료되면 바로 확인할 수 있습니다.</p>
          </div>
        )}

      </div>
    </main>
  );
}
