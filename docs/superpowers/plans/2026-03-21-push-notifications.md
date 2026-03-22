# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Firebase Cloud Messaging (FCM) push notifications so mobile app users receive pushes when admins reply to their chat, with extensible architecture for future notification types.

**Architecture:** Worker API stores device tokens in D1. Admin Portal sends pushes via Firebase Admin SDK after chat actions. React Native app registers FCM tokens on app open, links to user after login, handles notification taps with deep linking.

**Tech Stack:** Firebase Admin SDK (admin portal), `@react-native-firebase/messaging` (mobile), Hono (worker), D1 (storage)

**Spec:** `docs/superpowers/specs/2026-03-21-push-notifications-design.md`

---

## File Map

### Cloudflare Worker (`/Users/peter/Desktop/cloudflare-worker-app-rest-api-dev/src/`)

| File | Action | Purpose |
|------|--------|---------|
| `middleware/optional-auth.ts` | Create | JWT auth that extracts userId if token present, but doesn't 401 if absent |
| `routes/notifications.ts` | Create | POST /register-token and POST /unregister-token endpoints |
| `index.ts` | Modify | Register `/notifications` route |
| `types.ts` | Modify (optional) | No changes needed — Env interface already has all bindings |

### Admin Portal (`/Users/peter/Desktop/shweloader-admin-portal/`)

| File | Action | Purpose |
|------|--------|---------|
| `shweloader_d1_schema_final.sql` | Modify | Add `device_token` table DDL |
| `src/lib/firebase.ts` | Create | Firebase Admin SDK singleton init |
| `src/lib/services/push-notification.ts` | Create | `sendPushToUser()`, `sendBroadcast()` |
| `src/lib/actions/chat.ts` | Modify | Add push notification after admin sends message |

### React Native (`/Users/peter/Desktop/shweloader-reactnative-/`)

| File | Action | Purpose |
|------|--------|---------|
| `app.config.ts` | Modify | Add Firebase plugins + google-services file paths |
| `src/config/env.ts` | No change | API_BASE_URL already available |
| `src/services/notificationService.ts` | Create | FCM init, permission, token registration/unregistration |
| `src/hooks/useNotifications.ts` | Create | Notification listeners, deep linking, badge |
| `src/stores/authStore.ts` | Modify | Call linkToken after login, unlinkToken on logout |
| `app/_layout.tsx` | Modify | Mount useNotifications hook |
| `app/notifications.tsx` | Delete | Remove notification settings screen (per user decision) |
| `app/_layout.tsx` | Modify | Remove notifications screen from Stack |

---

## Task 1: D1 Schema — Add `device_token` Table

**Files:**
- Modify: `/Users/peter/Desktop/shweloader-admin-portal/shweloader_d1_schema_final.sql`

- [ ] **Step 1: Add device_token table DDL to schema file**

Append to the end of `shweloader_d1_schema_final.sql`:

```sql
-- ─── Push Notification Device Tokens ─────────────────────────────────────────
CREATE TABLE device_token (
    device_token_id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    device_id TEXT NOT NULL,
    app_user_id INTEGER,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX idx_device_token_token ON device_token(token);
CREATE INDEX idx_device_token_user ON device_token(app_user_id);
CREATE INDEX idx_device_token_device ON device_token(device_id);
```

- [ ] **Step 2: Run the migration on D1**

Execute the SQL above against the D1 database using the Cloudflare dashboard or wrangler:

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
npx wrangler d1 execute shweloader-dev --remote --command "CREATE TABLE device_token (device_token_id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT NOT NULL, device_id TEXT NOT NULL, app_user_id INTEGER, platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id) ON DELETE SET NULL);"
npx wrangler d1 execute shweloader-dev --remote --command "CREATE UNIQUE INDEX idx_device_token_token ON device_token(token);"
npx wrangler d1 execute shweloader-dev --remote --command "CREATE INDEX idx_device_token_user ON device_token(app_user_id);"
npx wrangler d1 execute shweloader-dev --remote --command "CREATE INDEX idx_device_token_device ON device_token(device_id);"
```

- [ ] **Step 3: Commit**

```bash
cd /Users/peter/Desktop/shweloader-admin-portal
git add shweloader_d1_schema_final.sql
git commit -m "feat: add device_token table for push notifications"
```

---

## Task 2: Worker API — Optional Auth Middleware

**Files:**
- Create: `/Users/peter/Desktop/cloudflare-worker-app-rest-api-dev/src/middleware/optional-auth.ts`

- [ ] **Step 1: Create optional auth middleware**

```typescript
import { Context, Next } from 'hono';
import { verifyToken } from '../utils/jwt';
import type { Env, JwtPayload } from '../types';

