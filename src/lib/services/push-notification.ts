import { getFirebaseMessaging } from '@/lib/firebase';
import { d1 } from '@/lib/api/d1-client';

// ── Types ───────────────────────────────────────────────

export interface PushPayload {
  type: string;           // 'chat_reply' | 'announcement' | 'promotion'
  title: string;
  body: string;
  referenceId?: string;
  imageUrl?: string;      // attachment image (full R2 public URL)
  avatarUrl?: string;     // sender avatar (full R2 public URL)
  data?: Record<string, string>;
}

// ── Send to specific user (all their devices) ──────────

export async function sendPushToUser(
  appUserId: number,
  payload: PushPayload,
): Promise<void> {
  try {
    const result = await d1.query<{ token: string }>(
      'SELECT token FROM device_token WHERE app_user_id = ?',
      [appUserId],
    );

    const tokens = result.results.map((r) => r.token);
    if (tokens.length === 0) return;

    await sendToTokens(tokens, payload);
  } catch (error) {
    // Push failure should never block the primary action
    console.error('[push] sendPushToUser failed:', error);
  }
}

// ── Broadcast to all devices (for announcements/promos) ─

export async function sendBroadcast(
  payload: PushPayload,
): Promise<void> {
  const BATCH_SIZE = 500;
  let offset = 0;

  while (true) {
    const result = await d1.query<{ token: string }>(
      'SELECT token FROM device_token LIMIT ? OFFSET ?',
      [BATCH_SIZE, offset],
    );

    const tokens = result.results.map((r) => r.token);
    if (tokens.length === 0) break;

    await sendToTokens(tokens, payload);
    offset += BATCH_SIZE;

    if (tokens.length < BATCH_SIZE) break;
  }
}

// ── Internal: send to a list of FCM tokens ──────────────

async function sendToTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<void> {
  const messaging = getFirebaseMessaging();

  // Data payload for Android notifee (foreground rich notifications)
  const dataPayload: Record<string, string> = {
    type: payload.type,
    title: payload.title,
    body: payload.body,
    ...(payload.referenceId && { referenceId: payload.referenceId }),
    ...(payload.avatarUrl && { avatarUrl: payload.avatarUrl }),
    ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
    ...(payload.data ?? {}),
  };

  const response = await messaging.sendEachForMulticast({
    tokens,
    // Top-level notification — system displays this on both platforms
    // when app is background/killed.
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
    },
    data: dataPayload,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
      fcmOptions: {
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
    },
  });

  // Clean up stale tokens
  const staleTokens: string[] = [];
  response.responses.forEach((res, idx) => {
    if (
      res.error &&
      (res.error.code === 'messaging/registration-token-not-registered' ||
        res.error.code === 'messaging/invalid-registration-token')
    ) {
      staleTokens.push(tokens[idx]);
    }
  });

  if (staleTokens.length > 0) {
    const placeholders = staleTokens.map(() => '?').join(',');
    await d1.query(
      `DELETE FROM device_token WHERE token IN (${placeholders})`,
      staleTokens,
    );
    console.log(`[push] Cleaned up ${staleTokens.length} stale tokens`);
  }
}
