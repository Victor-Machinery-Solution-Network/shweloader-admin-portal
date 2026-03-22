# Push Notifications — Design Spec

**Date:** 2026-03-21
**Status:** Approved
**Scope:** React Native App + Admin Portal + Cloudflare Worker API

---

## 1. Overview

Implement Firebase Cloud Messaging (FCM) push notifications for the Shweloader React Native mobile app. Push notifications alert users when they receive chat replies from admins, with the architecture designed to be extensible for future notification types (announcements, promotions).

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Push service | Firebase (FCM) | Superior targeting, analytics, rich media, no device caps, free unlimited |
| Notification recipients | Mobile app users (`app_user`) only | Admin portal has its own Pusher-based in-app notification system |
| Push sender | Admin Portal (Next.js server actions) | Cloudflare Worker free tier has 10ms CPU limit; Admin Portal has no such constraint. Multiple admin actions will trigger pushes in future. |
| Token registration timing | On first app open (before login) | Future broadcast notifications (announcements/promos) don't require login |
| Multi-device support | One user → multiple tokens | All devices receive push |
| Deep linking | Extensible route map | Chat reply → support tab; new types added via config |
| Badge count | Yes | Unread count on app icon |
| Sound | Default system sound | No custom sounds |
| In-app notification toggle | None | Users opt-out via OS notification settings |
| iOS APNs | Deferred | User's Apple ID is locked; Android-first, iOS auto-works once APNs key is uploaded to Firebase Console |

---

## 2. Notification Types

### Phase 1 (Now)

| Type | Trigger | Recipient | Deep Link |
|------|---------|-----------|-----------|
| `chat_reply` | Admin sends message in chat session | The `app_user` who owns the chat session | `/(tabs)/support` |

### Phase 2 (Future — No Code Changes to Architecture)

| Type | Trigger | Recipient | Deep Link |
|------|---------|-----------|-----------|
| `announcement` | Admin publishes announcement | All registered devices (including non-logged-in) | `/announcement/:id` |
| `promotion` | Admin features a listing | All registered devices | `/product/:id` |
| `listing_approved` | Admin approves user's listing | The listing creator | `/listings/:id` |
| `enquiry_received` | Someone enquires about user's listing | The listing owner | `/enquiries` |

Adding a new type requires:
1. Add type string to `NotificationType` union
2. Add route entry to `NOTIFICATION_ROUTES` map in React Native
3. Call `sendPushToUser()` or `sendBroadcast()` at the trigger point in Admin Portal

---

## 3. Database Schema

### New Table: `device_token`

Added to `shweloader_d1_schema_final.sql`:

```sql
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

**Design notes:**
- `token`: FCM device token (unique per device)
- `device_id`: Stable device identifier (survives app reinstalls on Android via `Application.androidId`, generated UUID on iOS stored in SecureStore)
- `app_user_id`: NULL before login, linked after login, set back to NULL on logout (token kept for broadcast notifications)
- `platform`: `'android'` or `'ios'` — needed for platform-specific push options
- `ON DELETE SET NULL`: If an `app_user` is deleted, the device token remains for broadcasts
- No notification history table — pushes are fire-and-forget; the app fetches latest data (chat messages, etc.) on open via existing APIs

### Multi-Device Handling

| Scenario | Behavior |
|----------|----------|
| User logs in on 2 devices | Both tokens linked to same `app_user_id`, both get push |
| User logs out on 1 device | That token's `app_user_id` set to NULL, other device unaffected |
| User logs into different account on same device | Token's `app_user_id` updated to new user |
| App reinstalled | New FCM token generated, old token cleaned up by `DELETE WHERE device_id = ? AND token != ?` on next registration |
| Same token re-registered | `ON CONFLICT(token)` updates `app_user_id` and `updated_at` |
| FCM rotates token | `onTokenRefresh` fires → re-registers new token, old token for same `device_id` is deleted in the same registration call |

---

## 4. Cloudflare Worker API — New Endpoints

### `POST /notifications/register-token`

Registers or updates a device's FCM token.

**Request:**
```json
{
  "token": "fcm_token_abc...",
  "device_id": "unique-device-uuid",
  "platform": "android"
}
```

**Auth:** Optional Bearer token. Uses a new `optionalAuthMiddleware` that extracts `app_user_id` from the JWT if a Bearer token is present, but does NOT return 401 if absent. This differs from the existing `authMiddleware` used by chat routes. The `/notifications` route group must use `optionalAuthMiddleware` so pre-login registration works.

**Logic:**
1. Validate required fields (`token`, `device_id`, `platform`)
2. Validate `platform` is `'android'` or `'ios'`
3. First, delete any existing token for this `device_id` (prevents duplicate rows when FCM rotates tokens)
4. Upsert by token: `INSERT ... ON CONFLICT(token) DO UPDATE`
5. Return `{ success: true }`

**D1 queries (two lightweight queries — fits within Worker CPU limits):**
```sql
-- Step 1: Clean up old token for this device (handles token rotation)
DELETE FROM device_token WHERE device_id = ? AND token != ?;

