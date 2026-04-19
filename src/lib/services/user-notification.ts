import d1 from "@/lib/api/d1-client";
import {
  triggerNotification,
  triggerNotificationBatch,
} from "@/lib/pusher";

export type UserNotificationType =
  | "chat_reply"
  | "promotion"
  | "partner_approved"
  | "partner_rejected";

export interface InsertUserNotificationInput {
  app_user_id: number;
  type: UserNotificationType;
  title: string;
  body?: string | null;
  image_url?: string | null;
  reference_type?: "chat_session" | "listing" | "partner" | null;
  reference_id?: number | null;
  action_url?: string | null;
}

/**
 * Insert one user-notification row and fire the Pusher event on
 * `private-user-{app_user_id}`. Failures are logged and swallowed —
 * the inbox row is best-effort and must never block the caller.
 */
export async function insertUserNotification(
  input: InsertUserNotificationInput,
): Promise<{ id: number } | null> {
  try {
    const result = await d1.query<{ id: number }>(
      `INSERT INTO user_notification
         (app_user_id, type, title, body, image_url, reference_type, reference_id, action_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        input.app_user_id,
        input.type,
        input.title,
        input.body ?? null,
        input.image_url ?? null,
        input.reference_type ?? null,
        input.reference_id ?? null,
        input.action_url ?? null,
      ],
    );
    const id = result.results[0]?.id;
    if (!id) return null;

    await triggerNotification(input.app_user_id, "new-notification", {
      id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      image_url: input.image_url ?? null,
      reference_type: input.reference_type ?? null,
      reference_id: input.reference_id ?? null,
      action_url: input.action_url ?? null,
      is_read: 0,
      created_at: new Date().toISOString(),
      read_at: null,
    }).catch((err) => {
      console.error("[user-notification] pusher trigger failed:", err);
    });

    return { id };
  } catch (error) {
    console.error("[user-notification] insert failed:", error);
    return null;
  }
}

/**
 * Bulk-insert one row per distinct app_user_id that has at least one
 * registered device token. Used for broadcasts (promotions). Fires a
 * single batched Pusher event covering all recipients.
 *
 * Pusher payload does NOT include `id` (the batched event goes to all
 * channels with the same body). Clients should treat a `new-notification`
 * event without an `id` as a signal to refetch their inbox rather than
 * optimistically prepend.
 */
export async function insertUserNotificationBroadcast(
  payload: Omit<InsertUserNotificationInput, "app_user_id">,
): Promise<void> {
  const ROWS_PER_INSERT = 10; // 10 rows × 8 cols = 80 params, safely under D1's ~100 limit

  try {
    const users = await d1.query<{ app_user_id: number }>(
      `SELECT DISTINCT app_user_id
         FROM device_token
        WHERE app_user_id IS NOT NULL`,
    );
    const ids = users.results.map((r) => r.app_user_id);
    if (ids.length === 0) return;

    // Insert in chunks to stay under D1's parameter-count limit.
    // Each chunk is isolated — one bad chunk does not abort the rest.
    for (let i = 0; i < ids.length; i += ROWS_PER_INSERT) {
      const chunk = ids.slice(i, i + ROWS_PER_INSERT);
      const placeholders = chunk
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?)")
        .join(",");
      const params: (number | string | null)[] = [];
      for (const id of chunk) {
        params.push(
          id,
          payload.type,
          payload.title,
          payload.body ?? null,
          payload.image_url ?? null,
          payload.reference_type ?? null,
          payload.reference_id ?? null,
          payload.action_url ?? null,
        );
      }
      try {
        await d1.query(
          `INSERT INTO user_notification
             (app_user_id, type, title, body, image_url, reference_type, reference_id, action_url)
           VALUES ${placeholders}`,
          params,
        );
      } catch (err) {
        console.error(
          `[user-notification] broadcast chunk at offset ${i} failed:`,
          err,
        );
      }
    }

    // Single batched Pusher call fans out to all recipients.
    await triggerNotificationBatch(ids, "new-notification", {
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      image_url: payload.image_url ?? null,
      reference_type: payload.reference_type ?? null,
      reference_id: payload.reference_id ?? null,
      action_url: payload.action_url ?? null,
      is_read: 0,
      created_at: new Date().toISOString(),
      read_at: null,
    }).catch((err) => {
      console.error("[user-notification] broadcast pusher batch failed:", err);
    });
  } catch (error) {
    console.error("[user-notification] broadcast insert failed:", error);
  }
}
