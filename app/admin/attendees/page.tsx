"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface AttendeeRow {
  id: string;
  full_name: string;
  gender: "male" | "female";
  birth_year: number;
  attends_day1: boolean;
  attends_day2: boolean;
  attends_day3: boolean;
  lodging_required: boolean;
  churches: { canonical_name: string } | null;
  group_assignments: { retreat_groups: { group_number: number; group_name: string } | null }[];
}

function attendanceLabel(a: AttendeeRow): string {
  const days = [a.attends_day1, a.attends_day2, a.attends_day3];
  const cnt = days.filter(Boolean).length;
  if (cnt === 3) return "3일(목금토)";
  if (a.attends_day2 && a.attends_day3) return "2일(금토)";
  if (a.attends_day1 && a.attends_day2) return "2일(목금)";
  if (cnt === 1) {
    if (a.attends_day1) return "1일(목)";
    if (a.attends_day2) return "1일(금)";
    return "1일(토)";
  }
  return `${cnt}일`;
}

const PAGE_SIZE = 20;

export default function AttendeesPage() {
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<"full_name" | "birth_year">("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterGender, setFilterGender] = useState<"" | "male" | "female">("");
  const [filterAssigned, setFilterAssigned] = useState<"" | "yes" | "no">("");
  const [searchName, setSearchName] = useState("");

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      let query = supabase
        .from("attendees")
        .select(
          `id, full_name, gender, birth_year,
           attends_day1, attends_day2, attends_day3, lodging_required,
           churches(canonical_name),
           group_assignments(retreat_groups(group_number, group_name))`,
          { count: "exact" }
        );

      if (filterGender) query = query.eq("gender", filterGender);
      if (searchName) query = query.ilike("full_name", `%${searchName}%`);
      query = query.order(sortKey, { ascending: sortDir === "asc" });

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      let rows = (data as unknown as AttendeeRow[]) ?? [];

      if (filterAssigned === "yes") {
        rows = rows.filter((a) => a.group_assignments?.[0]?.retreat_groups);
      } else if (filterAssigned === "no") {
        rows = rows.filter((a) => !a.group_assignments?.[0]?.retreat_groups);
      }

      setAttendees(rows);
      setTotal(count ?? 0);
    } catch {
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  }, [page, sortKey, sortDir, filterGender, filterAssigned, searchName]);

  useEffect(() => { fetchAttendees(); }, [fetchAttendees]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const SortIcon = ({ col }: { col: typeof sortKey }) =>
    sortKey === col
      ? <span className="ml-1 text-gold">{sortDir === "asc" ? "↑" : "↓"}</span>
      : <span className="ml-1 text-slate-600">↕</span>;

  return (
    <main className="min-h-screen bg-navy flex flex-col">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center gap-4">
        <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-white font-bold text-lg">참석자 관리</h1>
          <p className="text-slate-400 text-xs">총 {total}명</p>
        </div>
      </header>

      <div className="flex-1 px-4 py-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={searchName}
            onChange={(e) => { setSearchName(e.target.value); setPage(0); }}
            placeholder="이름 검색..."
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold w-36"
          />
          <select
            value={filterGender}
            onChange={(e) => { setFilterGender(e.target.value as typeof filterGender); setPage(0); }}
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold"
          >
            <option value="">성별 전체</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
          <select
            value={filterAssigned}
            onChange={(e) => { setFilterAssigned(e.target.value as typeof filterAssigned); setPage(0); }}
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold"
          >
            <option value="">배정 여부 전체</option>
            <option value="yes">배정 완료</option>
            <option value="no">미배정</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-mid border-b border-slate-700">
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("full_name")}>
                  이름 <SortIcon col="full_name" />
                </th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">교회</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">성별</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("birth_year")}>
                  생년 <SortIcon col="birth_year" />
                </th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">참석</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">숙박</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">조 배정</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <svg className="w-5 h-5 text-gold animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </td>
                </tr>
              ) : attendees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">참석자 데이터가 없습니다.</td>
                </tr>
              ) : (
                attendees.map((a) => {
                  const group = a.group_assignments?.[0]?.retreat_groups;
                  return (
                    <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{a.full_name}</td>
                      <td className="px-4 py-3 text-slate-300">{a.churches?.canonical_name ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          a.gender === "male"
                            ? "bg-blue-900/30 border-blue-700/40 text-blue-300"
                            : "bg-pink-900/30 border-pink-700/40 text-pink-300"
                        }`}>
                          {a.gender === "male" ? "남" : "여"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{a.birth_year}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{attendanceLabel(a)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${a.lodging_required ? "text-green-400" : "text-slate-500"}`}>
                          {a.lodging_required ? "숙박" : "비숙박"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {group ? (
                          <span className="text-xs bg-gold/20 text-gold border border-gold/30 px-2 py-0.5 rounded-full">
                            {group.group_number}조
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">미배정</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg disabled:opacity-40 hover:border-gold hover:text-gold text-slate-300 transition-colors"
            >
              이전
            </button>
            <span className="text-slate-400 text-sm px-2">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg disabled:opacity-40 hover:border-gold hover:text-gold text-slate-300 transition-colors"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