-- Step 2: Upsert the current token
INSERT INTO device_token (token, device_id, app_user_id, platform)
VALUES (?, ?, ?, ?)
ON CONFLICT(token) DO UPDATE SET
    app_user_id = excluded.app_user_id,
    device_id = excluded.device_id,
    platform = excluded.platform,
    updated_at = datetime('now');
```

This two-step approach ensures only one token exists per device. When FCM rotates a token, the old row is deleted before inserting the new one, preventing duplicate push deliveries.

### `POST /notifications/unregister-token`

Called on logout. Unlinks user from device token (keeps token for future broadcasts). Uses `POST` instead of `DELETE` to avoid issues with HTTP clients/proxies stripping request bodies from DELETE requests.

**Request:**
```json
{
  "token": "fcm_token_abc..."
}
```

**Auth:** Required Bearer token (uses existing `authMiddleware`).

**Logic:**
1. Set `app_user_id = NULL` where `token = ?`
2. Return `{ success: true }`

---

## 5. Admin Portal — Firebase Push Service

### Files

| File | Purpose |
|------|---------|
| `src/lib/firebase.ts` | Firebase Admin SDK initialization (singleton) |
| `src/lib/services/push-notification.ts` | Push notification service: `sendPushToUser()`, `sendBroadcast()` |

### `src/lib/firebase.ts`

Initializes Firebase Admin SDK using service account credentials from environment variables. Exports a singleton `messaging` instance.

**Environment variables:**
```
FIREBASE_PROJECT_ID=shwe-loader
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@shwe-loader.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### `src/lib/services/push-notification.ts`

```typescript
interface PushNotificationPayload {
  type: string;           // 'chat_reply' | 'announcement' | 'promotion' | ...
  title: string;
  body: string;
  referenceId?: string;   // e.g., chat session ID, listing ID
  data?: Record<string, string>;  // additional data for deep linking
}

// Send push to a specific app_user (all their devices)
async function sendPushToUser(appUserId: number, payload: PushNotificationPayload): Promise<void>

// Send push to all registered devices (for broadcasts)
async function sendBroadcast(payload: PushNotificationPayload): Promise<void>
```

**`sendPushToUser()` logic:**
1. Query D1: `SELECT token FROM device_token WHERE app_user_id = ?`
2. If no tokens found, return silently (user has no registered devices)
3. Build FCM message with `notification` (title, body) + `data` (type, referenceId)
4. Call `messaging.sendEachForMulticast({ tokens, notification, data })`
5. Handle `messaging.SendResponse` — for any `NOT_REGISTERED` errors, delete stale tokens from D1
6. Log errors but don't throw (push failure should never block the primary action)

**`sendBroadcast()` logic:**
1. Query D1: `SELECT token FROM device_token` using `LIMIT 500 OFFSET ?` pagination (D1 has 5MB response limit per query)
2. For each page of tokens, send via `messaging.sendEachForMulticast()` in batches of 500
3. Continue until no more tokens returned
4. Clean up stale tokens on `NOT_REGISTERED` errors

**Error handling:** Push notification failures are non-blocking. The primary action (sending chat message, etc.) always succeeds regardless of push outcome. Errors are logged but not propagated to the user.

### Integration Point: Chat Reply

