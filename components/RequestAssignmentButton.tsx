"use client";

import { useState } from "react";

type State = "idle" | "loading" | "done" | "error";

export default function RequestAssignmentButton({ attendeeId, alreadyRequested }: { attendeeId: string; alreadyRequested: boolean }) {
  const [state, setState] = useState<State>(alreadyRequested ? "done" : "idle");

  const handleRequest = async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      const res = await fetch("/api/request-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendee_id: attendeeId }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-emerald-300 text-sm font-medium">조편성 요청이 전달되었습니다.</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p className="text-red-400 text-sm">요청에 실패했습니다. 다시 시도해 주세요.</p>
        </div>
        <button
          onClick={() => setState("idle")}
          className="w-full py-3 rounded-xl text-slate-400 text-sm border border-slate-700 active:scale-95 transition-transform"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleRequest}
      disabled={state === "loading"}
      className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold active:scale-95 transition-transform disabled:opacity-60"
      style={{ background: "rgba(233,185,74,0.1)", border: "1px solid rgba(233,185,74,0.35)", color: "#e9b94a" }}
    >
      {state === "loading" ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          요청 중...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          조편성 요청하기
        </>
      )}
    </button>
  );
}
