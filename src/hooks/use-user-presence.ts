"use client";

import { useState, useEffect, useRef } from "react";
import { ref, onValue, off, type DataSnapshot } from "firebase/database";
import { rtdb } from "@/lib/firebase-client";

type PresenceStatus = "online" | "recently-active" | "offline";

interface UserPresenceResult {
  status: PresenceStatus;
  /** e.g. "Active 3 mins ago" — null when online or offline */
  lastActiveText: string | null;
}

function computeStatus(lastActiveAt: number | null): UserPresenceResult {
  if (lastActiveAt === null) {
    return { status: "offline", lastActiveText: null };
  }

  const diffMs = Date.now() - lastActiveAt;
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 5) {
    return { status: "online", lastActiveText: null };
  }

  // Recently active
  let text: string;
  if (diffMins < 60) {
    text = `Active ${diffMins}m ago`;
  } else if (diffMins < 1440) {
    text = `Active ${Math.floor(diffMins / 60)}h ago`;
  } else {
    text = `Active ${Math.floor(diffMins / 1440)}d ago`;
  }

  return { status: "recently-active", lastActiveText: text };
}

/**
 * Reads `/user-presence/{appUserId}` and returns real-time status.
 * - online: node exists + lastActiveAt < 5 min
 * - recently-active: node exists + lastActiveAt >= 5 min
 * - offline: no node
 */
export function useUserPresence(appUserId: number | null): UserPresenceResult {
  const [result, setResult] = useState<UserPresenceResult>({
    status: "offline",
    lastActiveText: null,
  });
  const lastActiveRef = useRef<number | null>(null);

  useEffect(() => {
    if (!appUserId) return;

    const dbRef = ref(rtdb, `user-presence/${appUserId}`);

    const onData = (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) {
        lastActiveRef.current = null;
        setResult({ status: "offline", lastActiveText: null });
        return;
      }
      const val = snapshot.val();
      const ts = typeof val?.lastActiveAt === "number" ? val.lastActiveAt : null;
      lastActiveRef.current = ts;
      setResult(computeStatus(ts));
    };

    onValue(dbRef, onData);

    // Re-evaluate every 60s so "X mins ago" stays current
    const interval = setInterval(() => {
      setResult(computeStatus(lastActiveRef.current));
    }, 60_000);

    return () => {
      off(dbRef, "value", onData);
      clearInterval(interval);
    };
  }, [appUserId]);

  return result;
}