/**
 * Optional JWT auth middleware.
 * If a valid Bearer token is present, sets userId and userEmail on context.
 * If no token or invalid token, continues without setting variables (no 401).
 */
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: { userId: number | null; userEmail: string | null } }>,
  next: Next,
) {
  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload: JwtPayload = await verifyToken(token, c.env.JWT_SECRET);
      if (payload.type === 'access') {
        c.set('userId', payload.sub);
        c.set('userEmail', payload.email);
        return next();
      }
    } catch {
      // Invalid token — continue without auth (don't 401)
    }
  }

  c.set('userId', null);
  c.set('userEmail', null);
  return next();
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
git add src/middleware/optional-auth.ts
git commit -m "feat: add optional auth middleware for public+auth endpoints"
```

---

## Task 3: Worker API — Notification Endpoints

**Files:**
- Create: `/Users/peter/Desktop/cloudflare-worker-app-rest-api-dev/src/routes/notifications.ts`
- Modify: `/Users/peter/Desktop/cloudflare-worker-app-rest-api-dev/src/index.ts`

- [ ] **Step 1: Create notifications route**

```typescript
import { Hono } from 'hono';
import type { Env } from '../types';
import { optionalAuthMiddleware } from '../middleware/optional-auth';
import { authMiddleware } from '../middleware/auth';

const notifications = new Hono<{
  Bindings: Env;
  Variables: { userId: number | null; userEmail: string | null };
}>();

/**
 * POST /notifications/register-token
 * Register or update a device's FCM token.
 * Auth is optional — pre-login devices register with app_user_id = NULL.
 */
notifications.post('/register-token', optionalAuthMiddleware, async (c) => {
  const body = await c.req.json<{
    token?: string;
    device_id?: string;
    platform?: string;
  }>();

  // Validate required fields
  if (!body.token || !body.device_id || !body.platform) {
    return c.json({ error: 'token, device_id, and platform are required' }, 400);
  }
  if (body.platform !== 'android' && body.platform !== 'ios') {
    return c.json({ error: 'platform must be "android" or "ios"' }, 400);
  }

  const userId = c.get('userId'); // number | null

  // Step 1: Clean up old token for this device (handles FCM token rotation)
  await c.env.DB.prepare(
    'DELETE FROM device_token WHERE device_id = ? AND token != ?',
  )
    .bind(body.device_id, body.token)
    .run();

  // Step 2: Upsert the current token
  await c.env.DB.prepare(
    `INSERT INTO device_token (token, device_id, app_user_id, platform)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       app_user_id = excluded.app_user_id,
       device_id = excluded.device_id,
       platform = excluded.platform,
       updated_at = datetime('now')`,
  )
    .bind(body.token, body.device_id, userId, body.platform)
    .run();

  return c.json({ success: true });
});

/**
 * POST /notifications/unregister-token
 * Called on logout. Unlinks user from device token (keeps token for broadcasts).
 */
notifications.post('/unregister-token', authMiddleware as any, async (c) => {
  const body = await c.req.json<{ token?: string }>();

  if (!body.token) {
    return c.json({ error: 'token is required' }, 400);
  }

  await c.env.DB.prepare(
    'UPDATE device_token SET app_user_id = NULL, updated_at = datetime(\'now\') WHERE token = ?',
  )
    .bind(body.token)
    .run();

  return c.json({ success: true });
});

export default notifications;
```

- [ ] **Step 2: Register route in index.ts**

In `/Users/peter/Desktop/cloudflare-worker-app-rest-api-dev/src/index.ts`, add the import and route:

```typescript
// Add import at top (after existing imports):
import notifications from './routes/notifications';

