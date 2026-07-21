"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface AttendeeRow {
  id: string;
  full_name: string;
  gender: "male" | "female";
  birth_year: number;
  is_staff: boolean;
  is_leader: boolean;
  attends_day1: boolean;
  attends_day2: boolean;
  attends_day3: boolean;
  lodging_required: boolean;
  churches: { canonical_name: string } | null;
  group_assignments: { retreat_groups: { group_code: number } | null }[];
}

interface AddForm {
  full_name: string;
  gender: "male" | "female" | "";
  birth_year: string;
  church_name: string;
  lodging_required: boolean;
  attends_day1: boolean;
  attends_day2: boolean;
  attends_day3: boolean;
  is_staff: boolean;
  is_leader: boolean;
  admin_notes: string;
}

interface ImportResult {
  total: number; valid: number; inserted: number; skipped: number;
  skipped_rows: string[]; errors: string[];
}

const EMPTY_FORM: AddForm = {
  full_name: "", gender: "", birth_year: "", church_name: "",
  lodging_required: false, attends_day1: true, attends_day2: true, attends_day3: true,
  is_staff: false, is_leader: false, admin_notes: "",
};

const CACHE_KEY = "keysin2026_admin_attendees";
const CACHE_TS_KEY = "keysin2026_admin_attendees_ts";
const CACHE_TTL_MS = 5 * 60 * 1000;

function attendanceLabel(a: AttendeeRow): string {
  const cnt = [a.attends_day1, a.attends_day2, a.attends_day3].filter(Boolean).length;
  if (cnt === 3) return "3일";
  if (a.attends_day2 && a.attends_day3) return "2일(금토)";
  if (a.attends_day1 && a.attends_day2) return "2일(목금)";
  return `${cnt}일`;
}

function getAgeBand(birth_year: number): "20_24" | "25_28" | "29_plus" | null {
  if (birth_year >= 2002 && birth_year <= 2006) return "20_24";
  if (birth_year >= 1998 && birth_year <= 2001) return "25_28";
  if (birth_year <= 1997 && birth_year > 1900) return "29_plus";
  return null;
}

