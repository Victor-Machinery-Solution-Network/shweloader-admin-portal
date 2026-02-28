"use server";

import { d1 } from "@/lib/api/d1-client";
import { headers } from "next/headers";

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
 * Fire-and-forget — errors are logged but never thrown to callers.
 */
export async function auditLog(
  userId: number | null,
  description: string,
): Promise<void> {
  try {
    await d1.query(
      "INSERT INTO admin_activity_log (user_id, activity_description) VALUES (?, ?)",
      [userId, description],
    );
  } catch (error) {
    console.error("[audit] Failed to write log:", error);
  }
}