// Add route after the chat route (line 42):
app.route('/notifications', notifications);
```

- [ ] **Step 3: Commit**

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
git add src/routes/notifications.ts src/index.ts
git commit -m "feat: add device token register/unregister endpoints"
```

- [ ] **Step 4: Deploy worker**

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
git push origin main
```

Worker auto-deploys on push to main.

---

## Task 4: Admin Portal — Firebase Admin SDK Setup

**Files:**
- Create: `/Users/peter/Desktop/shweloader-admin-portal/src/lib/firebase.ts`

- [ ] **Step 1: Install firebase-admin**

```bash
cd /Users/peter/Desktop/shweloader-admin-portal
npm install firebase-admin
```

- [ ] **Step 2: Add env vars to `.env.local`**

Add these to `.env.local` (the private key must be the ROTATED key — not the exposed one):

```
FIREBASE_PROJECT_ID=shwe-loader
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@shwe-loader.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

- [ ] **Step 3: Create Firebase singleton**

```typescript
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

let app: App | undefined;

function getFirebaseApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  return app;
}

export function getFirebaseMessaging(): Messaging {
  return getMessaging(getFirebaseApp());
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/peter/Desktop/shweloader-admin-portal
git add src/lib/firebase.ts
git commit -m "feat: add Firebase Admin SDK initialization"
```

---

## Task 5: Admin Portal — Push Notification Service

**Files:**
- Create: `/Users/peter/Desktop/shweloader-admin-portal/src/lib/services/push-notification.ts`

- [ ] **Step 1: Create push notification service**

```typescript
import { getFirebaseMessaging } from '@/lib/firebase';
import { d1 } from '@/lib/api/d1-client';

// ── Types ───────────────────────────────────────────────

export interface PushPayload {
  type: string;           // 'chat_reply' | 'announcement' | 'promotion'
  title: string;
  body: string;
  referenceId?: string;
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
  try {
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
  } catch (error) {
    console.error('[push] sendBroadcast failed:', error);
  }
}

// ── Internal: send to a list of FCM tokens ──────────────

async function sendToTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<void> {
  const messaging = getFirebaseMessaging();

  const dataPayload: Record<string, string> = {
    type: payload.type,
    ...(payload.referenceId && { referenceId: payload.referenceId }),
    ...(payload.data ?? {}),
  };

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: dataPayload,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/peter/Desktop/shweloader-admin-portal
git add src/lib/services/push-notification.ts
git commit -m "feat: add push notification service with FCM integration"
```

---

## Task 6: Admin Portal — Integrate Push into Chat

**Files:**
- Modify: `/Users/peter/Desktop/shweloader-admin-portal/src/lib/actions/chat.ts`

- [ ] **Step 1: Add push notification to sendMessage**

Add import at top of `chat.ts` (after existing imports, line 13):

```typescript
import { sendPushToUser } from '@/lib/services/push-notification';
```

Add push notification call after the Pusher events in `sendMessage()`. Insert after line 299 (after the `triggerAdminChatEvent` block, before `invalidateTag`):

```typescript
    // Send push notification to mobile user
    const sessionResult = await d1.query<{ app_user_id: number }>(
      "SELECT app_user_id FROM chat_session WHERE id = ?",
      [sessionId],
    );
    const appUserId = sessionResult.results[0]?.app_user_id;
    if (appUserId) {
      sendPushToUser(appUserId, {
        type: "chat_reply",
        title: "New message from Shweloader",
        body: preview,
        referenceId: String(sessionId),
      }).catch(() => {}); // Fire and forget
    }
```

- [ ] **Step 2: Commit**

```bash
cd /Users/peter/Desktop/shweloader-admin-portal
git add src/lib/actions/chat.ts
git commit -m "feat: send push notification when admin replies to chat"
```

---

## Task 7: React Native — Install Firebase Dependencies

**Files:**
- Modify: `/Users/peter/Desktop/shweloader-reactnative-/app.config.ts`
- Modify: `/Users/peter/Desktop/shweloader-reactnative-/package.json` (via npm)

