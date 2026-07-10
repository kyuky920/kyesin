import Link from "next/link";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

interface AttendeeRow {
  id: string;
  full_name: string;
  birth_year: number;
  gender: "male" | "female";
  age?: number;
  churches: { canonical_name: string } | null;
  group_assignments: {
    retreat_groups: { id: string; group_number: number; group_name: string } | null;
  }[];
}

interface MemberRow {
  id: string;
  full_name: string;
  gender: "male" | "female";
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
        retreat_groups(id, group_number, group_name)
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
    .select(`attendees(id, full_name, gender, churches(canonical_name))`)
    .eq("group_id", groupId);
  if (error || !data) return [];
  return (data as unknown as { attendees: MemberRow | null }[])
    .map((d) => d.attendees)
    .filter((a): a is MemberRow => a !== null && a.id !== myId);
}

async function getNextSchedule() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("schedule_items")
    .select("title, day_date, start_time, audience_note")
    .gte("day_date", today)
    .order("day_date")
    .order("start_time")
    .limit(1)
    .single();
  return data;
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

  const [attendee, nextSchedule] = await Promise.all([getAttendee(id), getNextSchedule()]);

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
              <span className="text-[72px] font-black text-gold leading-none">{group.group_number}</span>
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
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(233,185,74,0.08)", border: "1px solid rgba(233,185,74,0.15)" }}>
                <span className="text-sm">{attendee.gender === "male" ? "👨" : "👩"}</span>
                <span className="text-white text-sm font-semibold flex-1">{attendee.full_name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(233,185,74,0.15)", color: "#e9b94a" }}>나</span>
              </div>
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "#0e1e45" }}>
                  <span className="text-sm">{m.gender === "male" ? "👨" : "👩"}</span>
                  <span className="text-slate-200 text-sm flex-1">{m.full_name}</span>
                  <span className="text-slate-500 text-xs">{m.churches?.canonical_name}</span>
                </div>
              ))}
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

        {/* Next schedule */}
        {nextSchedule && (
          <div className="rounded-2xl px-4 py-4" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">다음 일정</span>
            </div>
            <p className="text-white font-semibold text-sm">{nextSchedule.title}</p>
            <p className="text-slate-400 text-xs mt-1">
              {nextSchedule.day_date} {nextSchedule.start_time}
              {nextSchedule.audience_note ? ` · ${nextSchedule.audience_note}` : ""}
            </p>
          </div>
        )}

        <Link href="/lookup" className="flex items-center justify-center gap-2 text-slate-500 text-sm py-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          다른 참가자 확인하기
        </Link>
      </div>
    </main>
  );
}
