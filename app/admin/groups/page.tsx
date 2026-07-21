"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getChurchColor } from "@/lib/churchColors";
import { getVenue } from "@/lib/venues";

interface GroupMember {
  assignment_id: string;
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

interface GroupData {
  id: string;
  group_code: string;
  group_name: string;
  leader_attendee_id: string | null;
  members: GroupMember[];
}

interface GenerateResult {
  groups_created: number;
  total_assigned: number;
  warnings: string[];
}

function ageLabel(birthYear: number): string {
  if (!birthYear || birthYear <= 1900) return "-";
  return `${2026 - birthYear}세`;
}

type Warning = { text: string; color: string; bg: string; border: string };

function getGroupWarnings(g: GroupData): Warning[] {
  const w: Warning[] = [];
  const n = g.members.length;
  const males = g.members.filter((m) => m.gender === "male").length;
  const females = n - males;

  if (n < 4) w.push({ text: "인원 부족", color: "text-red-400", bg: "bg-red-900/20", border: "border-red-700/40" });
  if (n > 6) w.push({ text: "인원 초과", color: "text-orange-400", bg: "bg-orange-900/20", border: "border-orange-700/40" });
  if (n > 1 && (males === 0 || females === 0))
    w.push({ text: "단성 편중", color: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-700/40" });

  // 동일 교회 3명+ (초월제일교회 제외 — 필수 동일 조 규칙)
  const churchCount: Record<string, number> = {};
  for (const m of g.members) {
    const c = m.churches?.canonical_name ?? "미상";
    churchCount[c] = (churchCount[c] ?? 0) + 1;
  }
  for (const [church, cnt] of Object.entries(churchCount)) {
    if (cnt >= 3 && church !== "초월제일교회")
      w.push({ text: "동일교회 편중", color: "text-purple-400", bg: "bg-purple-900/20", border: "border-purple-700/40" });
    if (church === "초월제일교회" && cnt >= 2)
      w.push({ text: "초월제일(필수동일조)", color: "text-teal-400", bg: "bg-teal-900/20", border: "border-teal-700/40" });
  }

  // 조장 없음
  if (!g.members.some((m) => m.is_leader))
    w.push({ text: "조장 없음", color: "text-slate-400", bg: "bg-slate-800/40", border: "border-slate-600/40" });

  return w;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);
  const [genError, setGenError] = useState("");
  const [movingMember, setMovingMember] = useState<{
    assignment_id: string;
    full_name: string;
    current_group_id: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/groups");
      const data = await res.json() as {
        groups: {
          id: string;
          group_code: string;
          group_name: string;
          leader_attendee_id: string | null;
          group_assignments: {
            id: string;
            attendees: {
              id: string;
              full_name: string;
              gender: "male" | "female";
              birth_year: number;
              is_leader: boolean;
              attends_day1: boolean;
              attends_day2: boolean;
              attends_day3: boolean;
              churches: { canonical_name: string } | null;
            } | null;
          }[];
        }[];
        error?: string;
      };
      if (!res.ok || data.error) throw new Error(data.error);

      const transformed: GroupData[] = (data.groups ?? []).map((g) => ({
        id: g.id,
        group_code: g.group_code,
        group_name: g.group_name,
        leader_attendee_id: g.leader_attendee_id,
        members: (g.group_assignments ?? [])
          .filter((a) => a.attendees)
          .map((a) => ({
            assignment_id: a.id,
            id: a.attendees!.id,
            full_name: a.attendees!.full_name,
            gender: a.attendees!.gender,
            birth_year: a.attendees!.birth_year,
            is_leader: a.attendees!.is_leader,
            attends_day1: a.attendees!.attends_day1,
            attends_day2: a.attendees!.attends_day2,
            attends_day3: a.attendees!.attends_day3,
            churches: a.attendees!.churches,
          })),
      }));

      setGroups(transformed);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleGenerate = async () => {
    if (!confirm("자동 조편성을 실행하면 기존 배정이 초기화됩니다. 계속하시겠습니까?")) return;
    setGenerating(true);
    setGenResult(null);
    setGenError("");
    try {
      const res = await fetch("/api/admin/generate-groups", { method: "POST" });
      const data = await res.json() as { error?: string; groups_created: number; total_assigned: number; warnings: string[] };
      if (!res.ok || data.error) {
        setGenError(data.error ?? "자동 조편성에 실패했습니다.");
      } else {
        setGenResult(data);
        await fetchGroups();
      }
    } catch {
      setGenError("네트워크 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRemove = async (assignmentId: string, memberName: string) => {
    if (!confirm(`${memberName}을(를) 조에서 제거하시겠습니까?`)) return;
    setActionLoading(assignmentId);
    try {
      const res = await fetch(`/api/admin/group-assignments?id=${assignmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setGroups((prev) =>
        prev.map((g) => ({ ...g, members: g.members.filter((m) => m.assignment_id !== assignmentId) }))
      );
    } catch {
      alert("제거 실패. 다시 시도해 주세요.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMove = async (targetGroupId: string) => {
    if (!movingMember) return;
    const { assignment_id, full_name } = movingMember;
    const sourceGroupId = movingMember.current_group_id;
    setMovingMember(null);
    setActionLoading(assignment_id);
    try {
      const res = await fetch(`/api/admin/group-assignments?id=${assignment_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: targetGroupId }),
      });
      if (!res.ok) throw new Error();
      // Optimistic update
      setGroups((prev) => {
        const member = prev.flatMap((g) => g.members).find((m) => m.assignment_id === assignment_id);
        if (!member) return prev;
        return prev.map((g) => {
          if (g.id === sourceGroupId) return { ...g, members: g.members.filter((m) => m.assignment_id !== assignment_id) };
          if (g.id === targetGroupId) return { ...g, members: [...g.members, member] };
          return g;
        });
      });
    } catch {
      alert(`${full_name} 이동 실패. 다시 시도해 주세요.`);
    } finally {
      setActionLoading(null);
    }
  };

  const totalAssigned = groups.reduce((s, g) => s + g.members.length, 0);

  return (
    <main className="min-h-screen bg-navy flex flex-col">
      {/* 이동 모달 */}
      {movingMember && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setMovingMember(null)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative bg-navy-mid border border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4 mb-4 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gold font-semibold mb-0.5">{movingMember.full_name}</p>
            <p className="text-slate-400 text-sm mb-4">이동할 조 번호를 선택하세요</p>
            <div className="grid grid-cols-5 gap-2 max-h-52 overflow-y-auto pr-1">
              {groups
                .filter((g) => g.id !== movingMember.current_group_id)
                .map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleMove(g.id)}
                    className="aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-colors border border-gold/30 bg-gold/5 hover:bg-gold hover:text-navy text-gold"
                  >
                    <span>{g.group_code}</span>
                    <span className="text-[9px] font-normal opacity-60">{g.members.length}명</span>
                  </button>
                ))}
            </div>
            <button
              onClick={() => setMovingMember(null)}
              className="mt-4 w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-sm border border-slate-700 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-navy z-10">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">조편성 관리</h1>
            <p className="text-slate-400 text-xs">
              {loading ? "불러오는 중..." : `${groups.length}개 조 · ${totalAssigned}명 배정`}
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || loading}
          className="bg-gold hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed text-navy text-sm font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          {generating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              편성 중...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              자동 조편성
            </>
          )}
        </button>
      </header>

      <div className="flex-1 px-4 py-4 max-w-6xl mx-auto w-full">
        {genResult && (
          <div className="mb-4 bg-green-900/30 border border-green-700/40 rounded-xl p-4">
            <p className="text-green-300 font-semibold text-sm">
              완료: {genResult.groups_created}개 조, {genResult.total_assigned}명 배정
            </p>
            {genResult.warnings.length > 0 && (
              <ul className="list-disc list-inside text-yellow-300 text-xs mt-2 space-y-0.5">
                {genResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        )}

        {genError && (
          <div className="mb-4 bg-red-900/30 border border-red-700/40 rounded-xl p-4">
            <p className="text-red-300 text-sm">{genError}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-6 h-6 text-gold animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="mb-2">편성된 조가 없습니다.</p>
            <p className="text-sm">&quot;자동 조편성&quot; 버튼으로 조편성을 시작하세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {groups.map((group) => {
              const males = group.members.filter((m) => m.gender === "male").length;
              const females = group.members.length - males;
              const warn = getGroupWarnings(group);

              return (
                <div
                  key={group.id}
                  className={`border rounded-xl overflow-hidden ${
                    warn.length > 0 ? "border-yellow-700/30 bg-yellow-900/5" : "border-slate-700 bg-navy-mid"
                  }`}
                >
                  {/* 조 헤더 */}
                  <div className="px-4 py-3 border-b border-slate-700/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="text-gold font-bold text-lg flex-shrink-0">{group.group_code}조</span>
                        <span className="text-slate-500 text-xs flex-shrink-0">·</span>
                        <span className="text-white font-semibold text-sm truncate">{group.group_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-blue-400">남 {males}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-pink-400">여 {females}</span>
                        <span className="ml-1 bg-slate-700/50 px-1.5 py-0.5 rounded-full text-slate-400">{group.members.length}명</span>
                      </div>
                    </div>
                    {(() => {
                      const venue = getVenue(group.group_code);
                      return venue ? (
                        <div className="flex items-center gap-1 mb-1.5">
                          <svg className="w-3 h-3 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-slate-400 text-[11px]">{venue}</span>
                        </div>
                      ) : null;
                    })()}
                    {warn.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {warn.map((w, i) => (
                          <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${w.color} ${w.bg} ${w.border}`}>
                            {w.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 멤버 목록 */}
                  <div className="divide-y divide-slate-700/20">
                    {group.members
                      .slice()
                      .sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0))
                      .map((member) => (
                        <div
                          key={member.assignment_id}
                          className={`flex items-center gap-2 px-3 py-2 ${
                            actionLoading === member.assignment_id ? "opacity-40" : ""
                          }`}
                        >
                          {/* 조장/성별 배지 */}
                          <div className="flex-shrink-0 w-5 text-center text-sm">
                            {member.is_leader ? (
                              <span className="text-gold" title="조장">★</span>
                            ) : (
                              <span className={member.gender === "male" ? "text-blue-400" : "text-pink-400"}>
                                {member.gender === "male" ? "♂" : "♀"}
                              </span>
                            )}
                          </div>

                          {/* 이름 + 교회(컬러 텍스트) + 참여일 + 나이 */}
                          <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                            <p className={`text-[13px] font-medium truncate min-w-0 leading-tight ${member.is_leader ? "text-gold" : "text-slate-200"}`}>
                              {member.full_name}
                            </p>
                            {member.churches?.canonical_name && (
                              <span
                                className="text-[10px] font-medium flex-shrink-0 truncate max-w-[4rem]"
                                style={{ color: getChurchColor(member.churches.canonical_name).dot }}
                              >
                                {member.churches.canonical_name}
                              </span>
                            )}
                            <span className="flex items-center gap-px flex-shrink-0">
                              {(["목", "금", "토"] as const).map((label, i) => {
                                const active = [member.attends_day1, member.attends_day2, member.attends_day3][i];
                                return (
                                  <span key={label} className={`text-[8px] font-bold leading-none px-0.5 py-px rounded-sm ${active ? "text-gold/80" : "text-slate-700"}`}>
                                    {label}
                                  </span>
                                );
                              })}
                            </span>
                            <span className="text-[10px] text-slate-500 flex-shrink-0 ml-auto">{ageLabel(member.birth_year)}</span>
                          </div>

                          {/* 이동 / 제거 버튼 */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() =>
                                setMovingMember({
                                  assignment_id: member.assignment_id,
                                  full_name: member.full_name,
                                  current_group_id: group.id,
                                })
                              }
                              disabled={!!actionLoading}
                              className="text-slate-600 hover:text-blue-400 transition-colors p-1.5 rounded"
                              title="다른 조로 이동"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRemove(member.assignment_id, member.full_name)}
                              disabled={!!actionLoading}
                              className="text-slate-600 hover:text-red-400 transition-colors p-1.5 rounded"
                              title="조에서 제거"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
