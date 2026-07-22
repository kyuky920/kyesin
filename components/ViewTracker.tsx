"use client";

import { useEffect } from "react";

export default function ViewTracker({ attendeeId }: { attendeeId: string }) {
  useEffect(() => {
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendee_id: attendeeId }),
    }).catch(() => {});
  }, [attendeeId]);

  return null;
}