- [ ] **Step 1: Install React Native Firebase packages**

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
npx expo install @react-native-firebase/app @react-native-firebase/messaging
```

- [ ] **Step 2: Copy Firebase config files**

```bash
# Copy google-services.json to project root (for Android)
cp /Users/peter/Downloads/google-services.json /Users/peter/Desktop/shweloader-reactnative-/google-services.json

# Copy GoogleService-Info.plist to project root (for iOS — will work once APNs key is uploaded)
cp /Users/peter/Downloads/GoogleService-Info.plist /Users/peter/Desktop/shweloader-reactnative-/GoogleService-Info.plist
```

- [ ] **Step 3: Update app.config.ts**

Add `googleServicesFile` to android and ios sections, and add Firebase plugins:

```typescript
// In ios section (after bundleIdentifier line):
googleServicesFile: './GoogleService-Info.plist',

// In android section (after versionCode line):
googleServicesFile: './google-services.json',

// In plugins array (after existing plugins):
'@react-native-firebase/app',
'@react-native-firebase/messaging',
```

The full updated `app.config.ts` `ios` section becomes:
```typescript
ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.shweloaderbyvmsn.app',
    buildNumber: '1',
    googleServicesFile: './GoogleService-Info.plist',
    infoPlist: {
      // ... existing infoPlist
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
```

The full updated `android` section becomes:
```typescript
android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#fbb811',
    },
    edgeToEdgeEnabled: true,
    package: 'com.shweloaderbyvmsn.app',
    versionCode: 1,
    googleServicesFile: './google-services.json',
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'INTERNET',
      'VIBRATE',
    ],
  },
```

The full updated `plugins` array becomes:
```typescript
plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-image-picker',
      {
        photosPermission: 'Shwe Loader needs photo library access to attach images to enquiries.',
        cameraPermission: 'Shwe Loader needs camera access to take photos for product enquiries.',
      },
    ],
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
  ],
```

- [ ] **Step 4: Add google-services files to .gitignore**

Add to `.gitignore` (these contain API keys):
```
google-services.json
GoogleService-Info.plist
```

- [ ] **Step 5: Commit**

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
git add app.config.ts package.json .gitignore
git commit -m "feat: add React Native Firebase dependencies and config"
```

---

## Task 8: React Native — Notification Service

**Files:**
- Create: `/Users/peter/Desktop/shweloader-reactnative-/src/services/notificationService.ts`

- [ ] **Step 1: Create notification service**

```typescript
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { ENV } from '../config/env';
import { getAccessToken } from './tokenStorage';

const DEVICE_ID_KEY = 'sl_device_id';
const FCM_TOKEN_KEY = 'sl_fcm_token';

// ── Device ID (stable across app sessions) ──────────────

async function getDeviceId(): Promise<string> {
  // Android: use Application.androidId (stable per device)
  if (Platform.OS === 'android') {
    const androidId = Application.androidId;
    if (androidId) return androidId;
  }

  // iOS (or fallback): generate UUID and store in SecureStore
  const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (stored) return stored;

  const uuid = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, uuid);
  return uuid;
}

// ── FCM Token Management ────────────────────────────────

async function getFcmToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (error) {
    console.error('[notifications] Failed to get FCM token:', error);
    return null;
  }
}

// ── Permission ──────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

// ── Register Token with Server ──────────────────────────

export async function registerPushToken(): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    const token = await getFcmToken();
    if (!token) return;

    const deviceId = await getDeviceId();
    const platform = Platform.OS as 'android' | 'ios';

    // Build headers — include auth if user is logged in
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const accessToken = await getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    await fetch(`${ENV.API_BASE_URL}/notifications/register-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ token, device_id: deviceId, platform }),
    });

    // Store token locally for logout cleanup
    await SecureStore.setItemAsync(FCM_TOKEN_KEY, token);
  } catch (error) {
    console.error('[notifications] Failed to register push token:', error);
  }
}

// ── Link Token to User (after login) ────────────────────

export async function linkPushTokenToUser(): Promise<void> {
  // Re-register with auth header to link app_user_id
  await registerPushToken();
}

// ── Unlink Token from User (on logout) ──────────────────

