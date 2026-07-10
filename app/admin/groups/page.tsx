"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface GroupMember {
  id: string;
  full_name: string;
  gender: "male" | "female";
  birth_year: number;
  attends_day1: boolean;
  attends_day2: boolean;
  attends_day3: boolean;
  churches: { canonical_name: string } | null;
}

interface GroupData {
  id: string;
  group_number: number;
  group_name: string;
  members: GroupMember[];
}

interface GenerateResult {
  groups_created: number;
  total_assigned: number;
  warnings: string[];
}

function ageLabel(birthYear: number): string {
  const age = 2026 - birthYear;
  if (age <= 24) return "20-24";
  if (age <= 28) return "25-28";
  return "29+";
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);
  const [genError, setGenError] = useState("");

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: groupsData, error } = await supabase
        .from("retreat_groups")
        .select("id, group_number, group_name")
        .order("group_number");
      if (error) throw error;

      const groupsWithMembers = await Promise.all(
        ((groupsData ?? []) as { id: string; group_number: number; group_name: string }[]).map(
          async (g) => {
            const { data: assignments } = await supabase
              .from("group_assignments")
              .select(`attendees(id, full_name, gender, birth_year, attends_day1, attends_day2, attends_day3, churches(canonical_name))`)
              .eq("group_id", g.id);

            const members = ((assignments as unknown as { attendees: GroupMember | null }[]) ?? [])
              .map((a) => a.attendees)
              .filter((m): m is GroupMember => m !== null);

            return { ...g, members };
          }
        )
      );

      setGroups(groupsWithMembers);
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
      const data = await res.json();
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

  const getWarnings = (group: GroupData): string[] => {
    const warnings: string[] = [];
    const total = group.members.length;
    const males = group.members.filter((m) => m.gender === "male").length;
    const females = total - males;
    if (total < 3) warnings.push("인원 부족 (3명 미만)");
    if (total > 6) warnings.push("인원 초과 (6명 초과)");
    if (total > 1 && (males === 0 || females === 0)) warnings.push("성별 편중");
    const churchSet = new Set(group.members.map((m) => m.churches?.canonical_name).filter(Boolean));
    if (churchSet.size === 1 && total >= 3 && !group.members[0]?.churches?.canonical_name?.includes("초월")) {
      warnings.push("동일 교회 집중");
    }
    return warnings;
  };

  return (
    <main className="min-h-screen bg-navy flex flex-col">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">조편성 관리</h1>
            <p className="text-slate-400 text-xs">총 {groups.length}개 조</p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-gold hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed text-navy text-sm font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
        >
          {generating ? (
            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>편성 중...</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>자동 조편성 실행</>
          )}
        </button>
      </header>

      <div className="flex-1 px-4 py-4">
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
            <p className="text-sm">&quot;자동 조편성 실행&quot; 버튼으로 조편성을 시작하세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {groups.map((group) => {
              const males = group.members.filter((m) => m.gender === "male").length;
              const females = group.members.length - males;
              const churches = Array.from(new Set(group.members.map((m) => m.churches?.canonical_name).filter((n): n is string => !!n)));
              const warnings = getWarnings(group);

              return (
                <div key={group.id} className={`border rounded-xl p-4 ${warnings.length > 0 ? "bg-yellow-900/10 border-yellow-700/30" : "bg-navy-mid border-slate-700"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-gold text-2xl font-bold">{group.group_number}</span>
                      <span className="text-slate-300 text-sm ml-2">{group.group_name}</span>
                    </div>
                    <span className="text-slate-400 text-xs bg-slate-700/50 px-2 py-0.5 rounded-full">{group.members.length}명</span>
                  </div>

                  {warnings.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {warnings.map((w, i) => (
                        <span key={i} className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 px-2 py-0.5 rounded-full">{w}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3 text-xs">
                    <span className="text-blue-400">남 {males}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-pink-400">여 {females}</span>
                  </div>

                  {churches.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {churches.map((c) => (
                        <span key={c} className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 border-t border-slate-700 pt-3">
                    {group.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        <span className={m.gender === "male" ? "text-blue-400" : "text-pink-400"}>
                          {m.gender === "male" ? "♂" : "♀"}
                        </span>
                        <span className="text-slate-300 flex-1">{m.full_name}</span>
                        <span className="text-slate-600">{ageLabel(m.birth_year)}</span>
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
