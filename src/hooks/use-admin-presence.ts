"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ref, set, onDisconnect } from "firebase/database";
import { rtdb } from "@/lib/firebase-client";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Writes `/admin-presence/{adminId}` when the admin is on the chat page.
 * Removes presence on idle (5 min), tab hidden, unmount, or disconnect.
 */
export function useAdminPresence() {
  const { data: session } = useSession();
  const adminId = session?.user?.id;
  const presenceRef = useRef<ReturnType<typeof ref> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWrittenRef = useRef(false);

  const writePresence = useCallback(() => {
    if (!adminId) return;
    const dbRef = ref(rtdb, `admin-presence/${adminId}`);
    presenceRef.current = dbRef;
    set(dbRef, true);
    onDisconnect(dbRef).remove();
    isWrittenRef.current = true;
  }, [adminId]);

  const removePresence = useCallback(() => {
    if (presenceRef.current && isWrittenRef.current) {
      set(presenceRef.current, null);
      isWrittenRef.current = false;
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    // Re-add presence if it was removed due to idle
    if (!isWrittenRef.current && adminId) {
      writePresence();
    }
    idleTimerRef.current = setTimeout(() => {
      removePresence();
    }, IDLE_TIMEOUT);
  }, [adminId, writePresence, removePresence]);

  useEffect(() => {
    if (!adminId) return;

    // Write presence on mount
    writePresence();
    resetIdleTimer();

    // Activity listeners for idle detection
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"] as const;
    const onActivity = () => resetIdleTimer();
    events.forEach((e) => document.addEventListener(e, onActivity, { passive: true }));

    // Visibility change
    const onVisibility = () => {
      if (document.hidden) {
        removePresence();
      } else {
        writePresence();
        resetIdleTimer();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Best-effort cleanup on tab close
    const onBeforeUnload = () => removePresence();
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      removePresence();
      events.forEach((e) => document.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [adminId, writePresence, removePresence, resetIdleTimer]);
}