export async function unlinkPushToken(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(FCM_TOKEN_KEY);
    if (!token) return;

    const accessToken = await getAccessToken();
    if (!accessToken) return;

    await fetch(`${ENV.API_BASE_URL}/notifications/unregister-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.error('[notifications] Failed to unlink push token:', error);
  }
}

// ── Get stored FCM token ────────────────────────────────

export async function getStoredFcmToken(): Promise<string | null> {
  return SecureStore.getItemAsync(FCM_TOKEN_KEY);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
git add src/services/notificationService.ts
git commit -m "feat: add notification service for FCM token management"
```

---

## Task 9: React Native — Notification Hook

**Files:**
- Create: `/Users/peter/Desktop/shweloader-reactnative-/src/hooks/useNotifications.ts`

- [ ] **Step 1: Create notification hook**

```typescript
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import messaging, { type FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { useRouter } from 'expo-router';
import { registerPushToken } from '../services/notificationService';
import { useToastStore } from '../stores/toastStore';

// ── Deep Link Routing ───────────────────────────────────

const NOTIFICATION_ROUTES: Record<string, (referenceId?: string) => string> = {
  chat_reply: () => '/(tabs)/support',
  // Future types:
  // announcement: (id) => `/announcement/${id}`,
  // promotion: (id) => `/product/${id}`,
};

function handleNotificationNavigation(
  data: Record<string, string> | undefined,
  router: ReturnType<typeof useRouter>,
) {
  if (!data?.type) return;

  const routeResolver = NOTIFICATION_ROUTES[data.type];
  if (routeResolver) {
    const route = routeResolver(data.referenceId);
    router.push(route as any);
  }
}

// ── Hook ────────────────────────────────────────────────

export function useNotifications() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.show);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    // 1. Register token on app open
    registerPushToken();

    // 2. Handle token refresh (FCM rotates tokens periodically)
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(() => {
      registerPushToken();
    });

    // 3. Foreground notification handler
    const unsubscribeForeground = messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        // Show in-app toast instead of OS notification
        const title = remoteMessage.notification?.title ?? 'Notification';
        const body = remoteMessage.notification?.body ?? '';
        showToast('info', title, body);
      },
    );

    // 4. Background notification tap handler
    const unsubscribeBackground = messaging().onNotificationOpenedApp(
      (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        handleNotificationNavigation(
          remoteMessage.data as Record<string, string> | undefined,
          router,
        );
      },
    );

    // 5. App killed → notification tap handler (runs once)
    if (!initialCheckDone.current) {
      initialCheckDone.current = true;
      messaging()
        .getInitialNotification()
        .then((remoteMessage) => {
          if (remoteMessage) {
            handleNotificationNavigation(
              remoteMessage.data as Record<string, string> | undefined,
              router,
            );
          }
        });
    }

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
      unsubscribeBackground();
    };
  }, [router, showToast]);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
git add src/hooks/useNotifications.ts
git commit -m "feat: add notification hook with deep linking and foreground handling"
```

---

## Task 10: React Native — Integrate into App

**Files:**
- Modify: `/Users/peter/Desktop/shweloader-reactnative-/src/stores/authStore.ts`
- Modify: `/Users/peter/Desktop/shweloader-reactnative-/app/_layout.tsx`
- Delete: `/Users/peter/Desktop/shweloader-reactnative-/app/notifications.tsx`

- [ ] **Step 1: Add push token linking to authStore**

In `authStore.ts`, add import at top (after existing imports):

```typescript
import { linkPushTokenToUser, unlinkPushToken } from '../services/notificationService';
```

In `verifyOtp` (around line 134, after `set({ currentUser: ... })`), add:

```typescript
      // 4. Link push token to authenticated user
      linkPushTokenToUser().catch(() => {});
```

In `logout` (around line 143, before `disconnectPusher()`), add:

```typescript
    // Unlink push token before clearing auth
    await unlinkPushToken();
```

- [ ] **Step 2: Mount useNotifications in root layout**

In `app/_layout.tsx`, add import (after existing imports):

```typescript
import { useNotifications } from '../src/hooks/useNotifications';
```

In `RootLayoutInner` component (line 117), add the hook call at the top of the function body:

```typescript
function RootLayoutInner() {
  const { isDark } = useTheme();
  useNotifications(); // Add this line

  return (
    // ... existing JSX
  );
}
```

- [ ] **Step 3: Remove notifications settings screen**

Delete the file `app/notifications.tsx`.

Remove the Stack.Screen entry for notifications from `app/_layout.tsx` (line 157):
```typescript
// Remove this line:
<Stack.Screen name="notifications" />
```

Also check if there are any navigation links pointing to the notifications screen (e.g., in profile.tsx) and update them. If the profile has a "Notification Settings" link, remove it.

- [ ] **Step 4: Commit**

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
git add src/stores/authStore.ts app/_layout.tsx
git rm app/notifications.tsx
git commit -m "feat: integrate push notifications into app lifecycle"
```

---

## Task 11: Admin Portal — Add Firebase Env Vars to Vercel

**Files:** None (Vercel dashboard or CLI)

- [ ] **Step 1: Add Firebase env vars to Vercel**

```bash
cd /Users/peter/Desktop/shweloader-admin-portal
vercel env add FIREBASE_PROJECT_ID
# Enter: shwe-loader

vercel env add FIREBASE_CLIENT_EMAIL
# Enter: firebase-adminsdk-fbsvc@shwe-loader.iam.gserviceaccount.com

vercel env add FIREBASE_PRIVATE_KEY
# Enter: the ROTATED private key (not the exposed one)
```

Or add them via the Vercel dashboard under Project Settings → Environment Variables.

- [ ] **Step 2: Commit and deploy admin portal**

```bash
cd /Users/peter/Desktop/shweloader-admin-portal
git add src/lib/firebase.ts src/lib/services/push-notification.ts src/lib/actions/chat.ts shweloader_d1_schema_final.sql
git commit -m "feat: complete push notification integration"
git push origin dev
```

---

## Task 12: React Native — Build and Test

- [ ] **Step 1: Create development build**

Push notifications don't work in Expo Go — you need a development build:

```bash
cd /Users/peter/Desktop/shweloader-reactnative-
npx eas build --profile development --platform android
```

- [ ] **Step 2: Test token registration**

1. Install dev build on Android device/emulator
2. Open app — should see notification permission prompt
3. Check D1 database for new row in `device_token` table (app_user_id should be NULL)

- [ ] **Step 3: Test token linking after login**

1. Log in with test account
2. Verify D1 `device_token` row now has the correct `app_user_id`

- [ ] **Step 4: Test push notification delivery**

1. Open admin portal → Chat
2. Reply to the test user's chat session
3. Verify push notification appears on the Android device

- [ ] **Step 5: Test deep linking**

1. Put app in background
2. Admin sends chat reply
3. Tap the notification
4. Verify app opens to the Support/Chat tab

- [ ] **Step 6: Test logout flow**

1. Log out from the app
2. Verify D1 `device_token` row has `app_user_id = NULL`
3. Admin sends another chat reply — no push should arrive (since token is unlinked)

- [ ] **Step 7: Test Firebase Console (optional)**

1. Go to Firebase Console → Cloud Messaging → "Send your first message"
2. Enter title/body
3. Send test message to the device's FCM token
4. Verify notification appears

---

## Summary

| Task | Codebase | What |
|------|----------|------|
| 1 | Admin Portal + D1 | Add `device_token` table schema + run migration |
| 2 | Worker | Create optional auth middleware |
| 3 | Worker | Create register/unregister token endpoints + deploy |
| 4 | Admin Portal | Install firebase-admin + create singleton |
| 5 | Admin Portal | Create push notification service |
| 6 | Admin Portal | Integrate push into chat sendMessage |
| 7 | React Native | Install Firebase deps + config |
| 8 | React Native | Create notification service (token management) |
| 9 | React Native | Create notification hook (listeners + deep links) |
| 10 | React Native | Wire into authStore + layout + remove old settings |
| 11 | Admin Portal | Add Firebase env vars to Vercel + deploy |
| 12 | React Native | Build dev client + end-to-end testing |
