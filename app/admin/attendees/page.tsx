"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

interface AddForm {
  full_name: string;
  gender: "male" | "female" | "";
  birth_year: string;
  church_name: string;
  shirt_size: string;
  lodging_required: boolean;
  attends_day1: boolean;
  attends_day2: boolean;
  attends_day3: boolean;
  admin_notes: string;
}

interface ImportResult {
  total: number;
  valid: number;
  inserted: number;
  skipped: number;
  skipped_rows: string[];
  errors: string[];
}

const EMPTY_FORM: AddForm = {
  full_name: "", gender: "", birth_year: "", church_name: "",
  shirt_size: "", lodging_required: false,
  attends_day1: true, attends_day2: true, attends_day3: true, admin_notes: "",
};

function attendanceLabel(a: AttendeeRow): string {
  const cnt = [a.attends_day1, a.attends_day2, a.attends_day3].filter(Boolean).length;
  if (cnt === 3) return "3일(목금토)";
  if (a.attends_day2 && a.attends_day3) return "2일(금토)";
  if (a.attends_day1 && a.attends_day2) return "2일(목금)";
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

  // 수동 입력 모달
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // 엑셀 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  // 삭제
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      let rows = (data as unknown as AttendeeRow[]) ?? [];
      if (filterAssigned === "yes") rows = rows.filter((a) => a.group_assignments?.[0]?.retreat_groups);
      else if (filterAssigned === "no") rows = rows.filter((a) => !a.group_assignments?.[0]?.retreat_groups);
      setAttendees(rows);
      setTotal(count ?? 0);
    } catch { setAttendees([]); }
    finally { setLoading(false); }
  }, [page, sortKey, sortDir, filterGender, filterAssigned, searchName]);

  useEffect(() => { fetchAttendees(); }, [fetchAttendees]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  };

  // ── 수동 등록 ──────────────────────────────────────
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!form.gender) { setAddError("성별을 선택해 주세요."); return; }
    const birthYear = parseInt(form.birth_year);
    if (isNaN(birthYear) || birthYear < 1955 || birthYear > 2015) { setAddError("올바른 생년 4자리를 입력해 주세요."); return; }

    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, birth_year: birthYear }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setAddError(data.error ?? "등록 실패"); return; }
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setPage(0);
      await fetchAttendees();
    } catch { setAddError("네트워크 오류"); }
    finally { setAddLoading(false); }
  };

  // ── 엑셀 업로드 ───────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setImportError("");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/admin/attendees/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.error) { setImportError(data.error ?? "임포트 실패"); return; }
      setImportResult(data as ImportResult);
      setPage(0);
      await fetchAttendees();
    } catch { setImportError("네트워크 오류"); }
    finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── 삭제 ──────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name}을(를) 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/attendees?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error ?? "삭제 실패"); return; }
      await fetchAttendees();
    } catch { alert("네트워크 오류"); }
    finally { setDeletingId(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const SortIcon = ({ col }: { col: typeof sortKey }) =>
    sortKey === col ? <span className="ml-1 text-gold">{sortDir === "asc" ? "↑" : "↓"}</span>
      : <span className="ml-1 text-slate-600">↕</span>;

  return (
    <main className="min-h-screen bg-navy flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">참석자 관리</h1>
            <p className="text-slate-400 text-xs">총 {total}명</p>
          </div>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex items-center gap-2">
          {/* 엑셀 업로드 */}
          <label className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors ${importing ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-green-800/60 hover:bg-green-700/60 border border-green-600/40 text-green-300"}`}>
            {importing ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>업로드 중...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>엑셀 업로드</>
            )}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} disabled={importing} />
          </label>

          {/* 수동 등록 */}
          <button
            onClick={() => { setShowAddModal(true); setAddError(""); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg bg-gold/20 hover:bg-gold/30 border border-gold/40 text-gold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            수동 등록
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-4">
        {/* 임포트 결과 */}
        {importResult && (
          <div className="mb-4 bg-green-900/30 border border-green-700/40 rounded-xl p-4">
            <p className="text-green-300 font-semibold text-sm mb-1">
              엑셀 임포트 완료: {importResult.inserted}명 등록 (전체 {importResult.total}행 중 유효 {importResult.valid}명)
            </p>
            {importResult.skipped > 0 && (
              <details className="mt-1">
                <summary className="text-yellow-400 text-xs cursor-pointer">스킵 {importResult.skipped}행 보기</summary>
                <ul className="mt-1 text-yellow-300 text-xs space-y-0.5 pl-3">
                  {importResult.skipped_rows.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </details>
            )}
            {importResult.errors.length > 0 && (
              <ul className="mt-1 text-red-300 text-xs">
                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            <button onClick={() => setImportResult(null)} className="mt-2 text-slate-500 text-xs hover:text-slate-300">닫기</button>
          </div>
        )}
        {importError && (
          <div className="mb-4 bg-red-900/30 border border-red-700/40 rounded-xl p-3">
            <p className="text-red-300 text-sm">{importError}</p>
            <button onClick={() => setImportError("")} className="mt-1 text-slate-500 text-xs hover:text-slate-300">닫기</button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text" value={searchName}
            onChange={(e) => { setSearchName(e.target.value); setPage(0); }}
            placeholder="이름 검색..."
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold w-36"
          />
          <select value={filterGender} onChange={(e) => { setFilterGender(e.target.value as typeof filterGender); setPage(0); }}
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold">
            <option value="">성별 전체</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
          <select value={filterAssigned} onChange={(e) => { setFilterAssigned(e.target.value as typeof filterAssigned); setPage(0); }}
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold">
            <option value="">배정 여부 전체</option>
            <option value="yes">배정 완료</option>
            <option value="no">미배정</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-mid border-b border-slate-700">
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("full_name")}>이름 <SortIcon col="full_name" /></th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">교회</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">성별</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("birth_year")}>생년 <SortIcon col="birth_year" /></th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">참석</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">숙박</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">조</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center">
                  <svg className="w-5 h-5 text-gold animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </td></tr>
              ) : attendees.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">참석자 데이터가 없습니다.</td></tr>
              ) : (
                attendees.map((a) => {
                  const group = a.group_assignments?.[0]?.retreat_groups;
                  return (
                    <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{a.full_name}</td>
                      <td className="px-4 py-3 text-slate-300">{a.churches?.canonical_name ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${a.gender === "male" ? "bg-blue-900/30 border-blue-700/40 text-blue-300" : "bg-pink-900/30 border-pink-700/40 text-pink-300"}`}>
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
                          <span className="text-xs bg-gold/20 text-gold border border-gold/30 px-2 py-0.5 rounded-full">{group.group_number}조</span>
                        ) : (
                          <span className="text-xs text-slate-600">미배정</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDelete(a.id, a.full_name)}
                          disabled={deletingId === a.id}
                          className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40 p-1"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg disabled:opacity-40 hover:border-gold hover:text-gold text-slate-300 transition-colors">이전</button>
            <span className="text-slate-400 text-sm px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm border border-slate-600 rounded-lg disabled:opacity-40 hover:border-gold hover:text-gold text-slate-300 transition-colors">다음</button>
          </div>
        )}
      </div>

      {/* ── 수동 등록 모달 ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md bg-navy-mid border border-slate-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-white font-bold text-base">참석자 수동 등록</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* 이름 */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">이름 <span className="text-red-400">*</span></label>
                <input type="text" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="홍길동" required
                  className="w-full bg-navy border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>

              {/* 성별 */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">성별 <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  {(["male", "female"] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setForm((f) => ({ ...f, gender: g }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${form.gender === g ? (g === "male" ? "bg-blue-900/60 border-blue-500 text-blue-300" : "bg-pink-900/60 border-pink-500 text-pink-300") : "bg-navy border-slate-600 text-slate-400 hover:border-slate-500"}`}>
                      {g === "male" ? "남성" : "여성"}
                    </button>
                  ))}
                </div>
              </div>

              {/* 생년 */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">생년 (4자리) <span className="text-red-400">*</span></label>
                <input type="number" value={form.birth_year} onChange={(e) => setForm((f) => ({ ...f, birth_year: e.target.value }))}
                  placeholder="1998" min={1955} max={2015} required
                  className="w-full bg-navy border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>

              {/* 교회 */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">소속 교회 <span className="text-red-400">*</span></label>
                <input type="text" value={form.church_name} onChange={(e) => setForm((f) => ({ ...f, church_name: e.target.value }))}
                  placeholder="명륜교회" required
                  className="w-full bg-navy border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>

              {/* 참석일 */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">참석일</label>
                <div className="flex gap-2">
                  {[
                    { key: "attends_day1" as const, label: "목 (7/30)" },
                    { key: "attends_day2" as const, label: "금 (7/31)" },
                    { key: "attends_day3" as const, label: "토 (8/1)" },
                  ].map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${form[key] ? "bg-gold/20 border-gold/50 text-gold" : "bg-navy border-slate-600 text-slate-500"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 숙박 */}
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm((f) => ({ ...f, lodging_required: !f.lodging_required }))}
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.lodging_required ? "bg-gold" : "bg-slate-600"}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.lodging_required ? "translate-x-5" : "translate-x-1"}`} />
                </button>
                <span className="text-slate-300 text-sm">숙박 필요</span>
              </div>

              {/* 티셔츠 */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">티셔츠 사이즈</label>
                <select value={form.shirt_size} onChange={(e) => setForm((f) => ({ ...f, shirt_size: e.target.value }))}
                  className="w-full bg-navy border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold">
                  <option value="">선택 안함</option>
                  {["XS","S","M","L","XL","2XL","3XL"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* 비고 */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">관리자 메모</label>
                <textarea value={form.admin_notes} onChange={(e) => setForm((f) => ({ ...f, admin_notes: e.target.value }))}
                  placeholder="특이사항 등..." rows={2}
                  className="w-full bg-navy border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-none" />
              </div>

              {addError && <p className="text-red-400 text-sm">{addError}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:border-slate-400 transition-colors">
                  취소
                </button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 py-3 rounded-xl bg-gold text-navy text-sm font-bold disabled:opacity-60 hover:bg-yellow-400 transition-colors">
                  {addLoading ? "등록 중..." : "등록하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