In the existing admin chat server action (where admin sends a reply to a user's chat session), add after the Pusher event:

```typescript
// Existing: save message to D1 + trigger Pusher event
// New: fetch the chat session's app_user_id, then send push
// NOTE: The existing sendMessage action may not have app_user_id readily available.
// An additional D1 query is required:
//   SELECT app_user_id FROM chat_session WHERE chat_session_id = ?
// This query must be added to the chat action before calling sendPushToUser.

const session = await d1.query('SELECT app_user_id FROM chat_session WHERE chat_session_id = ?', [sessionId]);
if (session.results?.[0]?.app_user_id) {
  await sendPushToUser(session.results[0].app_user_id, {
    type: 'chat_reply',
    title: 'New message from Shweloader',
    body: messageText.substring(0, 100), // truncate for push
    referenceId: sessionId,
  });
}
```

This is a non-blocking call — wrapped in try/catch so push failure doesn't affect chat functionality.

---

## 6. React Native App — Notification Setup

### Dependencies

```
expo-notifications    — Push notification handling
expo-device           — Device type detection (no push on emulator)
expo-constants        — Project ID for Expo push token (fallback)
@react-native-firebase/app        — Firebase core
@react-native-firebase/messaging  — FCM token + message handling
```

### Files

| File | Purpose |
|------|---------|
| `src/services/notificationService.ts` | FCM init, permission request, token registration |
| `src/hooks/useNotifications.ts` | Hook for notification handling, deep linking, badge |

### `src/services/notificationService.ts`

**Responsibilities:**
- Request notification permission from OS
- Get FCM device token
- Register token with Worker API (`POST /notifications/register-token`)
- Unregister on logout (`DELETE /notifications/unregister-token`)
- Generate stable device ID (Android: `Application.androidId`, iOS: UUID in SecureStore)

```typescript
// Called on app open (before login)
async function registerForPushNotifications(): Promise<string | null>

// Called after login (links token to user)
async function linkTokenToUser(): Promise<void>

// Called on logout (unlinks user from token)
async function unlinkTokenFromUser(): Promise<void>

// Get or generate stable device ID
async function getDeviceId(): Promise<string>
```

**Permission flow:**
1. Check `await Notifications.getPermissionsAsync()`
2. If not granted, `await Notifications.requestPermissionsAsync()`
3. If denied, return null (user opted out via OS — respect their choice)
4. Get FCM token via `await messaging().getToken()`
5. Store token locally (AsyncStorage) for logout cleanup
6. POST to Worker API

### `src/hooks/useNotifications.ts`

**Responsibilities:**
- Listen for incoming notifications (foreground + background + killed)
- Handle notification taps → deep link to correct screen
- Manage badge count

```typescript
function useNotifications() {
  // Set up listeners on mount
  // - onMessage: foreground notification received
  // - onNotificationOpenedApp: app was in background, user tapped notification
  // - getInitialNotification: app was killed, user tapped notification
  // - onTokenRefresh: FCM token rotated → re-register with Worker
}
```

**Deep link mapping (extensible):**
```typescript
const NOTIFICATION_ROUTES: Record<string, (referenceId?: string) => string> = {
  chat_reply: () => '/(tabs)/support',
  // Future:
  // announcement: (id) => `/announcement/${id}`,
  // promotion: (id) => `/product/${id}`,
};
```

**Foreground notification behavior:**
- Show in-app toast (using existing `toastStore`) so user sees what happened
- Do NOT show OS notification banner (user is already in the app)
- Do NOT update app icon badge while in foreground (badge reflects missed notifications, not in-app ones)
- Badge count is updated when the app goes to background or is killed — reflects unread state from server

**Background/killed notification behavior:**
- OS shows notification banner automatically
- On tap → app opens → `useNotifications` reads the notification data → navigates to correct screen

### `app.config.ts` Changes

```typescript
{
  // Existing config...
  android: {
    // Existing...
    googleServicesFile: './google-services.json',
  },
  ios: {
    // Existing...
    googleServicesFile: './GoogleService-Info.plist',
  },
  plugins: [
    // Existing plugins...
    '@react-native-firebase/app',
    '@react-native-firebase/messaging',
  ],
}
```

### App Lifecycle Integration

```
App opens (cold start)
  → registerForPushNotifications()
  → Token registered with device_id, platform, app_user_id=NULL

User logs in (OTP verified)
  → linkTokenToUser()
  → Token updated with app_user_id

User logs out
  → unlinkTokenFromUser()
  → Token's app_user_id set to NULL (token remains for broadcasts)

Token refreshed (FCM rotates token)
  → onTokenRefresh listener
  → Re-register new token, old token auto-expires

App in foreground, notification received
  → Show toast (no badge update — badge reflects missed notifications only)

App in background, notification tapped
  → Navigate to deep link target

App killed, notification tapped
  → App opens, getInitialNotification() → navigate to deep link target
```

---

## 7. Environment Variables Summary

### Admin Portal (`.env.local`)

| Variable | Value | Purpose |
|----------|-------|---------|
| `FIREBASE_PROJECT_ID` | `shwe-loader` | Firebase project identifier |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@shwe-loader.iam.gserviceaccount.com` | Service account email |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | Service account private key (ROTATE — current key was exposed) |

### React Native (`app.config.ts` → extra)

No new env vars. Firebase config comes from `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) which are bundled at build time.

### Cloudflare Worker

No new env vars. Worker only does D1 reads/writes for token management.

---

## 8. Security Considerations

- **Firebase Admin SDK private key**: Stored as env var in Admin Portal, never committed to git. Current key must be rotated (exposed during setup).
- **Token registration endpoint**: Accepts optional auth. Validates input fields. No sensitive data exposed.
- **Push payload**: Contains only type, title, body text, and reference ID. No sensitive user data in push payload.
- **Stale token cleanup**: `NOT_REGISTERED` errors from FCM trigger automatic deletion of invalid tokens from D1.
- **Rate limiting**: Not needed for Worker endpoints — token registration is infrequent (once per app open). Admin Portal push sends are triggered by admin actions which are already authenticated.

---

## 9. Offline Behavior

| Scenario | Behavior |
|----------|----------|
| User offline, push sent | FCM queues for up to 28 days (Android). iOS delivers latest notification on reconnect. |
| User opens app after being offline | Existing chat API fetches all messages — user sees everything they missed |
| No internet during token registration | Registration retried on next app open |
| Token expired while offline | New token generated on next app open, old token cleaned up on next failed send |

---

## 10. Testing Strategy

1. **Android emulator**: FCM works on emulators with Google Play Services
2. **Physical device**: Full end-to-end test (admin sends chat → push arrives)
3. **Background/killed states**: Test deep linking from all app states
4. **Multi-device**: Log in on 2 devices, verify both receive push
5. **Logout flow**: Verify push stops for personal notifications after logout
6. **Stale token**: Uninstall app, send push, verify token cleanup
7. **Firebase Console**: Use "Send test message" to verify token works before integrating with Admin Portal
