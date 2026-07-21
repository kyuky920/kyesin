import Link from "next/link";
import { createAdminClient as createClient } from "@/lib/supabase/admin";
import { getChurchColor } from "@/lib/churchColors";
import { getVenue } from "@/lib/venues";
import ChurchMap from "@/components/ChurchMap";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendeeRow {
  id: string;
  full_name: string;
  birth_year: number;
  gender: "male" | "female";
  is_staff: boolean;
  church_id: string | null;
  retreat_id: string | null;
  attends_day1: boolean;
  attends_day2: boolean;
  attends_day3: boolean;
  churches: { canonical_name: string } | null;
  group_assignments: {
    retreat_groups: { id: string; group_code: string; group_name: string } | null;
  }[];
}

interface MemberRow {
  id: string;
  full_name: string;
  gender: "male" | "female";
  birth_year: number;
  is_leader: boolean;
  attends_day1: boolean;
  attends_day2: boolean;
  attends_day3: boolean;
  churches: { canonical_name: string } | null;
}

interface StaffGroup {
  id: string;
  group_code: string;
  group_name: string;
  members: {
    id: string;
    full_name: string;
    gender: "male" | "female";
    birth_year: number;
    is_leader: boolean;
    church_name: string | null;
  }[];
}

interface ChurchMember {
  id: string;
  full_name: string;
  gender: "male" | "female";
  is_leader: boolean;
  group_code: string | null;
  group_name: string | null;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getAttendee(id: string): Promise<AttendeeRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendees")
    .select(`
      id, full_name, birth_year, gender, is_staff, church_id, retreat_id,
      attends_day1, attends_day2, attends_day3,
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
    .select(`attendees(id, full_name, gender, birth_year, is_leader, attends_day1, attends_day2, attends_day3, churches(canonical_name))`)
    .eq("group_id", groupId);
  if (error || !data) return [];
  return (data as unknown as { attendees: MemberRow | null }[])
    .map((d) => d.attendees)
    .filter((a): a is MemberRow => a !== null && a.id !== myId);
}

async function getAllGroupsForStaff(retreatId: string): Promise<StaffGroup[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("retreat_groups")
    .select(`
      id, group_code, group_name,
      group_assignments(
        attendees(id, full_name, gender, birth_year, is_leader, churches(canonical_name))
      )
    `)
    .eq("retreat_id", retreatId);
  if (!data) return [];
  return (data as unknown as {
    id: string;
    group_code: string;
    group_name: string;
    group_assignments: {
      attendees: {
        id: string; full_name: string; gender: "male" | "female";
        birth_year: number; is_leader: boolean;
        churches: { canonical_name: string } | null;
      } | null;
    }[];
  }[])
    .map((g) => ({
      id: g.id,
      group_code: g.group_code,
      group_name: g.group_name,
      members: g.group_assignments
        .filter((a) => a.attendees)
        .map((a) => ({
          id: a.attendees!.id,
          full_name: a.attendees!.full_name,
          gender: a.attendees!.gender,
          birth_year: a.attendees!.birth_year,
          is_leader: a.attendees!.is_leader,
          church_name: a.attendees!.churches?.canonical_name ?? null,
        }))
        .sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0)),
    }))
    .sort((a, b) => parseInt(a.group_code) - parseInt(b.group_code));
}

async function getChurchMembersForStaff(churchId: string, retreatId: string): Promise<ChurchMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendees")
    .select(`
      id, full_name, gender, is_leader,
      group_assignments(
        retreat_groups(group_code, group_name)
      )
    `)
    .eq("church_id", churchId)
    .eq("retreat_id", retreatId)
    .eq("is_staff", false)
    .order("full_name");
  if (!data) return [];
  const list = (data as unknown as {
    id: string; full_name: string; gender: "male" | "female"; is_leader: boolean;
    group_assignments: { retreat_groups: { group_code: string; group_name: string } | null }[];
  }[]).map((a) => ({
    id: a.id,
    full_name: a.full_name,
    gender: a.gender,
    is_leader: a.is_leader,
    group_code: a.group_assignments?.[0]?.retreat_groups?.group_code ?? null,
    group_name: a.group_assignments?.[0]?.retreat_groups?.group_name ?? null,
  }));
  // 배정된 조 번호 순, 미배정은 맨 뒤
  return list.sort((a, b) => {
    if (!a.group_code && !b.group_code) return 0;
    if (!a.group_code) return 1;
    if (!b.group_code) return -1;
    return parseInt(a.group_code) - parseInt(b.group_code);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ageLabel(birthYear: number) {
  if (!birthYear || birthYear <= 1900) return "";
  return `${2026 - birthYear}세`;
}

function DayBadges({ d1, d2, d3 }: { d1: boolean; d2: boolean; d3: boolean }) {
  return (
    <span className="flex items-center gap-px flex-shrink-0">
      {(["목", "금", "토"] as const).map((label, i) => {
        const active = [d1, d2, d3][i];
        return (
          <span key={label} className={`text-[8px] font-bold leading-none px-0.5 py-px rounded-sm ${active ? "text-gold/80" : "text-slate-700"}`}>
            {label}
          </span>
        );
      })}
    </span>
  );
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

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

function BackHeader({ href, title, sub }: { href: string; title: string; sub?: string }) {
  return (
    <header className="px-5 pt-safe sticky top-0 bg-navy z-10 border-b border-slate-800/50">
      <div className="h-14 flex items-center gap-3">
        <Link href={href} className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-navy-mid transition-colors flex-shrink-0">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-white text-lg font-bold leading-tight">{title}</h1>
          {sub && <p className="text-slate-500 text-xs">{sub}</p>}
        </div>
      </div>
    </header>
  );
}

// ─── Staff views ──────────────────────────────────────────────────────────────

function StaffLanding({ attendee, id }: { attendee: AttendeeRow; id: string }) {
  const churchName = attendee.churches?.canonical_name ?? "교회 미상";
  const hasRetreat = !!attendee.retreat_id;
  return (
    <main className="min-h-screen bg-navy flex flex-col pb-nav max-w-[430px] mx-auto">
      <header className="px-5 pt-safe">
        <div className="h-14 flex items-center">
          <h1 className="text-white text-lg font-bold">조편성 결과</h1>
        </div>
      </header>
      <div className="flex-1 px-5 pt-2 space-y-4">
        {/* 교역자 전용 안내 배너 */}
        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)" }}>
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#c4b5fd" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: "#c4b5fd" }}>
            이 페이지는 <span className="font-semibold">교역자 전용</span> 페이지입니다. 담당 교회 청년들의 조편성 결과를 확인할 수 있습니다.
          </p>
        </div>

        {/* 교역자 프로필 */}
        <div className="rounded-2xl px-4 py-4 flex items-center gap-4" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: "#0e1e45" }}>
            {attendee.gender === "male" ? "👨" : "👩"}
          </div>
          <div>
            <p className="text-white text-base font-bold">{attendee.full_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-slate-400 text-xs">{churchName}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd" }}>교역자</span>
            </div>
          </div>
        </div>

        {/* 우리 교회 청년들 */}
        <Link
          href={hasRetreat ? `/me?id=${id}&view=church` : "#"}
          className={`block rounded-2xl px-5 py-5 transition-transform ${hasRetreat ? "active:scale-[0.98]" : "opacity-50 cursor-not-allowed"}`}
          style={{ background: "#0b1838", border: "1px solid rgba(233,185,74,0.35)" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(233,185,74,0.1)" }}>
              <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">우리 교회 청년들</p>
              <p className="text-slate-400 text-xs mt-0.5">{churchName} 참가자 조편성 확인</p>
            </div>
            <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* 전체 조편성 결과 */}
        <Link
          href={hasRetreat ? `/me?id=${id}&view=all` : "#"}
          className={`block rounded-2xl px-5 py-5 transition-transform ${hasRetreat ? "active:scale-[0.98]" : "opacity-50 cursor-not-allowed"}`}
          style={{ background: "#0b1838", border: "1px solid #1c2e58" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#0e1e45" }}>
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">전체 조편성 결과</p>
              <p className="text-slate-400 text-xs mt-0.5">수련회 전체 참가자 조 목록</p>
            </div>
            <svg className="w-5 h-5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {!hasRetreat && (
          <p className="text-slate-500 text-xs text-center">조편성이 완료되면 확인할 수 있습니다.</p>
        )}
      </div>
    </main>
  );
}

function StaffChurchView({ attendee, members, id }: { attendee: AttendeeRow; members: ChurchMember[]; id: string }) {
  const churchName = attendee.churches?.canonical_name ?? "교회";
  const assigned = members.filter((m) => m.group_code);
  const unassigned = members.filter((m) => !m.group_code);

  return (
    <main className="min-h-screen bg-navy flex flex-col pb-nav max-w-[430px] mx-auto">
      <BackHeader href={`/me?id=${id}`} title={`${churchName} 청년들`} sub={`${members.length}명 참가`} />
      <div className="flex-1 px-5 pt-4 space-y-2">
        {members.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-16">참가자 정보가 없습니다.</p>
        ) : (
          <>
            {assigned.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                <span className={`text-sm ${m.gender === "male" ? "text-blue-400" : "text-pink-400"}`}>
                  {m.gender === "male" ? "♂" : "♀"}
                </span>
                <span className={`flex-1 text-sm font-medium ${m.is_leader ? "text-gold" : "text-slate-200"}`}>
                  {m.full_name}
                  {m.is_leader && (
                    <span className="ml-1.5 text-[10px] font-bold" style={{ color: "#e9b94a" }}>조장</span>
                  )}
                </span>
                <span className="text-right">
                  <span className="text-gold text-xs font-semibold">{m.group_code}조 · {m.group_name}</span>
                  {getVenue(m.group_code ?? "") && (
                    <span className="block text-slate-400 text-[10px]">{getVenue(m.group_code ?? "")}</span>
                  )}
                </span>
              </div>
            ))}
            {unassigned.length > 0 && (
              <div className="pt-3">
                <p className="text-slate-500 text-xs mb-2">조 미배정 ({unassigned.length}명)</p>
                {unassigned.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl px-4 py-3 mb-2" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                    <span className="text-sm text-slate-600">{m.gender === "male" ? "♂" : "♀"}</span>
                    <span className="text-slate-400 text-sm flex-1">{m.full_name}</span>
                    <span className="text-slate-600 text-xs">미배정</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function StaffAllGroupsView({ groups, id }: { groups: StaffGroup[]; id: string }) {
  const totalAssigned = groups.reduce((s, g) => s + g.members.length, 0);
  return (
    <main className="min-h-screen bg-navy flex flex-col pb-nav max-w-[430px] mx-auto">
      <BackHeader
        href={`/me?id=${id}`}
        title="전체 조편성 결과"
        sub={groups.length > 0 ? `${groups.length}개 조 · ${totalAssigned}명` : undefined}
      />
      <div className="flex-1 px-5 pt-4 space-y-3">
        {groups.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500 text-sm">조편성이 완료되지 않았습니다.</p>
          </div>
        ) : (
          groups.map((g) => {
            const males = g.members.filter((m) => m.gender === "male").length;
            const females = g.members.length - males;
            return (
              <div key={g.id} className="rounded-2xl overflow-hidden" style={{ background: "#0b1838", border: "1px solid #1c2e58" }}>
                <div className="px-4 py-3" style={{ borderBottom: "1px solid #1c2e58" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gold font-bold">{g.group_code}조</span>
                      <span className="text-slate-500 text-xs">·</span>
                      <span className="text-white font-semibold text-sm">{g.group_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-blue-400">남 {males}</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-pink-400">여 {females}</span>
                      <span className="text-slate-500 ml-1">{g.members.length}명</span>
                    </div>
                  </div>
                  {getVenue(g.group_code) && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3 h-3 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-slate-500 text-[11px]">{getVenue(g.group_code)}</span>
                    </div>
                  )}
                </div>
                <div className="divide-y divide-slate-800/60">
                  {g.members.map((m) => {
                    const cc = getChurchColor(m.church_name);
                    return (
                      <div key={m.id} className="flex items-center gap-2 px-4 py-2">
                        <span className="w-4 text-center text-xs flex-shrink-0">
                          {m.is_leader
                            ? <span className="text-gold">★</span>
                            : <span className={m.gender === "male" ? "text-blue-400" : "text-pink-400"}>{m.gender === "male" ? "♂" : "♀"}</span>
                          }
                        </span>
                        <span className={`text-[13px] font-medium flex-1 truncate ${m.is_leader ? "text-gold" : "text-slate-200"}`}>
                          {m.full_name}
                        </span>
                        {m.church_name && (
                          <span className="text-[10px] font-medium flex-shrink-0" style={{ color: cc.dot }}>
                            {m.church_name}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 flex-shrink-0 ml-1">{ageLabel(m.birth_year)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; view?: string }>;
}) {
  const { id, view } = await searchParams;

  if (!id) return <ErrorState message="접근 오류" sub="본인 확인 후 다시 시도해 주세요." />;

  const attendee = await getAttendee(id);
  if (!attendee) {
    return <ErrorState message="참가자를 찾을 수 없습니다" sub="소속 교회, 이름, 생년을 다시 확인해 주세요." />;
  }

  // ── 교역자 분기 ────────────────────────────────────────────────────────────
  if (attendee.is_staff) {
    const retreatId = attendee.retreat_id;

    if (view === "church" && attendee.church_id && retreatId) {
      const members = await getChurchMembersForStaff(attendee.church_id, retreatId);
      return <StaffChurchView attendee={attendee} members={members} id={id} />;
    }

    if (view === "all" && retreatId) {
      const allGroups = await getAllGroupsForStaff(retreatId);
      return <StaffAllGroupsView groups={allGroups} id={id} />;
    }

    return <StaffLanding attendee={attendee} id={id} />;
  }

  // ── 일반 참가자 ────────────────────────────────────────────────────────────
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
        {/* 프로필 */}
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

        {/* 조 정보 */}
        {group ? (
          <div className="rounded-2xl px-5 py-5" style={{ background: "#0b1838", border: "1px solid rgba(233,185,74,0.35)" }}>
            {/* 조 번호 + 이름 */}
            <div className="flex items-end gap-3 mb-4">
              <span className="text-[72px] font-black text-gold leading-none">{group.group_code}</span>
              <div className="pb-2">
                <p className="text-gold text-[10px] font-bold tracking-[0.15em] uppercase">나의 셀조</p>
                <p className="text-white text-xl font-bold leading-tight">
                  {group.group_code}조 · {group.group_name}
                </p>
              </div>
            </div>

            {/* 장소 */}
            {getVenue(group.group_code) && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ background: "rgba(233,185,74,0.06)", border: "1px solid rgba(233,185,74,0.15)" }}>
                <svg className="w-4 h-4 text-gold/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-gold/60 text-[10px] font-semibold uppercase tracking-wider">셀모임 장소</p>
                  <p className="text-white text-sm font-bold">{getVenue(group.group_code)}</p>
                </div>
              </div>
            )}

            {/* 통계 */}
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

            {/* 조원 목록 */}
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-2">조원 목록</p>
            <div className="space-y-1.5">
              {/* 나 */}
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(233,185,74,0.08)", border: "1px solid rgba(233,185,74,0.15)" }}>
                <span className="text-sm">{attendee.gender === "male" ? "👨" : "👩"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold flex-1">{attendee.full_name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(233,185,74,0.15)", color: "#e9b94a" }}>나</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <DayBadges d1={attendee.attends_day1} d2={attendee.attends_day2} d3={attendee.attends_day3} />
                    {attendee.birth_year && <span className="text-[10px] text-slate-500">{ageLabel(attendee.birth_year)}</span>}
                  </div>
                </div>
              </div>
              {/* 조장 먼저 */}
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium flex-1 ${m.is_leader ? "text-emerald-300" : "text-slate-200"}`}>
                          {m.full_name}
                        </span>
                        {m.is_leader && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}>
                            조장
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {m.churches?.canonical_name && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                            style={{ background: cc.bg, border: `1px solid ${cc.border}`, color: cc.text }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cc.dot }} />
                            {m.churches.canonical_name}
                          </span>
                        )}
                        <DayBadges d1={m.attends_day1} d2={m.attends_day2} d3={m.attends_day3} />
                        {m.birth_year && <span className="text-[10px] text-slate-500">{ageLabel(m.birth_year)}</span>}
                      </div>
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
            <p className="text-slate-400 text-sm">조편성이 완료되면 바로 확인할 수 있어요.</p>
          </div>
        )}

        {/* 교회 안내도 */}
        <ChurchMap venueName={group ? getVenue(group.group_code) : null} />
      </div>
    </main>
  );
}
