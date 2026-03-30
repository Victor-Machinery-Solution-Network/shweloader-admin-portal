"use client";

import { useEffect, useRef, useCallback } from "react";
import { logoutAction } from "@/lib/actions/auth-actions";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const THROTTLE_MS = 30_000; // Only reset timer at most every 30 seconds
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "pointermove"] as const;

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(0);

  const handleLogout = useCallback(async () => {
    await logoutAction();
    window.location.href = "/login?reason=idle";
  }, []);

  const resetTimer = useCallback(() => {
    // Throttle: skip if last reset was less than 30s ago
    const now = Date.now();
    if (now - lastActivityRef.current < THROTTLE_MS) return;
    lastActivityRef.current = now;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, IDLE_TIMEOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    // Set initial activity timestamp + start timer
    lastActivityRef.current = Date.now();
    timerRef.current = setTimeout(handleLogout, IDLE_TIMEOUT_MS);

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [resetTimer, handleLogout]);

  return <>{children}</>;
}
