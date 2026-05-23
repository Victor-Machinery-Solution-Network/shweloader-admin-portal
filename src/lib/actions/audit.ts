"use server";

import { d1 } from "@/lib/api/d1-client";
import { headers } from "next/headers";
import { waitUntil } from "@vercel/functions";

/**
 * Extract the client IP from request headers.
 * Vercel/Cloudflare set x-forwarded-for; falls back to x-real-ip.
 */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip");
}

/**
 * Write an entry to admin_activity_log.
 *
 * Fire-and-forget — errors are logged but never thrown to callers. Callers
 * invoke this WITHOUT `await` (118 callsites across src/lib/actions/), which
 * means on Vercel serverless the runtime could freeze/terminate the function
 * container after the Server Action's response is sent, dropping in-flight
 * audit writes.
 *
 * We use `@vercel/functions`' `waitUntil` to keep the container alive until
 * the INSERT completes. On non-Vercel runtimes (local dev) `waitUntil` is a
 * graceful no-op — the promise still runs and the local Node process stays
 * alive long enough for it to complete.
 *
 * Net effect: callsites stay synchronous-looking (no await), latency on
 * mutations is unchanged, but audit rows actually land.
 */
export async function auditLog(
  userId: number | null,
  description: string,
): Promise<void> {
  const writePromise = (async () => {
    try {
      await d1.query(
        "INSERT INTO admin_activity_log (user_id, activity_description) VALUES (?, ?)",
        [userId, description],
      );
    } catch (error) {
      console.error("[audit] Failed to write log:", error);
    }
  })();

  // `waitUntil` is a Vercel-native API; safe-call so this remains usable in
  // any non-Vercel runtime (it's a no-op there).
  try {
    waitUntil(writePromise);
  } catch {
    // waitUntil not available — the promise is still running, just without
    // a guarantee that the container stays alive. Acceptable fallback.
  }
}
