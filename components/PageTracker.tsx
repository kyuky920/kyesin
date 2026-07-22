"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "keysin2026_profile";

export default function PageTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    // 어드민 페이지는 추적 제외
    if (pathname.startsWith("/admin")) return;
    // 동일 경로 중복 방지
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    let attendeeId: string | undefined;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const profile = JSON.parse(raw) as { attendee_id?: string };
        attendeeId = profile.attendee_id;
      }
    } catch {
      // ignore
    }

    fetch("/api/track-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_id: attendeeId, page_path: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