function AttendeesContent() {
  const sp = useSearchParams();

  const [allAttendees, setAllAttendees] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<"full_name" | "birth_year" | "church_name">("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterGender, setFilterGender] = useState<"" | "male" | "female">((sp.get("gender") as "" | "male" | "female") ?? "");
  const [filterAssigned, setFilterAssigned] = useState<"" | "yes" | "no">((sp.get("assigned") as "" | "yes" | "no") ?? "");
  const [filterStaff, setFilterStaff] = useState<"" | "yes" | "no">((sp.get("staff") as "" | "yes" | "no") ?? "");
  const [filterAgeBand, setFilterAgeBand] = useState<"" | "20_24" | "25_28" | "29_plus">((sp.get("age_band") as "" | "20_24" | "25_28" | "29_plus") ?? "");
  const [filterAttendance, setFilterAttendance] = useState<"" | "full" | "fri_sat" | "thu_fri">((sp.get("attendance") as "" | "full" | "fri_sat" | "thu_fri") ?? "");
  const [searchInput, setSearchInput] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");

  const leaderFileRef = useRef<HTMLInputElement>(null);
  const [importingLeaders, setImportingLeaders] = useState(false);
  const [leaderResult, setLeaderResult] = useState<{ updated: number; matched: string[]; not_found: string[]; ambiguous: string[] } | null>(null);
  const [leaderError, setLeaderError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const loadAllAttendees = useCallback(async (invalidate = false) => {
    if (!invalidate) {
      try {
        const ts = sessionStorage.getItem(CACHE_TS_KEY);
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (ts && cached && Date.now() - parseInt(ts) < CACHE_TTL_MS) {
          setAllAttendees(JSON.parse(cached) as AttendeeRow[]);
          setLoading(false);
          return;
        }
      } catch { /* ignore */ }
    } else {
      try {
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(CACHE_TS_KEY);
      } catch { /* ignore */ }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/attendees?all=true");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "조회 오류");
      const rows = json.data as AttendeeRow[];
      setAllAttendees(rows);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(rows));
        sessionStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      } catch { /* ignore */ }
    } catch {
      setAllAttendees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAllAttendees(); }, [loadAllAttendees]);

  const filteredSorted = useMemo(() => {
    let list = allAttendees;

    if (searchInput) {
      const q = searchInput.toLowerCase();
      list = list.filter((a) =>
        a.full_name.toLowerCase().includes(q) ||
        (a.churches?.canonical_name ?? "").toLowerCase().includes(q)
      );
    }

    if (filterGender) list = list.filter((a) => a.gender === filterGender);
    if (filterStaff === "yes") list = list.filter((a) => a.is_staff);
    else if (filterStaff === "no") list = list.filter((a) => !a.is_staff);
    if (filterAssigned === "yes") list = list.filter((a) => !!a.group_assignments?.[0]?.retreat_groups);
    else if (filterAssigned === "no") list = list.filter((a) => !a.group_assignments?.[0]?.retreat_groups);
    if (filterAgeBand) list = list.filter((a) => getAgeBand(a.birth_year) === filterAgeBand);
    if (filterAttendance === "full") list = list.filter((a) => a.attends_day1 && a.attends_day2 && a.attends_day3);
    else if (filterAttendance === "fri_sat") list = list.filter((a) => !a.attends_day1 && a.attends_day2 && a.attends_day3);
    else if (filterAttendance === "thu_fri") list = list.filter((a) => a.attends_day1 && a.attends_day2 && !a.attends_day3);

    const asc = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((x, y) => {
      if (sortKey === "full_name") {
        return asc * x.full_name.localeCompare(y.full_name, "ko");
      }
      if (sortKey === "birth_year") {
        return asc * (x.birth_year - y.birth_year);
      }
      const cx = x.churches?.canonical_name ?? "";
      const cy = y.churches?.canonical_name ?? "";
      const churchCmp = cx.localeCompare(cy, "ko");
      if (churchCmp !== 0) return asc * churchCmp;
      return x.full_name.localeCompare(y.full_name, "ko");
    });

    return list;
  }, [allAttendees, searchInput, filterGender, filterStaff, filterAssigned, filterAgeBand, filterAttendance, sortKey, sortDir]);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleToggleRole = async (a: AttendeeRow, field: "is_staff" | "is_leader") => {
    setTogglingId(a.id);
    try {
      const res = await fetch(`/api/admin/attendees?id=${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !a[field] }),
      });
      if (res.ok) {
        setAllAttendees((prev) => prev.map((r) => r.id === a.id ? { ...r, [field]: !a[field] } : r));
      }
    } catch { /* ignore */ }
    finally { setTogglingId(null); }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!form.gender) { setAddError("성별을 선택해 주세요."); return; }
    const birthYear = parseInt(form.birth_year);
    if (isNaN(birthYear) || birthYear < 1940 || birthYear > 2015) { setAddError("올바른 생년 4자리를 입력해 주세요."); return; }

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
      await loadAllAttendees(true);
    } catch { setAddError("네트워크 오류"); }
    finally { setAddLoading(false); }
  };

  const handleLeaderFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingLeaders(true); setLeaderResult(null); setLeaderError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/attendees/import-leaders", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.error) { setLeaderError(data.error ?? "업로드 실패"); return; }
      setLeaderResult(data);
      await loadAllAttendees(true);
    } catch { setLeaderError("네트워크 오류"); }
    finally { setImportingLeaders(false); if (leaderFileRef.current) leaderFileRef.current.value = ""; }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null); setImportError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/attendees/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.error) { setImportError(data.error ?? "임포트 실패"); return; }
      setImportResult(data as ImportResult);
      await loadAllAttendees(true);
    } catch { setImportError("네트워크 오류"); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      const res = await fetch("/api/admin/attendees", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error ?? "초기화 실패"); return; }
      setShowClearModal(false);
      await loadAllAttendees(true);
    } catch { alert("네트워크 오류"); }
    finally { setClearingAll(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name}을(를) 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/attendees?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error ?? "삭제 실패"); return; }
      await loadAllAttendees(true);
    } catch { alert("네트워크 오류"); }
    finally { setDeletingId(null); }
  };

  const SortIcon = ({ col }: { col: typeof sortKey }) =>
    sortKey === col
      ? <span className="ml-1 text-gold">{sortDir === "asc" ? "↑" : "↓"}</span>
      : <span className="ml-1 text-slate-600">↕</span>;

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
            <h1 className="text-white font-bold text-lg">참석자 관리</h1>
            <p className="text-slate-400 text-xs">총 {allAttendees.length}명</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClearModal(true)}
            title="전체 참석자 초기화"
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border border-red-800/50 bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:border-red-700/60 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            전체 초기화
          </button>

          <button
            onClick={() => loadAllAttendees(true)}
            title="새로고침"
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <label className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors ${importingLeaders ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-blue-900/50 hover:bg-blue-800/50 border border-blue-600/40 text-blue-300"}`}>
            {importingLeaders
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>처리 중...</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>조장 업로드</>}
            <input ref={leaderFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleLeaderFileChange} disabled={importingLeaders} />
          </label>

          <label className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors ${importing ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-green-800/60 hover:bg-green-700/60 border border-green-600/40 text-green-300"}`}>
            {importing
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>업로드 중...</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>엑셀 업로드</>}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} disabled={importing} />
          </label>

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
        {importResult && (
          <div className="mb-4 bg-green-900/30 border border-green-700/40 rounded-xl p-4">
            <p className="text-green-300 font-semibold text-sm mb-1">엑셀 임포트 완료: {importResult.inserted}명 등록 (전체 {importResult.total}행 중 유효 {importResult.valid}명)</p>
            {importResult.skipped > 0 && (
              <details className="mt-1">
                <summary className="text-yellow-400 text-xs cursor-pointer">스킵 {importResult.skipped}행 보기</summary>
                <ul className="mt-1 text-yellow-300 text-xs space-y-0.5 pl-3">{importResult.skipped_rows.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </details>
            )}
            {importResult.errors.length > 0 && <ul className="mt-1 text-red-300 text-xs">{importResult.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
            <button onClick={() => setImportResult(null)} className="mt-2 text-slate-500 text-xs hover:text-slate-300">닫기</button>
          </div>
        )}
        {importError && (
          <div className="mb-4 bg-red-900/30 border border-red-700/40 rounded-xl p-3">
            <p className="text-red-300 text-sm">{importError}</p>
            <button onClick={() => setImportError("")} className="mt-1 text-slate-500 text-xs hover:text-slate-300">닫기</button>
          </div>
        )}

        {leaderResult && (
          <div className="mb-4 bg-blue-900/30 border border-blue-700/40 rounded-xl p-4">
            <p className="text-blue-300 font-semibold text-sm mb-1">조장 업로드 완료: {leaderResult.updated}명 지정</p>
            {leaderResult.not_found.length > 0 && (
              <details className="mt-1">
                <summary className="text-yellow-400 text-xs cursor-pointer">미매칭 {leaderResult.not_found.length}명 보기</summary>
                <p className="text-yellow-300 text-xs mt-1">{leaderResult.not_found.join(", ")}</p>
              </details>
            )}
            {leaderResult.ambiguous.length > 0 && (
              <details className="mt-1">
                <summary className="text-orange-400 text-xs cursor-pointer">동명이인 {leaderResult.ambiguous.length}건 (수동 처리 필요)</summary>
                <ul className="text-orange-300 text-xs mt-1 space-y-0.5">{leaderResult.ambiguous.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </details>
            )}
            <button onClick={() => setLeaderResult(null)} className="mt-2 text-slate-500 text-xs hover:text-slate-300">닫기</button>
          </div>
        )}
        {leaderError && (
          <div className="mb-4 bg-red-900/30 border border-red-700/40 rounded-xl p-3">
            <p className="text-red-300 text-sm">{leaderError}</p>
            <button onClick={() => setLeaderError("")} className="mt-1 text-slate-500 text-xs hover:text-slate-300">닫기</button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text" value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="이름/교회 검색..."
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold w-36"
          />
          <select value={filterGender} onChange={(e) => setFilterGender(e.target.value as typeof filterGender)}
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold">
            <option value="">성별 전체</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
          <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value as typeof filterStaff)}
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold">
            <option value="">역할 전체</option>
            <option value="yes">교역자만</option>
            <option value="no">일반 참석자</option>
          </select>
          <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value as typeof filterAssigned)}
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold">
            <option value="">배정 전체</option>
            <option value="yes">배정 완료</option>
            <option value="no">미배정</option>
          </select>
          <select value={filterAgeBand} onChange={(e) => setFilterAgeBand(e.target.value as typeof filterAgeBand)}
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold">
            <option value="">연령대 전체</option>
            <option value="20_24">20–24세</option>
            <option value="25_28">25–28세</option>
            <option value="29_plus">29세+</option>
          </select>
          <select value={filterAttendance} onChange={(e) => setFilterAttendance(e.target.value as typeof filterAttendance)}
            className="bg-navy-mid border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-gold">
            <option value="">참석 전체</option>
            <option value="full">3일 (목금토)</option>
            <option value="fri_sat">2일 (금토)</option>
            <option value="thu_fri">2일 (목금)</option>
          </select>
          {(filterGender || filterAssigned || filterStaff || filterAgeBand || filterAttendance || searchInput) && (
            <button onClick={() => { setFilterGender(""); setFilterAssigned(""); setFilterStaff(""); setFilterAgeBand(""); setFilterAttendance(""); setSearchInput(""); }}
              className="text-xs text-slate-400 hover:text-red-400 border border-slate-600 px-3 py-2 rounded-lg transition-colors">
              필터 초기화
            </button>
          )}
        </div>

        {filteredSorted.length > 100 && (
          <p className="text-slate-400 text-xs mb-2">전체 {filteredSorted.length}명 표시 중</p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-mid border-b border-slate-700">
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("full_name")}>
                  이름 <SortIcon col="full_name" />
                </th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("church_name")}>
                  교회 <SortIcon col="church_name" />
                </th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">성별</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white" onClick={() => handleSort("birth_year")}>
                  생년 <SortIcon col="birth_year" />
                </th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">참석</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">역할</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">조</th>
                <th className="px-4 py-3 w-12"></th>
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
              ) : filteredSorted.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">참석자 데이터가 없습니다.</td></tr>
              ) : (
                filteredSorted.map((a) => {
                  const group = a.group_assignments?.[0]?.retreat_groups;
                  return (
                    <tr key={a.id} className={`border-b border-slate-800 transition-colors ${a.is_staff ? "bg-amber-900/10 hover:bg-amber-900/20" : "hover:bg-slate-800/30"}`}>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{a.full_name}</span>
                        {a.is_leader && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">조장</span>
                        )}
                        {a.is_staff && (
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">교역자</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{a.churches?.canonical_name ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${a.gender === "male" ? "bg-blue-900/30 border-blue-700/40 text-blue-300" : "bg-pink-900/30 border-pink-700/40 text-pink-300"}`}>
                          {a.gender === "male" ? "남" : "여"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{a.birth_year}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{attendanceLabel(a)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleRole(a, "is_leader")}
                            disabled={togglingId === a.id || a.is_staff}
                            title={a.is_leader ? "조장 해제" : "조장 지정"}
                            className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors disabled:opacity-40 ${
                              a.is_leader
                                ? "bg-blue-500/25 border-blue-400/50 text-blue-300"
                                : "bg-transparent border-slate-600 text-slate-500 hover:border-blue-500/50 hover:text-blue-400"
                            }`}
                          >
                            조장
                          </button>
                          <button
                            onClick={() => handleToggleRole(a, "is_staff")}
                            disabled={togglingId === a.id}
                            title={a.is_staff ? "교역자 해제" : "교역자 지정"}
                            className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${
                              a.is_staff
                                ? "bg-amber-500/25 border-amber-400/50 text-amber-300"
                                : "bg-transparent border-slate-600 text-slate-500 hover:border-amber-500/50 hover:text-amber-400"
                            }`}
                          >
                            교역자
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {group ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs bg-gold/20 text-gold border border-gold/30 px-2 py-0.5 rounded-full">{group.group_code}조</span>
                            {a.is_leader && <span className="text-[9px] text-blue-400 font-bold">조장</span>}
                          </div>
                        ) : a.is_staff ? (
                          <span className="text-xs text-amber-600">해당없음</span>
                        ) : (
                          <span className="text-xs text-slate-600">미배정</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDelete(a.id, a.full_name)}
                          disabled={deletingId === a.id}
                          className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40 p-1"
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
      </div>

      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm bg-navy-mid border border-red-800/50 rounded-2xl overflow-hidden">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-900/40 border border-red-700/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <h2 className="text-white font-bold text-base">전체 참석자 초기화</h2>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                현재 수련회에 등록된 <span className="text-red-300 font-semibold">전체 {allAttendees.length}명</span>의 참석자 데이터가 삭제됩니다.
              </p>
              <p className="text-slate-500 text-xs mt-2">이 작업은 되돌릴 수 없습니다.</p>
            </div>
            <div className="flex gap-2 px-6 pb-5">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={clearingAll}
                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:border-slate-400 disabled:opacity-40"
              >
                취소
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-60 transition-colors"
              >
                {clearingAll ? "삭제 중..." : "전체 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md bg-navy-mid border border-slate-700 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-white font-bold text-base">참석자 수동 등록</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">이름 <span className="text-red-400">*</span></label>
                <input type="text" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="홍길동" required
                  className="w-full bg-navy border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">성별 <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  {(["male", "female"] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setForm((f) => ({ ...f, gender: g }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${form.gender === g ? (g === "male" ? "bg-blue-900/60 border-blue-500 text-blue-300" : "bg-pink-900/60 border-pink-500 text-pink-300") : "bg-navy border-slate-600 text-slate-400"}`}>
                      {g === "male" ? "남성" : "여성"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">생년 (4자리) <span className="text-red-400">*</span></label>
                <input type="number" value={form.birth_year} onChange={(e) => setForm((f) => ({ ...f, birth_year: e.target.value }))}
                  placeholder="1975" min={1940} max={2015} required
                  className="w-full bg-navy border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">소속 교회 <span className="text-red-400">*</span></label>
                <input type="text" value={form.church_name} onChange={(e) => setForm((f) => ({ ...f, church_name: e.target.value }))}
                  placeholder="명륜교회" required
                  className="w-full bg-navy border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold" />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-400 text-xs font-medium">역할</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setForm((f) => ({ ...f, is_leader: !f.is_leader, is_staff: f.is_leader ? f.is_staff : false }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${form.is_leader ? "bg-blue-900/60 border-blue-500 text-blue-300" : "bg-navy border-slate-600 text-slate-400"}`}>
                    조장
                  </button>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, is_staff: !f.is_staff, is_leader: f.is_staff ? f.is_leader : false }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${form.is_staff ? "bg-amber-900/60 border-amber-500 text-amber-300" : "bg-navy border-slate-600 text-slate-400"}`}>
                    교역자
                  </button>
                  <button type="button" onClick={() => setForm((f) => ({ ...f, is_leader: false, is_staff: false }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${!form.is_leader && !form.is_staff ? "bg-navy-mid border-slate-400 text-white" : "bg-navy border-slate-600 text-slate-400"}`}>
                    일반
                  </button>
                </div>
                {form.is_staff && <p className="text-amber-400/70 text-xs">조편성에서 제외됩니다.</p>}
                {form.is_leader && <p className="text-blue-400/70 text-xs">조장으로 지정되어 조편성 시 조가 기준이 됩니다.</p>}
              </div>

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

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm((f) => ({ ...f, lodging_required: !f.lodging_required }))}
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.lodging_required ? "bg-gold" : "bg-slate-600"}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.lodging_required ? "translate-x-5" : "translate-x-1"}`} />
                </button>
                <span className="text-slate-300 text-sm">숙박 필요</span>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">메모 (선택)</label>
                <textarea value={form.admin_notes} onChange={(e) => setForm((f) => ({ ...f, admin_notes: e.target.value }))}
                  placeholder="특이사항 등..." rows={2}
                  className="w-full bg-navy border border-slate-600 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold resize-none" />
              </div>

              {addError && <p className="text-red-400 text-sm">{addError}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:border-slate-400">
                  취소
                </button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 py-3 rounded-xl bg-gold text-navy text-sm font-bold disabled:opacity-60 hover:bg-yellow-400">
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

export default function AttendeesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy flex items-center justify-center"><svg className="w-6 h-6 text-gold animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>}>
      <AttendeesContent />
    </Suspense>
  );
}
