import webpush from "web-push";

import { d1 } from "@/lib/api/d1-client";

/**
 * Web Push (browser) notifications for the public website. SERVER-ONLY.
 *
 * This module reads VAPID secrets from `process.env` and uses the Node-only
 * `web-push` library, so it must only ever be imported from server code
 * (server actions / route handlers). It mirrors the server-only convention of
 * src/lib/pusher.ts and src/lib/services/push-notification.ts (which likewise
 * don't import the `server-only` marker package).
 *
 * Subscriptions live in the shared D1 table `web_push_subscription`
 * (columns: endpoint, p256dh, auth, app_user_id, user_agent, …) and are
 * written by the public app-api worker when a user opts in. The admin portal
 * runs on the Node runtime (server actions), so the battle-tested `web-push`
 * library works here — no hand-rolled VAPID/ECDH crypto.
 *
 * Mirrors the FCM path in src/lib/services/push-notification.ts:
 * defensive, non-throwing, and prunes dead subscriptions.
 */

/** Payload shape the web service worker reads via `event.data.json()`. */
export interface WebPushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

// Singleton VAPID init — false = not configured (feature off).
let vapidConfigured: boolean | null = null;

/**
 * Lazily configure VAPID from env. Returns true once configured, false if any
 * of the three required vars is missing (feature off → callers no-op).
 */
function ensureVapid(): boolean {
  if (vapidConfigured !== null) return vapidConfigured;

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    vapidConfigured = false;
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  } catch (error) {
    // Malformed keys, bad subject (must be a mailto: or https: URL), etc.
    console.error("[web-push] setVapidDetails failed:", error);
    vapidConfigured = false;
  }
  return vapidConfigured;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send a Web Push notification to every browser the given user has subscribed.
 *
 * Defensive by contract: never throws — a push failure must NOT break the
 * caller (e.g. an admin sending a chat reply). Dead subscriptions (404/410)
 * are pruned from D1.
 */
export async function sendWebPushToUser(
  appUserId: number,
  payload: WebPushPayload,
): Promise<void> {
  try {
    if (!ensureVapid()) return; // feature off — no VAPID keys configured

    const { results: subscriptions } = await d1.query<SubscriptionRow>(
      "SELECT endpoint, p256dh, auth FROM web_push_subscription WHERE app_user_id = ?",
      [appUserId],
    );

    if (subscriptions.length === 0) return;

    const json = JSON.stringify(payload);

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            json,
          );
        } catch (error) {
          // 404 Not Found / 410 Gone → subscription is dead; prune it.
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await d1
              .query("DELETE FROM web_push_subscription WHERE endpoint = ?", [
                sub.endpoint,
              ])
              .catch(() => {});
          } else {
            // Transient/unknown error (network, 429, 5xx) — log only.
            console.error("[web-push] sendNotification failed:", error);
          }
        }
      }),
    );
  } catch (error) {
    // Anything else (D1 read failure, etc.) must never reach the caller.
    console.error("[web-push] sendWebPushToUser failed:", error);
  }
}
