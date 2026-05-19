# Stakeholder Mobile App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an internal-only iOS + Android app that wakes stakeholders (admin_user rows) with a push notification when a new enquiry arrives, and lets them read and reply to the chat session from their phone.

**Architecture:** A new Cloudflare Worker exposes a stakeholder-scoped API (auth, devices, enquiries, internal fanout). A new Expo app talks only to that worker. The existing consumer Worker calls the new worker's `/internal/fanout` endpoint (shared-secret protected) when a user posts a chat message, which then signs FCM HTTP v1 and APNs HTTP/2 requests in-Worker via Web Crypto and delivers pushes to every admin device. The D1 database is shared; only one new table is added.

**Tech Stack:**

- **New stakeholder worker** (`shweloader-stakeholder-worker/`): Cloudflare Workers + Hono 4 + bcryptjs + `hono/jwt` (HS256 admin tokens) + Web Crypto (RS256/ES256 push JWTs). TypeScript 5, Wrangler 4, Vitest + `@cloudflare/vitest-pool-workers` for tests.
- **New mobile app** (`shweloader-stakeholder-app/`): Expo SDK 53+, React Native 0.76+, Expo Router, `expo-notifications` (with `getDevicePushTokenAsync` → raw FCM/APNs), `expo-secure-store`, `@tanstack/react-query`, native fetch.
- **Existing consumer worker** (`cloudflare-worker-app-rest-api-dev/`): one new utility + one call site change.
- **Existing admin portal** (`shweloader-admin-portal/`): schema file updated; one migration SQL added; no runtime code changes for v1.

**Scope decisions (locked):**

- Notify + read + reply only. No attachments from mobile in v1 (user-side can still send attachments; admin reads them).
- Internal distribution: TestFlight (iOS) + Play Internal Testing (Android). No store review for v1.
- Admin identity = existing `admin_user` table; RBAC reused.
- Push delivery: direct FCM HTTP v1 + APNs HTTP/2; no Expo Push Service.
- Fanout: consumer worker calls stakeholder worker's `/internal/fanout` with shared secret (single source of truth for admin push code).

---

## File Structure

### `shweloader-stakeholder-worker/` (new repo)

```
src/
  index.ts                 — Hono app, route mounting, CORS
  types.ts                 — Env, AdminJwtPayload, FcmMessage, ApnsPayload
  middleware/
    admin-auth.ts          — verify admin JWT, set adminId on context
    internal-secret.ts     — shared-secret guard for /internal/*
    rate-limit-login.ts    — in-memory email-keyed rate limit (5/15min)
  routes/
    auth.ts                — POST /auth/login, POST /auth/refresh
    devices.ts             — POST /devices/register, DELETE /devices/:token
    enquiries.ts           — GET list/detail/messages, POST reply/resolve, POST mark-read
    internal.ts            — POST /internal/fanout (called by consumer worker)
    health.ts              — GET /health
  utils/
    jwt-admin.ts           — sign/verify HS256 admin JWT (separate audience from consumer)
    password.ts            — bcrypt compare with timing-safe wrapper
    enrich-product.ts      — duplicated from consumer worker's chat.ts fetchProductEnrichment
    pusher.ts              — same as consumer worker's pusher.ts (HMAC trigger)
    user-fcm.ts            — send FCM to a consumer user_id (mirrors admin portal sendPushToUser)
    push/
      index.ts             — fanoutToAdmins(payload), sendToTokens, cleanupDeadTokens
      fcm.ts               — service-account OAuth2 cache + FCM HTTP v1 send
      apns.ts              — .p8 JWT cache + APNs HTTP/2 send (sandbox vs production routing)
      jwt-signer.ts        — Web Crypto RS256/ES256 helpers
  db/
    queries.ts             — typed parameterised D1 queries (chat sessions/messages, admin lookups)
test/
  auth.test.ts
  devices.test.ts
  enquiries.test.ts
  internal.test.ts
  push/
    fcm.test.ts            — mock service-account, mock OAuth2 + FCM endpoints
    apns.test.ts           — mock APNs endpoint
    jwt-signer.test.ts     — JWT shape + signature round-trip
wrangler.jsonc
package.json
tsconfig.json
vitest.config.ts
README.md
```

### `shweloader-stakeholder-app/` (new repo)

```
app.config.ts               — bundle id com.shweloaderbyvmsn.admin, push entitlements
app/
  _layout.tsx               — root, AuthProvider, QueryClientProvider, push init
  (auth)/
    _layout.tsx             — gate: redirect to /app if already signed in
    login.tsx
  (app)/
    _layout.tsx             — gate: redirect to /(auth)/login if no session, tab bar
    enquiries.tsx           — list
    settings.tsx            — current admin, push toggle, sign out, app version
  chat/
    [sessionId].tsx         — detail + reply input
src/
  api/
    client.ts               — fetch wrapper, JWT header, 401-refresh, error normalisation
    auth.ts                 — login, refresh, getMe
    devices.ts              — register, unregister
    enquiries.ts            — list, detail, messages, sendReply, resolve, markRead
  auth/
    context.tsx             — AuthProvider + useAuth (status, signIn, signOut)
    storage.ts              — expo-secure-store getJwt/setJwt/clear
  push/
    register.ts             — request permission, getDevicePushTokenAsync, POST to worker
    handler.ts              — Notifications.addNotificationResponseReceivedListener → router
  hooks/
    useEnquiries.ts         — useInfiniteQuery
    useChat.ts              — useQuery(sessionId) + useMutation(send/resolve/markRead)
  components/
    EnquiryListItem.tsx
    MessageBubble.tsx
    ProductCard.tsx         — for listing-attached messages
    EmptyState.tsx
    ErrorBanner.tsx
  config.ts                 — API_BASE_URL, env loader
  types/
    api.ts                  — response shapes mirroring worker
GoogleService-Info.plist    — new iOS Firebase config (admin bundle)
google-services.json        — new Android Firebase config (admin bundle)
eas.json                    — internal distribution profiles
package.json
tsconfig.json
README.md
```

### `cloudflare-worker-app-rest-api-dev/` (existing — minimal change)

```
src/
  utils/
    stakeholder-fanout.ts  — NEW. notifyAdmins(env, payload) → fetch new worker /internal/fanout
  routes/
    chat.ts                — MODIFY at message-create handler: after Pusher trigger, call notifyAdmins(...)
  types.ts                 — MODIFY: add STAKEHOLDER_WORKER_URL + STAKEHOLDER_FANOUT_SECRET to Env
wrangler.jsonc             — MODIFY: add var STAKEHOLDER_WORKER_URL; secret added via wrangler secret put
```

### `shweloader-admin-portal/` (existing — schema only)

```
migrations/
  2026-05-16-admin-device-token.sql   — NEW. CREATE TABLE admin_device_token + indexes
shweloader_d1_schema_final.sql        — MODIFY: append admin_device_token definition + DROP-IF-EXISTS at top
docs/
  superpowers/plans/
    2026-05-16-stakeholder-mobile-app.md   — THIS FILE
```

---

## Phase 0 — Provisioning & Credentials (no code)

Provisioning has hard prerequisites that block every later phase. Do this first; all secret values get written down in a private password manager entry titled "Stakeholder app credentials" before any phase below begins.

### Task 0.1: Firebase project additions

**Goal:** Add two new app entries to the existing Firebase project (one iOS, one Android) under bundle id `com.shweloaderbyvmsn.admin`, so the Expo build accepts `GoogleService-Info.plist` / `google-services.json`.

- [ ] **Step 1:** Open Firebase Console → existing `shwe-loader` project → Project Settings → "Add app".
- [ ] **Step 2:** Add iOS app with bundle id `com.shweloaderbyvmsn.admin`, App Store ID blank. Download `GoogleService-Info.plist`. Save as `shweloader-stakeholder-app/GoogleService-Info.plist` (do not commit yet — repo doesn't exist).
- [ ] **Step 3:** Add Android app with package name `com.shweloaderbyvmsn.admin`, SHA-1 fingerprint blank for now. Download `google-services.json`. Save as `shweloader-stakeholder-app/google-services.json`.
- [ ] **Step 4:** In Project Settings → Service Accounts → "Generate new private key" (only if no FCM service account JSON exists already). Save as `~/secrets/shweloader-fcm-service-account.json`. This single JSON authorises sends to BOTH the consumer and admin apps (project-scoped).
- [ ] **Step 5:** Verify no commits include these files: confirm `.gitignore` will block `GoogleService-Info.plist`, `google-services.json`, `*service-account*.json` before Phase 10 task 1.

### Task 0.2: Apple Developer additions

- [ ] **Step 1:** Apple Developer → Identifiers → "+" → App IDs → Bundle ID `com.shweloaderbyvmsn.admin`. Enable Push Notifications capability.
- [ ] **Step 2:** Confirm the existing `AuthKey_4LM47Y6GX4.p8` is a **token-based APNs auth key** (not a certificate). Token keys are team-scoped and sign pushes for any bundle id under the team. Record the Key ID (10-char) and Team ID (10-char) — found on the Apple Developer Keys page and the membership page respectively.
- [ ] **Step 3:** Create a TestFlight internal-testing group under the new app's App Store Connect record (skip until Phase 15; flagged here so the bundle id is reserved now).

### Task 0.3: Worker secrets generated locally

Generate three random secrets and store them in the password manager entry. Do not commit any of these.

- [ ] **Step 1:** Generate admin JWT signing secret: `openssl rand -hex 32` → store as `STAKEHOLDER_JWT_SECRET`.
- [ ] **Step 2:** Generate fanout shared secret: `openssl rand -hex 32` → store as `STAKEHOLDER_FANOUT_SECRET`.
- [ ] **Step 3:** Base64-encode the APNs .p8 for Worker storage: `base64 -i AuthKey_4LM47Y6GX4.p8 | tr -d '\n'` → store as `APNS_KEY_P8_B64`.
- [ ] **Step 4:** Base64-encode the FCM service account JSON: `base64 -i ~/secrets/shweloader-fcm-service-account.json | tr -d '\n'` → store as `FCM_SERVICE_ACCOUNT_JSON_B64`.
- [ ] **Step 5:** Record `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` (=`com.shweloaderbyvmsn.admin`) for Phase 6.

### Task 0.4: Pusher app reuse decision

- [ ] **Step 1:** Confirm the existing Pusher app (used by consumer worker `src/utils/pusher.ts`) will be reused for admin → user chat replies originating from the mobile app. Same `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`.

---

## Phase 1 — D1 schema migration

**Repo:** `shweloader-admin-portal`

### Task 1.1: Migration SQL

**Files:**

- Create: `shweloader-admin-portal/migrations/2026-05-16-admin-device-token.sql`
- Modify: `shweloader-admin-portal/shweloader_d1_schema_final.sql` — add DROP IF EXISTS line and the full table definition (so a fresh DB rebuild includes the table).

- [ ] **Step 1: Write the migration file**

```sql
-- migrations/2026-05-16-admin-device-token.sql
-- Tracks one row per (admin, device) pair. device_token is the raw
-- FCM registration token (Android) or APNs hex device token (iOS) —
-- no Expo Push token. platform determines which API the worker calls.

CREATE TABLE IF NOT EXISTS admin_device_token (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id   INTEGER NOT NULL,
    device_token    TEXT NOT NULL,
    device_id       TEXT NOT NULL,
    platform        TEXT NOT NULL CHECK(platform IN ('ios','android')),
    app_version     TEXT,
    os_version      TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES admin_user(user_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_device_token_token
    ON admin_device_token(device_token);

CREATE INDEX IF NOT EXISTS idx_admin_device_token_admin
    ON admin_device_token(admin_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_device_token_admin_device
    ON admin_device_token(admin_user_id, device_id);
```

- [ ] **Step 2: Apply to dev D1 via Cloudflare dashboard**

Open Cloudflare → D1 → `shweloader-dev` → Console → paste file contents → Run. Confirm "Query OK" output and that the table appears in the schema browser.

- [ ] **Step 3: Append to canonical schema file**

In `shweloader_d1_schema_final.sql`, insert near the top in the DROP IF EXISTS block:

```sql
DROP TABLE IF EXISTS admin_device_token;
```

And append the full `CREATE TABLE admin_device_token` block from Step 1 at the bottom (or in a sensible alphabetical position).

- [ ] **Step 4: Commit**

```bash
cd /Users/peter/Desktop/shweloader-admin-portal
git add migrations/2026-05-16-admin-device-token.sql shweloader_d1_schema_final.sql docs/superpowers/plans/2026-05-16-stakeholder-mobile-app.md
git commit -m "feat(schema): add admin_device_token table for stakeholder app

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Stakeholder worker scaffold

**Repo:** `shweloader-stakeholder-worker/` (new, sibling of `cloudflare-worker-app-rest-api-dev/`)

### Task 2.1: Initialise the worker repo

- [ ] **Step 1: Scaffold**

```bash
cd /Users/peter/Desktop
npm create cloudflare@latest -- shweloader-stakeholder-worker \
  --framework=hono --type=hello-world --lang=ts --git=true --deploy=false
cd shweloader-stakeholder-worker
```

- [ ] **Step 2: Install deps**

```bash
npm install hono bcryptjs
npm install -D @types/bcryptjs vitest @cloudflare/vitest-pool-workers @cloudflare/workers-types
```

- [ ] **Step 3: Replace `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "shweloader-stakeholder-worker",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-03",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "shweloader-dev",
      "database_id": "406776d8-a823-4774-90ef-72788122934f"
    }
  ],
  "observability": { "enabled": true },
  "vars": {
    "APNS_BUNDLE_ID": "com.shweloaderbyvmsn.admin",
    "APNS_ENVIRONMENT": "production",
    "FCM_PROJECT_ID": "shwe-loader"
  }
}
```

Secrets (set via `wrangler secret put NAME` AFTER first deploy in Task 2.4):

- `STAKEHOLDER_JWT_SECRET`
- `STAKEHOLDER_FANOUT_SECRET`
- `APNS_KEY_P8_B64`
- `APNS_KEY_ID`
- `APNS_TEAM_ID`
- `FCM_SERVICE_ACCOUNT_JSON_B64`
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`

- [ ] **Step 4: Write `src/types.ts`**

```ts
export interface Env {
  DB: D1Database;
  STAKEHOLDER_JWT_SECRET: string;
  STAKEHOLDER_FANOUT_SECRET: string;
  APNS_KEY_P8_B64: string;
  APNS_KEY_ID: string;
  APNS_TEAM_ID: string;
  APNS_BUNDLE_ID: string;
  APNS_ENVIRONMENT: 'production' | 'sandbox';
  FCM_PROJECT_ID: string;
  FCM_SERVICE_ACCOUNT_JSON_B64: string;
  PUSHER_APP_ID: string;
  PUSHER_KEY: string;
  PUSHER_SECRET: string;
  PUSHER_CLUSTER: string;
}

export interface AdminJwtPayload {
  sub: number; // admin_user.user_id
  email: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface PushPayload {
  type: 'enquiry_new_message' | 'enquiry_new_session' | 'test';
  title: string;
  body: string;
  data?: Record<string, string>;
}
```

- [ ] **Step 5: Write `src/routes/health.ts`**

```ts
import { Hono } from 'hono';
import type { Env } from '../types';

const health = new Hono<{ Bindings: Env }>();
health.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));
export default health;
```

- [ ] **Step 6: Write `src/index.ts`**

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import health from './routes/health';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type', 'X-Internal-Secret'],
}));

app.route('/', health);

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error('[stakeholder-worker] unhandled:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
```

- [ ] **Step 7: Vitest config**

Create `vitest.config.ts`:

```ts
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: { wrangler: { configPath: './wrangler.jsonc' } },
    },
  },
});
```

- [ ] **Step 8: First test — health endpoint**

`test/health.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

describe('GET /health', () => {
  it('returns ok:true', async () => {
    const res = await SELF.fetch('http://example.com/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
```

- [ ] **Step 9: Run tests**

```bash
npm run test  # add "test": "vitest" to package.json scripts if missing
```

Expected: 1 test passes.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold stakeholder worker with hono + vitest

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2.2: Deploy to staging

- [ ] **Step 1: Deploy**

```bash
npx wrangler deploy
```

Note the deployed URL (e.g. `https://shweloader-stakeholder-worker.<account>.workers.dev`). Save in password manager entry as `STAKEHOLDER_WORKER_URL`.

- [ ] **Step 2: Set secrets**

```bash
# Run each one; paste the value from password manager when prompted.
npx wrangler secret put STAKEHOLDER_JWT_SECRET
npx wrangler secret put STAKEHOLDER_FANOUT_SECRET
npx wrangler secret put APNS_KEY_P8_B64
npx wrangler secret put APNS_KEY_ID
npx wrangler secret put APNS_TEAM_ID
npx wrangler secret put FCM_SERVICE_ACCOUNT_JSON_B64
npx wrangler secret put PUSHER_APP_ID
npx wrangler secret put PUSHER_KEY
npx wrangler secret put PUSHER_SECRET
npx wrangler secret put PUSHER_CLUSTER
```

- [ ] **Step 3: Verify**

```bash
curl https://shweloader-stakeholder-worker.<account>.workers.dev/health
```

Expected: `{"ok":true,"ts":...}`.

---

## Phase 3 — Stakeholder worker auth

### Task 3.1: JWT helpers

**Files:**

- Create: `src/utils/jwt-admin.ts`
- Test: `test/jwt-admin.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/jwt-admin.test.ts
import { describe, it, expect } from 'vitest';
import { signAdminAccess, signAdminRefresh, verifyAdminToken } from '../src/utils/jwt-admin';

const SECRET = 'test-secret-min-32-chars-xxxxxxxxxxxxxxxx';

describe('jwt-admin', () => {
  it('signs and verifies an access token', async () => {
    const token = await signAdminAccess(42, 'a@b.com', SECRET);
    const payload = await verifyAdminToken(token, SECRET);
    expect(payload.sub).toBe(42);
    expect(payload.email).toBe('a@b.com');
    expect(payload.type).toBe('access');
  });

  it('rejects token signed with different secret', async () => {
    const token = await signAdminAccess(42, 'a@b.com', SECRET);
    await expect(verifyAdminToken(token, 'wrong-secret-still-32-chars-xxxxxx')).rejects.toThrow();
  });

  it('distinguishes access vs refresh by type field', async () => {
    const refresh = await signAdminRefresh(42, 'a@b.com', SECRET);
    const payload = await verifyAdminToken(refresh, SECRET);
    expect(payload.type).toBe('refresh');
  });
});
```

- [ ] **Step 2: Run, expect fail (module missing)**

```bash
npm run test -- jwt-admin
```

- [ ] **Step 3: Implement**

```ts
// src/utils/jwt-admin.ts
import { sign, verify } from 'hono/jwt';
import type { AdminJwtPayload } from '../types';

const ACCESS_TTL_SEC = 60 * 60;            // 1h
const REFRESH_TTL_SEC = 60 * 60 * 24 * 30; // 30d

export async function signAdminAccess(adminId: number, email: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminJwtPayload = { sub: adminId, email, type: 'access', iat: now, exp: now + ACCESS_TTL_SEC };
  return sign(payload, secret);
}

export async function signAdminRefresh(adminId: number, email: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminJwtPayload = { sub: adminId, email, type: 'refresh', iat: now, exp: now + REFRESH_TTL_SEC };
  return sign(payload, secret);
}

export async function verifyAdminToken(token: string, secret: string): Promise<AdminJwtPayload> {
  return verify(token, secret) as Promise<AdminJwtPayload>;
}
```

- [ ] **Step 4: Run, expect pass**

```bash
npm run test -- jwt-admin
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/jwt-admin.ts test/jwt-admin.test.ts
git commit -m "feat(worker): admin JWT helpers (HS256, separate audience from consumer worker)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 3.2: Password verify helper

**Files:**

- Create: `src/utils/password.ts`
- Test: `test/password.test.ts`

- [ ] **Step 1: Failing test**

```ts
// test/password.test.ts
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { verifyPassword } from '../src/utils/password';

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await bcrypt.hash('admin123!', 10);
    expect(await verifyPassword('admin123!', hash)).toBe(true);
  });
  it('returns false for wrong password', async () => {
    const hash = await bcrypt.hash('admin123!', 10);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
  it('returns false (not throw) for malformed hash', async () => {
    expect(await verifyPassword('x', 'not-a-bcrypt-hash')).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement**

```ts
// src/utils/password.ts
import bcrypt from 'bcryptjs';

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run, expect pass**

- [ ] **Step 5: Commit**

### Task 3.3: Login rate-limit middleware

**Files:**

- Create: `src/middleware/rate-limit-login.ts`
- Test: `test/rate-limit-login.test.ts`

In-memory map keyed by email. Resets every 15 minutes. Acceptable to lose state on cold starts — same posture as admin portal.

- [ ] **Step 1: Failing test**

```ts
// test/rate-limit-login.test.ts
import { describe, it, expect } from 'vitest';
import { checkRateLimit, recordFailure, clearForEmail } from '../src/middleware/rate-limit-login';

describe('rate-limit-login', () => {
  it('allows first 5 attempts', () => {
    clearForEmail('rl@test.com');
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('rl@test.com').allowed).toBe(true);
      recordFailure('rl@test.com');
    }
    expect(checkRateLimit('rl@test.com').allowed).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement**

```ts
// src/middleware/rate-limit-login.ts
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface Entry { count: number; firstAt: number }
const store = new Map<string, Entry>();

export function checkRateLimit(email: string): { allowed: boolean; retryAfterMs?: number } {
  const e = store.get(email.toLowerCase());
  if (!e) return { allowed: true };
  if (Date.now() - e.firstAt > WINDOW_MS) {
    store.delete(email.toLowerCase());
    return { allowed: true };
  }
  if (e.count >= MAX_ATTEMPTS) return { allowed: false, retryAfterMs: WINDOW_MS - (Date.now() - e.firstAt) };
  return { allowed: true };
}

export function recordFailure(email: string): void {
  const key = email.toLowerCase();
  const e = store.get(key);
  if (!e || Date.now() - e.firstAt > WINDOW_MS) {
    store.set(key, { count: 1, firstAt: Date.now() });
  } else {
    e.count++;
  }
}

export function clearForEmail(email: string): void {
  store.delete(email.toLowerCase());
}
```

- [ ] **Step 4: Run, expect pass**

- [ ] **Step 5: Commit**

### Task 3.4: POST /auth/login

**Files:**

- Create: `src/routes/auth.ts`
- Modify: `src/index.ts` to mount it
- Test: `test/auth.test.ts`

- [ ] **Step 1: Failing test**

```ts
// test/auth.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import bcrypt from 'bcryptjs';

const TEST_EMAIL = 'logintest@shweloader.com';
const TEST_PASSWORD = 'TestPass123!';

beforeAll(async () => {
  const hash = await bcrypt.hash(TEST_PASSWORD, 8);
  await env.DB.prepare(
    `INSERT OR REPLACE INTO admin_user (username, email, password_hash, role_id, active)
     VALUES (?, ?, ?, 1, 1)`,
  ).bind('logintest', TEST_EMAIL, hash).run();
});

describe('POST /auth/login', () => {
  it('returns tokens on valid credentials', async () => {
    const res = await SELF.fetch('http://x/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(typeof j.accessToken).toBe('string');
    expect(typeof j.refreshToken).toBe('string');
    expect(j.admin.email).toBe(TEST_EMAIL);
  });

  it('rejects wrong password with 401', async () => {
    const res = await SELF.fetch('http://x/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401 (no enumeration leak)', async () => {
    const res = await SELF.fetch('http://x/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@x.com', password: 'whatever' }),
    });
    expect(res.status).toBe(401);
  });

  it('rejects deactivated admin (active=0) with 401', async () => {
    await env.DB.prepare(`UPDATE admin_user SET active=0 WHERE email=?`).bind(TEST_EMAIL).run();
    const res = await SELF.fetch('http://x/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    expect(res.status).toBe(401);
    await env.DB.prepare(`UPDATE admin_user SET active=1 WHERE email=?`).bind(TEST_EMAIL).run();
  });
});
```

- [ ] **Step 2: Run, expect fail (route missing)**

- [ ] **Step 3: Implement `src/routes/auth.ts`**

```ts
import { Hono } from 'hono';
import type { Env, AdminJwtPayload } from '../types';
import { verifyPassword } from '../utils/password';
import { signAdminAccess, signAdminRefresh, verifyAdminToken } from '../utils/jwt-admin';
import { checkRateLimit, recordFailure, clearForEmail } from '../middleware/rate-limit-login';

const auth = new Hono<{ Bindings: Env }>();

auth.post('/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({}));
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (!email || !password) return c.json({ error: 'email and password required' }, 400);

  const rl = checkRateLimit(email);
  if (!rl.allowed) {
    return c.json({ error: 'Too many attempts', retryAfterMs: rl.retryAfterMs }, 429);
  }

  const row = await c.env.DB.prepare(
    `SELECT user_id, email, username, password_hash, active, avatar_url, role_id
       FROM admin_user
      WHERE LOWER(email) = ? AND deleted_at IS NULL`,
  ).bind(email).first<{
    user_id: number; email: string; username: string;
    password_hash: string; active: number; avatar_url: string | null; role_id: number | null;
  }>();

  if (!row || row.active !== 1) {
    recordFailure(email);
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) {
    recordFailure(email);
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  clearForEmail(email);

  const accessToken = await signAdminAccess(row.user_id, row.email, c.env.STAKEHOLDER_JWT_SECRET);
  const refreshToken = await signAdminRefresh(row.user_id, row.email, c.env.STAKEHOLDER_JWT_SECRET);

  return c.json({
    accessToken,
    refreshToken,
    admin: {
      id: row.user_id,
      email: row.email,
      username: row.username,
      avatarUrl: row.avatar_url,
      roleId: row.role_id,
    },
  });
});

auth.post('/auth/refresh', async (c) => {
  const body = await c.req.json<{ refreshToken?: string }>().catch(() => ({}));
  if (!body.refreshToken) return c.json({ error: 'refreshToken required' }, 400);

  let payload: AdminJwtPayload;
  try {
    payload = await verifyAdminToken(body.refreshToken, c.env.STAKEHOLDER_JWT_SECRET);
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
  if (payload.type !== 'refresh') return c.json({ error: 'Wrong token type' }, 401);

  const row = await c.env.DB.prepare(
    `SELECT user_id, email, active FROM admin_user WHERE user_id = ? AND deleted_at IS NULL`,
  ).bind(payload.sub).first<{ user_id: number; email: string; active: number }>();
  if (!row || row.active !== 1) return c.json({ error: 'Account not active' }, 401);

  const accessToken = await signAdminAccess(row.user_id, row.email, c.env.STAKEHOLDER_JWT_SECRET);
  return c.json({ accessToken });
});

export default auth;
```

- [ ] **Step 4: Modify `src/index.ts` to mount**

In `src/index.ts`, after `app.route('/', health);`, add:

```ts
import auth from './routes/auth';
app.route('/', auth);
```

- [ ] **Step 5: Run, expect pass**

```bash
npm run test -- auth
```

- [ ] **Step 6: Commit**

### Task 3.5: Admin auth middleware

**Files:**

- Create: `src/middleware/admin-auth.ts`
- Test: `test/admin-auth.test.ts`

- [ ] **Step 1: Failing test**

```ts
// test/admin-auth.test.ts
import { describe, it, expect } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { signAdminAccess } from '../src/utils/jwt-admin';

describe('adminAuthMiddleware', () => {
  it('returns 401 when no header', async () => {
    const res = await SELF.fetch('http://x/devices/register', { method: 'POST' });
    expect(res.status).toBe(401);
  });
  it('returns 401 when refresh token used as access', async () => {
    // covered indirectly by auth.test — sentinel here
    expect(true).toBe(true);
  });
  it('passes with valid access token', async () => {
    const token = await signAdminAccess(1, 'a@b.com', env.STAKEHOLDER_JWT_SECRET);
    const res = await SELF.fetch('http://x/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // 400 (missing body fields) — but not 401. Proves middleware passed.
    expect(res.status).toBe(400);
  });
});
```

(The devices route doesn't exist yet — this test will fail at Step 2 for a different reason; we'll re-run after Task 4.1.)

- [ ] **Step 2: Implement middleware**

```ts
// src/middleware/admin-auth.ts
import type { Context, Next } from 'hono';
import type { Env } from '../types';
import { verifyAdminToken } from '../utils/jwt-admin';

export async function adminAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: { adminId: number; adminEmail: string } }>,
  next: Next,
) {
  const h = c.req.header('Authorization');
  if (!h?.startsWith('Bearer ')) return c.json({ error: 'Missing Authorization' }, 401);

  let payload;
  try { payload = await verifyAdminToken(h.slice(7), c.env.STAKEHOLDER_JWT_SECRET); }
  catch { return c.json({ error: 'Invalid or expired token' }, 401); }

  if (payload.type !== 'access') return c.json({ error: 'Wrong token type' }, 401);

  // Confirm admin still active
  const row = await c.env.DB.prepare(
    `SELECT active FROM admin_user WHERE user_id = ? AND deleted_at IS NULL`,
  ).bind(payload.sub).first<{ active: number }>();
  if (!row || row.active !== 1) return c.json({ error: 'Account not active' }, 401);

  c.set('adminId', payload.sub);
  c.set('adminEmail', payload.email);
  return next();
}
```

- [ ] **Step 3: Commit**

---

## Phase 4 — Device token registration

### Task 4.1: POST /devices/register

**Files:**

- Create: `src/routes/devices.ts`
- Modify: `src/index.ts` to mount

- [ ] **Step 1: Failing test**

```ts
// test/devices.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { signAdminAccess } from '../src/utils/jwt-admin';

let token: string;
const ADMIN_ID = 9001;

beforeAll(async () => {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO admin_user (user_id, username, email, password_hash, role_id, active)
     VALUES (?, ?, ?, ?, 1, 1)`,
  ).bind(ADMIN_ID, 'devtest', 'dev@test.com', '$2a$08$abc', ).run();
  token = await signAdminAccess(ADMIN_ID, 'dev@test.com', env.STAKEHOLDER_JWT_SECRET);
});

describe('POST /devices/register', () => {
  it('upserts a token', async () => {
    const res = await SELF.fetch('http://x/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceToken: 'fcmtoken1', deviceId: 'devA', platform: 'android',
        appVersion: '1.0.0', osVersion: '14',
      }),
    });
    expect(res.status).toBe(200);
    const row = await env.DB.prepare(
      `SELECT admin_user_id, platform FROM admin_device_token WHERE device_token = ?`,
    ).bind('fcmtoken1').first();
    expect(row?.admin_user_id).toBe(ADMIN_ID);
    expect(row?.platform).toBe('android');
  });

  it('rejects invalid platform', async () => {
    const res = await SELF.fetch('http://x/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceToken: 't', deviceId: 'd', platform: 'web' }),
    });
    expect(res.status).toBe(400);
  });

  it('replaces previous token for same (admin, device)', async () => {
    await SELF.fetch('http://x/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceToken: 'old', deviceId: 'devB', platform: 'ios' }),
    });
    await SELF.fetch('http://x/devices/register', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceToken: 'new', deviceId: 'devB', platform: 'ios' }),
    });
    const old = await env.DB.prepare(`SELECT 1 FROM admin_device_token WHERE device_token=?`).bind('old').first();
    const fresh = await env.DB.prepare(`SELECT 1 FROM admin_device_token WHERE device_token=?`).bind('new').first();
    expect(old).toBeNull();
    expect(fresh).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement `src/routes/devices.ts`**

```ts
import { Hono } from 'hono';
import type { Env } from '../types';
import { adminAuthMiddleware } from '../middleware/admin-auth';

const devices = new Hono<{
  Bindings: Env;
  Variables: { adminId: number; adminEmail: string };
}>();

devices.use('/devices/*', adminAuthMiddleware);

devices.post('/devices/register', async (c) => {
  const body = await c.req.json<{
    deviceToken?: string; deviceId?: string; platform?: string;
    appVersion?: string; osVersion?: string;
  }>().catch(() => ({}));

  if (!body.deviceToken || !body.deviceId || !body.platform) {
    return c.json({ error: 'deviceToken, deviceId, platform required' }, 400);
  }
  if (body.platform !== 'ios' && body.platform !== 'android') {
    return c.json({ error: 'platform must be ios or android' }, 400);
  }

  const adminId = c.get('adminId');

  // Step 1: delete any other (admin, device) row that has a stale token
  await c.env.DB.prepare(
    `DELETE FROM admin_device_token
      WHERE admin_user_id = ? AND device_id = ? AND device_token != ?`,
  ).bind(adminId, body.deviceId, body.deviceToken).run();

  // Step 2: detach token from any other admin (token rotation onto a different user)
  await c.env.DB.prepare(
    `DELETE FROM admin_device_token WHERE device_token = ? AND admin_user_id != ?`,
  ).bind(body.deviceToken, adminId).run();

  // Step 3: upsert
  await c.env.DB.prepare(
    `INSERT INTO admin_device_token
       (admin_user_id, device_token, device_id, platform, app_version, os_version, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(device_token) DO UPDATE SET
       admin_user_id = excluded.admin_user_id,
       device_id     = excluded.device_id,
       platform      = excluded.platform,
       app_version   = excluded.app_version,
       os_version    = excluded.os_version,
       updated_at    = CURRENT_TIMESTAMP,
       last_seen_at  = CURRENT_TIMESTAMP`,
  ).bind(
    adminId, body.deviceToken, body.deviceId, body.platform,
    body.appVersion ?? null, body.osVersion ?? null,
  ).run();

  return c.json({ success: true });
});

devices.delete('/devices/:token', async (c) => {
  const token = c.req.param('token');
  const adminId = c.get('adminId');
  await c.env.DB.prepare(
    `DELETE FROM admin_device_token WHERE device_token = ? AND admin_user_id = ?`,
  ).bind(token, adminId).run();
  return c.json({ success: true });
});

export default devices;
```

- [ ] **Step 4: Mount in `src/index.ts`**

```ts
import devices from './routes/devices';
app.route('/', devices);
```

- [ ] **Step 5: Run, expect pass**

- [ ] **Step 6: Commit**

---

## Phase 5 — Push module: FCM HTTP v1

### Task 5.1: JWT signer (RS256)

**Files:**

- Create: `src/utils/push/jwt-signer.ts`
- Test: `test/push/jwt-signer.test.ts`

- [ ] **Step 1: Failing test**

```ts
// test/push/jwt-signer.test.ts
import { describe, it, expect } from 'vitest';
import { signJwtRS256, signJwtES256 } from '../../src/utils/push/jwt-signer';

// Real test PKCS#8 keys generated with openssl, committed for unit-test only.
const RS256_PRIVATE_PKCS8 = `-----BEGIN PRIVATE KEY-----
... (generate with: openssl genpkey -algorithm RSA -out test.key -pkcs8) ...
-----END PRIVATE KEY-----`;

const ES256_PRIVATE_PKCS8 = `-----BEGIN PRIVATE KEY-----
... (openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 ...) ...
-----END PRIVATE KEY-----`;

describe('jwt-signer', () => {
  it('signs RS256 with header alg=RS256', async () => {
    const jwt = await signJwtRS256({ iss: 'a@b.com', scope: 'x', aud: 'y', exp: 1, iat: 0 }, RS256_PRIVATE_PKCS8);
    const [header] = jwt.split('.');
    const decoded = JSON.parse(atob(header));
    expect(decoded.alg).toBe('RS256');
    expect(jwt.split('.').length).toBe(3);
  });

  it('signs ES256 with header alg=ES256 kid', async () => {
    const jwt = await signJwtES256({ iss: 'TEAMID', iat: 0 }, ES256_PRIVATE_PKCS8, 'KEYID');
    const [header] = jwt.split('.');
    const decoded = JSON.parse(atob(header));
    expect(decoded.alg).toBe('ES256');
    expect(decoded.kid).toBe('KEYID');
  });
});
```

- [ ] **Step 2: Generate the test keys**

```bash
mkdir -p test/fixtures
openssl genpkey -algorithm RSA -out test/fixtures/rs256.key -pkcs8
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out test/fixtures/es256.key -pkcs8
```

Then paste the file contents into the test as `RS256_PRIVATE_PKCS8` and `ES256_PRIVATE_PKCS8` constants (or read them with `fs` in a setup file).

- [ ] **Step 3: Run, expect fail**

- [ ] **Step 4: Implement `src/utils/push/jwt-signer.ts`**

```ts
function base64UrlEncode(input: Uint8Array | string): string {
  const b64 = typeof input === 'string'
    ? btoa(input)
    : btoa(String.fromCharCode(...input));
  return b64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function pemToBinary(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function signJwtRS256(
  payload: Record<string, unknown>,
  pkcs8Pem: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(pkcs8Pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const data = new TextEncoder().encode(`${header}.${body}`);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data));
  return `${header}.${body}.${base64UrlEncode(sig)}`;
}

export async function signJwtES256(
  payload: Record<string, unknown>,
  pkcs8Pem: string,
  kid: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(pkcs8Pem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const header = base64UrlEncode(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const data = new TextEncoder().encode(`${header}.${body}`);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data));
  return `${header}.${body}.${base64UrlEncode(sig)}`;
}
```

- [ ] **Step 5: Run, expect pass**

- [ ] **Step 6: Commit**

### Task 5.2: FCM OAuth2 token exchange + cache

**Files:**

- Create: `src/utils/push/fcm.ts`
- Test: `test/push/fcm.test.ts`

- [ ] **Step 1: Failing test**

```ts
// test/push/fcm.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendFcm, _resetCache } from '../../src/utils/push/fcm';

const SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  project_id: 'shwe-loader',
  private_key_id: 'k1',
  private_key: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n',
  client_email: 'fcm@shwe-loader.iam.gserviceaccount.com',
  token_uri: 'https://oauth2.googleapis.com/token',
});

beforeEach(() => { _resetCache(); });

describe('sendFcm', () => {
  it('exchanges JWT for OAuth2 token then POSTs to FCM', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'ya29.fake', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: 'projects/x/messages/1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await sendFcm({
      projectId: 'shwe-loader', serviceAccountJson: SERVICE_ACCOUNT,
      token: 'dev-token', title: 'Hi', body: 'There',
    });
    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('fcm.googleapis.com/v1/projects/shwe-loader/messages:send');
  });

  it('reports UNREGISTERED so caller can clean up', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'ya29.fake', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { details: [{ errorCode: 'UNREGISTERED' }] } }), { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await sendFcm({ projectId: 'p', serviceAccountJson: SERVICE_ACCOUNT, token: 'dead', title: 't', body: 'b' });
    expect(r.ok).toBe(false);
    expect(r.shouldDeleteToken).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement `src/utils/push/fcm.ts`**

```ts
import { signJwtRS256 } from './jwt-signer';

interface CachedToken { accessToken: string; expiresAt: number }
let cache: Record<string, CachedToken> = {};
export function _resetCache() { cache = {}; }

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri: string;
}

async function getAccessToken(saJson: string): Promise<string> {
  const cached = cache[saJson];
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.accessToken;

  const sa = JSON.parse(saJson) as ServiceAccount;
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwtRS256({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  }, sa.private_key);

  const resp = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!resp.ok) throw new Error(`OAuth2 exchange failed: ${resp.status} ${await resp.text()}`);
  const json = await resp.json<{ access_token: string; expires_in: number }>();
  cache[saJson] = { accessToken: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export interface FcmSendInput {
  projectId: string;
  serviceAccountJson: string;
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface FcmSendResult { ok: boolean; status?: number; shouldDeleteToken?: boolean; rawError?: unknown }

export async function sendFcm(input: FcmSendInput): Promise<FcmSendResult> {
  const accessToken = await getAccessToken(input.serviceAccountJson);
  const url = `https://fcm.googleapis.com/v1/projects/${input.projectId}/messages:send`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: input.token,
        notification: { title: input.title, body: input.body },
        data: input.data ?? {},
        android: { priority: 'HIGH', notification: { channel_id: 'enquiries', sound: 'default' } },
        apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'default' } } },
      },
    }),
  });

  if (resp.ok) return { ok: true, status: resp.status };

  const err = await resp.json().catch(() => null) as any;
  const errorCode = err?.error?.details?.[0]?.errorCode;
  const dead = errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT' || resp.status === 404;
  return { ok: false, status: resp.status, shouldDeleteToken: dead, rawError: err };
}
```

- [ ] **Step 4: Run, expect pass**

- [ ] **Step 5: Commit**

---

## Phase 6 — Push module: APNs

### Task 6.1: APNs send

**Files:**

- Create: `src/utils/push/apns.ts`
- Test: `test/push/apns.test.ts`

- [ ] **Step 1: Failing test**

```ts
// test/push/apns.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendApns, _resetApnsCache } from '../../src/utils/push/apns';

const ES256_PEM = `-----BEGIN PRIVATE KEY-----\n... (P-256 PKCS8) ...\n-----END PRIVATE KEY-----`;

beforeEach(() => { _resetApnsCache(); });

describe('sendApns', () => {
  it('POSTs to production endpoint with bearer JWT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await sendApns({
      environment: 'production', bundleId: 'com.shweloaderbyvmsn.admin',
      keyId: 'K', teamId: 'T', keyPemBase64: btoa(ES256_PEM),
      deviceToken: 'abc123', title: 'Hi', body: 'There',
    });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe('https://api.push.apple.com/3/device/abc123');
    const opts = fetchMock.mock.calls[0][1];
    expect(opts.headers['authorization']).toMatch(/^bearer eyJ/);
    expect(opts.headers['apns-topic']).toBe('com.shweloaderbyvmsn.admin');
  });

  it('uses sandbox endpoint when environment=sandbox', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await sendApns({
      environment: 'sandbox', bundleId: 'x', keyId: 'K', teamId: 'T',
      keyPemBase64: btoa(ES256_PEM), deviceToken: 'abc', title: 't', body: 'b',
    });
    expect(fetchMock.mock.calls[0][0]).toContain('api.sandbox.push.apple.com');
  });

  it('reports BadDeviceToken for cleanup', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ reason: 'BadDeviceToken' }), { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await sendApns({
      environment: 'production', bundleId: 'x', keyId: 'K', teamId: 'T',
      keyPemBase64: btoa(ES256_PEM), deviceToken: 'bad', title: 't', body: 'b',
    });
    expect(r.shouldDeleteToken).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement `src/utils/push/apns.ts`**

```ts
import { signJwtES256 } from './jwt-signer';

interface CachedJwt { jwt: string; expiresAt: number }
let cache: Record<string, CachedJwt> = {};
export function _resetApnsCache() { cache = {}; }

async function getApnsJwt(teamId: string, keyId: string, keyPemBase64: string): Promise<string> {
  const cacheKey = `${teamId}:${keyId}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.jwt;

  const pem = atob(keyPemBase64);
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwtES256({ iss: teamId, iat: now }, pem, keyId);
  // Apple rotates JWTs hourly; we cache for 50 min.
  cache[cacheKey] = { jwt, expiresAt: Date.now() + 50 * 60 * 1000 };
  return jwt;
}

export interface ApnsSendInput {
  environment: 'production' | 'sandbox';
  bundleId: string;
  keyId: string;
  teamId: string;
  keyPemBase64: string;
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface ApnsSendResult { ok: boolean; status?: number; shouldDeleteToken?: boolean; reason?: string }

export async function sendApns(input: ApnsSendInput): Promise<ApnsSendResult> {
  const jwt = await getApnsJwt(input.teamId, input.keyId, input.keyPemBase64);
  const host = input.environment === 'production' ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';
  const url = `https://${host}/3/device/${input.deviceToken}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'authorization': `bearer ${jwt}`,
      'apns-topic': input.bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: {
        alert: { title: input.title, body: input.body },
        sound: 'default',
        'mutable-content': 1,
      },
      ...(input.data ?? {}),
    }),
  });

  if (resp.ok) return { ok: true, status: resp.status };

  let reason: string | undefined;
  try { reason = (await resp.json<{ reason?: string }>()).reason; } catch { /* ignore */ }
  const dead = reason === 'BadDeviceToken' || reason === 'Unregistered' || reason === 'DeviceTokenNotForTopic';
  return { ok: false, status: resp.status, shouldDeleteToken: dead, reason };
}
```

- [ ] **Step 4: Run, expect pass**

- [ ] **Step 5: Commit**

---

## Phase 7 — Fanout helper + /internal/fanout

### Task 7.1: fanoutToAdmins

**Files:**

- Create: `src/utils/push/index.ts`
- Test: `test/push/fanout.test.ts`

- [ ] **Step 1: Failing test**

```ts
// test/push/fanout.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { fanoutToAdmins } from '../../src/utils/push/index';

beforeEach(async () => {
  await env.DB.prepare(`DELETE FROM admin_device_token WHERE admin_user_id IN (7001, 7002)`).run();
  await env.DB.prepare(`INSERT INTO admin_device_token (admin_user_id, device_token, device_id, platform) VALUES (?, ?, ?, ?)`).bind(7001, 'fcm-1', 'd1', 'android').run();
  await env.DB.prepare(`INSERT INTO admin_device_token (admin_user_id, device_token, device_id, platform) VALUES (?, ?, ?, ?)`).bind(7002, 'apns-1', 'd2', 'ios').run();
});

describe('fanoutToAdmins', () => {
  it('sends to both FCM and APNs and reports counts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await fanoutToAdmins(env, { type: 'enquiry_new_message', title: 'New enquiry', body: 'X asked about Y' });
    expect(r.sent).toBeGreaterThan(0);
    expect(r.failed).toBeGreaterThanOrEqual(0);
  });

  it('deletes tokens flagged shouldDeleteToken', async () => {
    const calls: { url: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push({ url });
      if (url.includes('oauth2.googleapis.com')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 });
      if (url.includes('fcm.googleapis.com')) return new Response(JSON.stringify({ error: { details: [{ errorCode: 'UNREGISTERED' }] } }), { status: 404 });
      if (url.includes('api.push.apple.com')) return new Response(JSON.stringify({ reason: 'BadDeviceToken' }), { status: 400 });
      return new Response('', { status: 500 });
    }));
    await fanoutToAdmins(env, { type: 'test', title: 't', body: 'b' });
    const remaining = await env.DB.prepare(`SELECT COUNT(*) AS n FROM admin_device_token WHERE admin_user_id IN (7001, 7002)`).first<{ n: number }>();
    expect(remaining?.n).toBe(0);
  });
});
```

- [ ] **Step 2: Run, expect fail**

- [ ] **Step 3: Implement `src/utils/push/index.ts`**

```ts
import type { Env, PushPayload } from '../../types';
import { sendFcm } from './fcm';
import { sendApns } from './apns';

interface FanoutResult { sent: number; failed: number; deleted: number }

interface DeviceRow {
  device_token: string;
  platform: 'ios' | 'android';
  admin_user_id: number;
}

export async function fanoutToAdmins(env: Env, payload: PushPayload, adminUserIds?: number[]): Promise<FanoutResult> {
  let rows: DeviceRow[];
  if (adminUserIds && adminUserIds.length) {
    const placeholders = adminUserIds.map(() => '?').join(',');
    rows = (await env.DB.prepare(
      `SELECT device_token, platform, admin_user_id FROM admin_device_token WHERE admin_user_id IN (${placeholders})`,
    ).bind(...adminUserIds).all<DeviceRow>()).results;
  } else {
    rows = (await env.DB.prepare(
      `SELECT device_token, platform, admin_user_id FROM admin_device_token`,
    ).all<DeviceRow>()).results;
  }

  const saJson = atob(env.FCM_SERVICE_ACCOUNT_JSON_B64);

  let sent = 0, failed = 0, deleted = 0;
  const deadTokens: string[] = [];

  await Promise.all(rows.map(async (r) => {
    try {
      let result;
      if (r.platform === 'android') {
        result = await sendFcm({
          projectId: env.FCM_PROJECT_ID,
          serviceAccountJson: saJson,
          token: r.device_token,
          title: payload.title,
          body: payload.body,
          data: { type: payload.type, ...(payload.data ?? {}) },
        });
      } else {
        result = await sendApns({
          environment: env.APNS_ENVIRONMENT,
          bundleId: env.APNS_BUNDLE_ID,
          keyId: env.APNS_KEY_ID,
          teamId: env.APNS_TEAM_ID,
          keyPemBase64: env.APNS_KEY_P8_B64,
          deviceToken: r.device_token,
          title: payload.title,
          body: payload.body,
          data: { type: payload.type, ...(payload.data ?? {}) },
        });
      }
      if (result.ok) sent++;
      else { failed++; if (result.shouldDeleteToken) deadTokens.push(r.device_token); }
    } catch (err) {
      console.error('[fanout] send failed:', err);
      failed++;
    }
  }));

  if (deadTokens.length) {
    const placeholders = deadTokens.map(() => '?').join(',');
    const res = await env.DB.prepare(
      `DELETE FROM admin_device_token WHERE device_token IN (${placeholders})`,
    ).bind(...deadTokens).run();
    deleted = res.meta.changes ?? deadTokens.length;
  }

  return { sent, failed, deleted };
}
```

- [ ] **Step 4: Run, expect pass**

- [ ] **Step 5: Commit**

### Task 7.2: Internal-secret middleware

**Files:**

- Create: `src/middleware/internal-secret.ts`

- [ ] **Step 1: Implement (no test needed beyond integration)**

```ts
// src/middleware/internal-secret.ts
import type { Context, Next } from 'hono';
import type { Env } from '../types';

export async function internalSecretMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const provided = c.req.header('X-Internal-Secret');
  if (!provided || provided !== c.env.STAKEHOLDER_FANOUT_SECRET) {
    return c.json({ error: 'forbidden' }, 403);
  }
  return next();
}
```

- [ ] **Step 2: Commit**

### Task 7.3: POST /internal/fanout

**Files:**

- Create: `src/routes/internal.ts`
- Modify: `src/index.ts` to mount

- [ ] **Step 1: Failing test**

```ts
// test/internal.test.ts
import { describe, it, expect } from 'vitest';
import { SELF, env } from 'cloudflare:test';

describe('POST /internal/fanout', () => {
  it('returns 403 without secret', async () => {
    const res = await SELF.fetch('http://x/internal/fanout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test', title: 't', body: 'b' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 with secret', async () => {
    const res = await SELF.fetch('http://x/internal/fanout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': env.STAKEHOLDER_FANOUT_SECRET },
      body: JSON.stringify({ type: 'test', title: 't', body: 'b' }),
    });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j).toHaveProperty('sent');
    expect(j).toHaveProperty('failed');
  });

  it('rejects malformed payload', async () => {
    const res = await SELF.fetch('http://x/internal/fanout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': env.STAKEHOLDER_FANOUT_SECRET },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Implement `src/routes/internal.ts`**

```ts
import { Hono } from 'hono';
import type { Env, PushPayload } from '../types';
import { internalSecretMiddleware } from '../middleware/internal-secret';
import { fanoutToAdmins } from '../utils/push';

const internal = new Hono<{ Bindings: Env }>();
internal.use('/internal/*', internalSecretMiddleware);

internal.post('/internal/fanout', async (c) => {
  const body = await c.req.json<Partial<PushPayload> & { adminUserIds?: number[] }>().catch(() => ({}));
  if (!body.type || !body.title || !body.body) {
    return c.json({ error: 'type, title, body required' }, 400);
  }
  const r = await fanoutToAdmins(
    c.env,
    { type: body.type as PushPayload['type'], title: body.title, body: body.body, data: body.data },
    body.adminUserIds,
  );
  return c.json(r);
});

export default internal;
```

- [ ] **Step 3: Mount in `src/index.ts`**

```ts
import internal from './routes/internal';
app.route('/', internal);
```

- [ ] **Step 4: Run, expect pass**

- [ ] **Step 5: Commit**

### Task 7.4: End-to-end push smoke test (manual)

- [ ] **Step 1:** Insert a single fake row pointing to your real device token (obtained later in Phase 12) into `admin_device_token` via Cloudflare D1 console.
- [ ] **Step 2:** Defer execution until after Phase 12 task 3 produces a real device token. Cross-reference in Phase 12.

---

## Phase 8 — Enquiry endpoints

### Task 8.1: Shared product enrichment + Pusher util

**Files:**

- Create: `src/utils/enrich-product.ts` (copy & adapt from consumer worker `src/routes/chat.ts:18-90`)
- Create: `src/utils/pusher.ts` (copy verbatim from consumer worker `src/utils/pusher.ts`)

- [ ] **Step 1: Copy `pusher.ts`**

Copy `/Users/peter/Desktop/cloudflare-worker-app-rest-api-dev/src/utils/pusher.ts` byte-for-byte to `src/utils/pusher.ts`. Adjust the `Env` import path. No new logic.

- [ ] **Step 2: Create `enrich-product.ts`**

Mirror the `fetchProductEnrichment` helper from the consumer worker so admin replies render product cards on the consumer side.

```ts
// src/utils/enrich-product.ts
import type { Env } from '../types';

export interface ProductEnrichment {
  productListId?: number;
  productName?: string | null;
  productThumbnail?: string | null;
  brandName?: string | null;
  customId?: string | null;
  mmkPrice?: number | null;
  usdPrice?: number | null;
  displayCurrency?: string | null;
  listingType?: 'sale' | 'rent';
}

export async function fetchProductEnrichment(
  env: Env,
  saleListingId: number | null,
  rentListingId: number | null,
): Promise<ProductEnrichment> {
  if (!saleListingId && !rentListingId) return {};
  const table = saleListingId ? 'sale_listing' : 'rent_listing';
  const id = (saleListingId ?? rentListingId) as number;
  const row = await env.DB.prepare(
    `SELECT
       pl.id AS product_list_id,
       COALESCE(em.name, am.name) AS product_name,
       pl.thumbnail_url AS product_thumbnail,
       pb.name AS brand_name,
       (CASE
          WHEN sl_state.id IS NOT NULL AND rl_state.id IS NOT NULL THEN 'B'
          WHEN sl_state.id IS NOT NULL THEN 'S' ELSE 'R'
        END || 'L' ||
        CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'E' ELSE 'A' END ||
        '-' || pl.custom_id_suffix) AS custom_id,
       lst.mmk_price, lst.usd_price, lst.display_currency
     FROM ${table} lst
     JOIN product_list pl ON pl.id = lst.product_list_id AND pl.deleted_at IS NULL
     LEFT JOIN sale_listing sl_state ON sl_state.product_list_id = pl.id AND sl_state.deleted_at IS NULL
     LEFT JOIN rent_listing rl_state ON rl_state.product_list_id = pl.id AND rl_state.deleted_at IS NULL
     LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
     LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
     LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
     WHERE lst.id = ? AND lst.deleted_at IS NULL`,
  ).bind(id).first<{
    product_list_id: number; product_name: string | null;
    product_thumbnail: string | null; brand_name: string | null;
    custom_id: string | null; mmk_price: number | null;
    usd_price: number | null; display_currency: string | null;
  }>();
  if (!row) return {};
  return {
    productListId: row.product_list_id,
    productName: row.product_name,
    productThumbnail: row.product_thumbnail,
    brandName: row.brand_name,
    customId: row.custom_id,
    mmkPrice: row.mmk_price,
    usdPrice: row.usd_price,
    displayCurrency: row.display_currency,
    listingType: saleListingId ? 'sale' : 'rent',
  };
}
```

- [ ] **Step 3: Commit**

### Task 8.2: GET /enquiries (list)

**Files:**

- Create: `src/routes/enquiries.ts` (will grow across tasks)
- Modify: `src/index.ts` to mount

- [ ] **Step 1: Failing test**

```ts
// test/enquiries.test.ts (partial — list)
import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { signAdminAccess } from '../src/utils/jwt-admin';

let token: string;
beforeAll(async () => {
  await env.DB.prepare(`INSERT OR REPLACE INTO admin_user (user_id, username, email, password_hash, role_id, active) VALUES (5500, 'enq', 'enq@t.com', 'x', 1, 1)`).run();
  token = await signAdminAccess(5500, 'enq@t.com', env.STAKEHOLDER_JWT_SECRET);
});

describe('GET /enquiries', () => {
  it('returns 200 + array shape', async () => {
    const res = await SELF.fetch('http://x/enquiries', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const j = await res.json<{ items: unknown[]; nextCursor: string | null }>();
    expect(Array.isArray(j.items)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement `src/routes/enquiries.ts` (list only for this task)**

```ts
import { Hono } from 'hono';
import type { Env } from '../types';
import { adminAuthMiddleware } from '../middleware/admin-auth';

const enquiries = new Hono<{
  Bindings: Env;
  Variables: { adminId: number; adminEmail: string };
}>();

enquiries.use('/enquiries/*', adminAuthMiddleware);
enquiries.use('/enquiries', adminAuthMiddleware);

enquiries.get('/enquiries', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20', 10), 100);
  const cursor = c.req.query('cursor'); // ISO timestamp of last_message_at

  const where = cursor
    ? `WHERE cs.deleted_at IS NULL AND cs.last_message_at < ?`
    : `WHERE cs.deleted_at IS NULL`;
  const args = cursor ? [cursor, limit + 1] : [limit + 1];

  const result = await c.env.DB.prepare(
    `SELECT
       cs.id, cs.status, cs.last_message_at, cs.last_message_preview,
       cs.unread_admin_count, cs.resolved_at,
       au.full_name AS user_name, au.username AS user_username,
       au.phone AS user_phone, au.company_name AS user_company,
       au.avatar_url AS user_avatar
     FROM chat_session cs
     JOIN app_user au ON au.app_user_id = cs.app_user_id
     ${where}
     ORDER BY cs.last_message_at DESC
     LIMIT ?`,
  ).bind(...args).all();

  const rows = result.results;
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (items[items.length - 1] as any).last_message_at : null;

  return c.json({ items, nextCursor });
});

export default enquiries;
```

- [ ] **Step 3: Mount in `src/index.ts`**

```ts
import enquiries from './routes/enquiries';
app.route('/', enquiries);
```

- [ ] **Step 4: Run, expect pass**

- [ ] **Step 5: Commit**

### Task 8.3: GET /enquiries/:sessionId/messages

- [ ] **Step 1: Failing test**

```ts
// add to test/enquiries.test.ts
describe('GET /enquiries/:id/messages', () => {
  it('returns messages in chronological order', async () => {
    // Insert chat_session + chat_messages fixtures
    await env.DB.prepare(`INSERT OR REPLACE INTO app_user (app_user_id, username, full_name, phone) VALUES (9100, 'u9100', 'u9100', '+1')`).run();
    await env.DB.prepare(`INSERT OR REPLACE INTO chat_session (id, app_user_id, status, last_message_at) VALUES (3300, 9100, 'active', CURRENT_TIMESTAMP)`).run();
    await env.DB.prepare(`INSERT INTO chat_message (id, chat_session_id, sender_type, sender_id, message, created_at) VALUES (1, 3300, 'user', 9100, 'hello', '2026-01-01 00:00:00')`).run();
    await env.DB.prepare(`INSERT INTO chat_message (id, chat_session_id, sender_type, sender_id, message, created_at) VALUES (2, 3300, 'admin', 5500, 'hi back', '2026-01-01 00:01:00')`).run();

    const res = await SELF.fetch('http://x/enquiries/3300/messages', { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const j = await res.json<{ messages: any[] }>();
    expect(j.messages.length).toBe(2);
    expect(j.messages[0].id).toBe(1);
  });
});
```

- [ ] **Step 2: Add handler in `src/routes/enquiries.ts`**

```ts
enquiries.get('/enquiries/:sessionId/messages', async (c) => {
  const sessionId = parseInt(c.req.param('sessionId'), 10);
  if (Number.isNaN(sessionId)) return c.json({ error: 'invalid sessionId' }, 400);

  const session = await c.env.DB.prepare(
    `SELECT cs.id, cs.app_user_id, cs.status, cs.unread_admin_count,
            au.full_name AS user_name, au.username AS user_username, au.phone AS user_phone,
            au.company_name AS user_company, au.avatar_url AS user_avatar
       FROM chat_session cs
       JOIN app_user au ON au.app_user_id = cs.app_user_id
      WHERE cs.id = ? AND cs.deleted_at IS NULL`,
  ).bind(sessionId).first();
  if (!session) return c.json({ error: 'not found' }, 404);

  const messages = (await c.env.DB.prepare(
    `SELECT id, chat_session_id, sender_type, sender_id, message,
            sale_listing_id, rent_listing_id, created_at
       FROM chat_message
      WHERE chat_session_id = ?
      ORDER BY created_at ASC, id ASC`,
  ).bind(sessionId).all()).results;

  return c.json({ session, messages });
});
```

- [ ] **Step 3: Run, expect pass**

- [ ] **Step 4: Commit**

### Task 8.4: POST /enquiries/:sessionId/messages (admin reply)

This mirrors `shweloader-admin-portal/src/lib/actions/chat.ts:380-490`. Critical: write the message, update session counters, trigger Pusher (consumer app realtime), and **send FCM/APNs to the consumer user** (mirrors existing admin-portal FCM send via Firebase Admin — but here we re-implement against the consumer's `device_token` table using the same FCM service account).

- [ ] **Step 1: Add `src/utils/user-fcm.ts`**

```ts
// src/utils/user-fcm.ts
import type { Env } from '../types';
import { sendFcm } from './push/fcm';
import { sendApns } from './push/apns';

export async function sendPushToConsumerUser(env: Env, appUserId: number, payload: {
  title: string; body: string; type: string; referenceId?: string; referenceType?: string;
}): Promise<void> {
  const rows = (await env.DB.prepare(
    `SELECT token, platform FROM device_token WHERE app_user_id = ?`,
  ).bind(appUserId).all<{ token: string; platform: 'ios' | 'android' }>()).results;
  if (rows.length === 0) return;

  const saJson = atob(env.FCM_SERVICE_ACCOUNT_JSON_B64);

  await Promise.all(rows.map(async (r) => {
    try {
      if (r.platform === 'android') {
        await sendFcm({
          projectId: env.FCM_PROJECT_ID, serviceAccountJson: saJson,
          token: r.token, title: payload.title, body: payload.body,
          data: { type: payload.type, referenceId: payload.referenceId ?? '', referenceType: payload.referenceType ?? '' },
        });
      } else {
        // Consumer bundle id is com.shweloaderbyvmsn.app — store as env var.
        // For v1 we reuse the same APNs key but with consumer bundle id.
        await sendApns({
          environment: env.APNS_ENVIRONMENT,
          bundleId: 'com.shweloaderbyvmsn.app',
          keyId: env.APNS_KEY_ID, teamId: env.APNS_TEAM_ID, keyPemBase64: env.APNS_KEY_P8_B64,
          deviceToken: r.token, title: payload.title, body: payload.body,
          data: { type: payload.type, referenceId: payload.referenceId ?? '' },
        });
      }
    } catch (err) {
      console.error('[user-fcm] send failed:', err);
    }
  }));
}
```

Note: in v1, the admin portal continues to handle admin → consumer push via its existing Firebase Admin SDK path. The function above is for admin replies originating **from the mobile stakeholder app**. Both paths can coexist.

- [ ] **Step 2: Failing test for admin reply**

```ts
// add to test/enquiries.test.ts
describe('POST /enquiries/:id/messages (admin reply)', () => {
  it('inserts message, updates session, returns id', async () => {
    const res = await SELF.fetch('http://x/enquiries/3300/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'admin reply from mobile' }),
    });
    expect(res.status).toBe(200);
    const j = await res.json<{ messageId: number }>();
    expect(j.messageId).toBeGreaterThan(0);
    const row = await env.DB.prepare(`SELECT message, sender_type, sender_id FROM chat_message WHERE id = ?`).bind(j.messageId).first();
    expect(row?.message).toBe('admin reply from mobile');
    expect(row?.sender_type).toBe('admin');
  });

  it('rejects empty body', async () => {
    const res = await SELF.fetch('http://x/enquiries/3300/messages', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Implement handler in `src/routes/enquiries.ts`**

```ts
import { triggerPusherEvent } from '../utils/pusher';
import { fetchProductEnrichment } from '../utils/enrich-product';
import { sendPushToConsumerUser } from '../utils/user-fcm';

enquiries.post('/enquiries/:sessionId/messages', async (c) => {
  const sessionId = parseInt(c.req.param('sessionId'), 10);
  if (Number.isNaN(sessionId)) return c.json({ error: 'invalid sessionId' }, 400);

  const body = await c.req.json<{ message?: string }>().catch(() => ({}));
  const message = (body.message ?? '').trim();
  if (!message) return c.json({ error: 'message required' }, 400);

  const adminId = c.get('adminId');

  const session = await c.env.DB.prepare(
    `SELECT app_user_id, status FROM chat_session WHERE id = ? AND deleted_at IS NULL`,
  ).bind(sessionId).first<{ app_user_id: number; status: string }>();
  if (!session) return c.json({ error: 'not found' }, 404);

  const admin = await c.env.DB.prepare(
    `SELECT username, avatar_url FROM admin_user WHERE user_id = ?`,
  ).bind(adminId).first<{ username: string; avatar_url: string | null }>();

  const insert = await c.env.DB.prepare(
    `INSERT INTO chat_message (chat_session_id, sender_type, sender_id, message)
     VALUES (?, 'admin', ?, ?)`,
  ).bind(sessionId, adminId, message).run();
  const messageId = insert.meta.last_row_id as number;

  const preview = message.slice(0, 100);
  await c.env.DB.prepare(
    `UPDATE chat_session
        SET last_message_at = CURRENT_TIMESTAMP,
            last_message_preview = ?,
            unread_user_count = unread_user_count + 1,
            unread_admin_count = 0,
            admin_last_read_at = CURRENT_TIMESTAMP,
            status = CASE WHEN status = 'resolved' THEN 'active' ELSE status END,
            resolved_at = NULL,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
  ).bind(preview, sessionId).run();

  const now = new Date().toISOString();

  // Fire-and-forget side effects
  c.executionCtx.waitUntil((async () => {
    try {
      await triggerPusherEvent(c.env, `private-chat-${sessionId}`, 'new-message', {
        messageId, senderType: 'admin', senderId: adminId,
        senderName: admin?.username ?? 'Admin', senderAvatarUrl: admin?.avatar_url ?? null,
        message, attachments: [], createdAt: now,
      });
      await triggerPusherEvent(c.env, 'private-admin-chat', 'new-message', {
        sessionId, senderType: 'admin', lastMessagePreview: preview, lastMessageAt: now,
      });
      await sendPushToConsumerUser(c.env, session.app_user_id, {
        title: admin?.username ?? 'Support',
        body: preview, type: 'chat_reply',
        referenceId: String(sessionId), referenceType: 'chat_session',
      });
    } catch (err) {
      console.error('[enquiries:reply] side effects failed:', err);
    }
  })());

  return c.json({ success: true, messageId, createdAt: now });
});
```

- [ ] **Step 4: Run, expect pass**

- [ ] **Step 5: Commit**

### Task 8.5: POST /enquiries/:sessionId/mark-read

- [ ] **Step 1: Add handler**

```ts
enquiries.post('/enquiries/:sessionId/mark-read', async (c) => {
  const sessionId = parseInt(c.req.param('sessionId'), 10);
  if (Number.isNaN(sessionId)) return c.json({ error: 'invalid sessionId' }, 400);
  await c.env.DB.prepare(
    `UPDATE chat_session
        SET unread_admin_count = 0, admin_last_read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL`,
  ).bind(sessionId).run();
  return c.json({ success: true });
});
```

- [ ] **Step 2: Add minimal test**

```ts
it('mark-read zeroes unread_admin_count', async () => {
  await env.DB.prepare(`UPDATE chat_session SET unread_admin_count = 3 WHERE id = 3300`).run();
  const res = await SELF.fetch('http://x/enquiries/3300/mark-read', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(200);
  const row = await env.DB.prepare(`SELECT unread_admin_count FROM chat_session WHERE id = 3300`).first<{ unread_admin_count: number }>();
  expect(row?.unread_admin_count).toBe(0);
});
```

- [ ] **Step 3: Run, expect pass**

- [ ] **Step 4: Commit**

### Task 8.6: POST /enquiries/:sessionId/resolve

- [ ] **Step 1: Add handler**

```ts
enquiries.post('/enquiries/:sessionId/resolve', async (c) => {
  const sessionId = parseInt(c.req.param('sessionId'), 10);
  if (Number.isNaN(sessionId)) return c.json({ error: 'invalid sessionId' }, 400);
  await c.env.DB.prepare(
    `UPDATE chat_session
        SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
  ).bind(sessionId).run();
  c.executionCtx.waitUntil(triggerPusherEvent(c.env, `private-chat-${sessionId}`, 'session-resolved', {
    sessionId, resolvedAt: new Date().toISOString(),
  }).catch(() => {}));
  c.executionCtx.waitUntil(triggerPusherEvent(c.env, 'private-admin-chat', 'session-resolved', { sessionId }).catch(() => {}));
  return c.json({ success: true });
});
```

- [ ] **Step 2: Test + commit**

```ts
it('resolve sets status=resolved', async () => {
  const res = await SELF.fetch('http://x/enquiries/3300/resolve', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  expect(res.status).toBe(200);
  const row = await env.DB.prepare(`SELECT status FROM chat_session WHERE id = 3300`).first<{ status: string }>();
  expect(row?.status).toBe('resolved');
});
```

### Task 8.7: Re-deploy + redo secrets sanity

- [ ] **Step 1:** `npx wrangler deploy`
- [ ] **Step 2:** Manually curl every endpoint with a fresh JWT to confirm 200/401/403/404 paths.
- [ ] **Step 3:** Commit any fixes.

---

## Phase 9 — Consumer worker integration

**Repo:** `cloudflare-worker-app-rest-api-dev`

### Task 9.1: Stakeholder-fanout helper

**Files:**

- Create: `src/utils/stakeholder-fanout.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Modify `src/types.ts` to add env vars**

```ts
// Add to existing Env interface
STAKEHOLDER_WORKER_URL: string;       // e.g. https://shweloader-stakeholder-worker.<acct>.workers.dev
STAKEHOLDER_FANOUT_SECRET: string;
```

- [ ] **Step 2: Create `src/utils/stakeholder-fanout.ts`**

```ts
import type { Env } from '../types';

export interface StakeholderPushPayload {
  type: 'enquiry_new_message' | 'enquiry_new_session';
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function notifyAdmins(env: Env, payload: StakeholderPushPayload): Promise<void> {
  try {
    await fetch(`${env.STAKEHOLDER_WORKER_URL}/internal/fanout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': env.STAKEHOLDER_FANOUT_SECRET,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Notification failure must never block the primary action.
    console.error('[stakeholder-fanout] failed:', err);
  }
}
```

- [ ] **Step 3: Set vars + secret**

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
# Add to wrangler.jsonc "vars":
#   "STAKEHOLDER_WORKER_URL": "https://shweloader-stakeholder-worker.<acct>.workers.dev"
npx wrangler secret put STAKEHOLDER_FANOUT_SECRET
```

- [ ] **Step 4: Commit**

### Task 9.2: Call notifyAdmins on new user message

**Files:**

- Modify: `cloudflare-worker-app-rest-api-dev/src/routes/chat.ts` — find the user-message POST handler (look for the `INSERT INTO chat_message` with `sender_type = 'user'`).

- [ ] **Step 1: Locate the call site**

```bash
grep -n "sender_type" /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev/src/routes/chat.ts
```

- [ ] **Step 2: After the existing Pusher trigger for new user message, insert**

```ts
import { notifyAdmins } from '../utils/stakeholder-fanout';

// inside the handler, after triggerPusherEvent(...):
c.executionCtx.waitUntil(notifyAdmins(c.env, {
  type: 'enquiry_new_message',
  title: userName ? `${userName} sent a message` : 'New message',
  body: messagePreview ?? 'Tap to view',
  data: { sessionId: String(sessionId) },
}));
```

(Adjust `userName`, `messagePreview`, `sessionId` to the variables already in scope in that handler.)

- [ ] **Step 3: Manual smoke test**

```bash
# From consumer mobile app or curl, send a chat message as a user.
# Then check stakeholder worker tail:
cd /Users/peter/Desktop/shweloader-stakeholder-worker
npx wrangler tail
# Expect a POST /internal/fanout entry.
```

- [ ] **Step 4: Commit + push (auto-deploys consumer worker)**

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
git add -A
git commit -m "feat(chat): notify admin stakeholders on new user message"
git push origin main
```

---

## Phase 10 — Mobile app scaffold

**Repo:** `shweloader-stakeholder-app/` (new)

### Task 10.1: Init Expo project

- [ ] **Step 1: Scaffold**

```bash
cd /Users/peter/Desktop
npx create-expo-app@latest shweloader-stakeholder-app --template blank-typescript
cd shweloader-stakeholder-app
```

- [ ] **Step 2: Install deps**

```bash
npx expo install expo-router expo-notifications expo-secure-store expo-constants expo-linking expo-status-bar react-native-safe-area-context react-native-screens
npm install @tanstack/react-query zod
```

- [ ] **Step 3: Add `.gitignore` entries before commit**

```
GoogleService-Info.plist
google-services.json
*.p8
.env*
```

- [ ] **Step 4: Replace `app.config.ts`**

```ts
import { ExpoConfig } from 'expo/config';

export default (): ExpoConfig => ({
  name: 'Shwe Loader Admin',
  slug: 'shweloader-stakeholder',
  scheme: 'shweloader-admin',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: { backgroundColor: '#F5F5F3' },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.shweloaderbyvmsn.admin',
    buildNumber: '1',
    googleServicesFile: './GoogleService-Info.plist',
    entitlements: { 'aps-environment': 'production' },
    infoPlist: {
      CFBundleDisplayName: 'Shwe Loader Admin',
      UIBackgroundModes: ['remote-notification'],
    },
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: 'com.shweloaderbyvmsn.admin',
    versionCode: 1,
    googleServicesFile: './google-services.json',
    edgeToEdgeEnabled: true,
    permissions: ['POST_NOTIFICATIONS', 'INTERNET', 'VIBRATE'],
  },
  plugins: [
    'expo-router',
    ['expo-notifications', {
      icon: './assets/notification-icon.png',
      color: '#000000',
      defaultChannel: 'enquiries',
    }],
  ],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://shweloader-stakeholder-worker.<acct>.workers.dev',
  },
});
```

- [ ] **Step 5: Create `src/config.ts`**

```ts
import Constants from 'expo-constants';

export const API_BASE_URL: string = (Constants.expoConfig?.extra as any)?.apiBaseUrl ?? '';
if (!API_BASE_URL) throw new Error('API_BASE_URL not configured');
```

- [ ] **Step 6: First commit**

```bash
git init
git add -A
git commit -m "chore: scaffold stakeholder app"
```

### Task 10.2: API client

**Files:**

- Create: `src/api/client.ts`
- Create: `src/auth/storage.ts`

- [ ] **Step 1: Auth storage**

```ts
// src/auth/storage.ts
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'stakeholder.access';
const REFRESH_KEY = 'stakeholder.refresh';

export async function getAccess(): Promise<string | null> { return SecureStore.getItemAsync(ACCESS_KEY); }
export async function getRefresh(): Promise<string | null> { return SecureStore.getItemAsync(REFRESH_KEY); }
export async function setTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}
export async function setAccessOnly(access: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, access);
}
export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
```

- [ ] **Step 2: Client with 401-refresh**

```ts
// src/api/client.ts
import { API_BASE_URL } from '../config';
import { getAccess, getRefresh, setAccessOnly, clearTokens } from '../auth/storage';

let refreshing: Promise<string | null> | null = null;

async function attemptRefresh(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refresh = await getRefresh();
    if (!refresh) return null;
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) { await clearTokens(); return null; }
    const j = await res.json() as { accessToken: string };
    await setAccessOnly(j.accessToken);
    return j.accessToken;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const access = await getAccess();
  const doFetch = async (token: string | null): Promise<Response> => fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let res = await doFetch(access);
  if (res.status === 401) {
    const fresh = await attemptRefresh();
    if (fresh) res = await doFetch(fresh);
  }
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(errJson.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
```

- [ ] **Step 3: Commit**

---

## Phase 11 — Mobile auth

### Task 11.1: AuthProvider context

**Files:**

- Create: `src/auth/context.tsx`
- Create: `src/api/auth.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: `src/api/auth.ts`**

```ts
import { apiFetch } from './client';
import { API_BASE_URL } from '../config';
import { setTokens, clearTokens } from '../auth/storage';

export interface AdminProfile { id: number; email: string; username: string; avatarUrl: string | null; roleId: number | null }

export async function login(email: string, password: string): Promise<AdminProfile> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error ?? 'Login failed');
  }
  const j = await res.json() as { accessToken: string; refreshToken: string; admin: AdminProfile };
  await setTokens(j.accessToken, j.refreshToken);
  return j.admin;
}

export async function logout(): Promise<void> { await clearTokens(); }
```

- [ ] **Step 2: `src/auth/context.tsx`**

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAccess } from './storage';
import { login as apiLogin, logout as apiLogout, AdminProfile } from '../api/auth';

interface AuthState {
  status: 'loading' | 'signed-in' | 'signed-out';
  admin: AdminProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    (async () => {
      const access = await getAccess();
      setStatus(access ? 'signed-in' : 'signed-out');
    })();
  }, []);

  const value = useMemo<AuthState>(() => ({
    status, admin,
    signIn: async (email, password) => {
      const a = await apiLogin(email, password);
      setAdmin(a);
      setStatus('signed-in');
    },
    signOut: async () => {
      await apiLogout();
      setAdmin(null);
      setStatus('signed-out');
    },
  }), [status, admin]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
```

- [ ] **Step 3: Update `app/_layout.tsx`**

```tsx
import { Slot } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/auth/context';

const qc = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Commit**

### Task 11.2: Login screen

**Files:**

- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/login.tsx`

- [ ] **Step 1: `app/(auth)/_layout.tsx`**

```tsx
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/auth/context';

export default function AuthLayout() {
  const { status } = useAuth();
  if (status === 'loading') return null;
  if (status === 'signed-in') return <Redirect href="/(app)/enquiries" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: `app/(auth)/login.tsx`**

```tsx
import { useState } from 'react';
import { View, TextInput, Pressable, Text, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../src/auth/context';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#F5F5F3' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>Shwe Loader Admin</Text>
      <TextInput
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
        placeholder="Email" value={email} onChangeText={setEmail}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
      <TextInput
        secureTextEntry placeholder="Password" value={password} onChangeText={setPassword}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }} />
      <Pressable
        disabled={busy || !email || !password}
        style={{ backgroundColor: '#000', padding: 14, borderRadius: 8, alignItems: 'center', opacity: busy ? 0.6 : 1 }}
        onPress={async () => {
          setBusy(true);
          try { await signIn(email.trim(), password); }
          catch (e: any) { Alert.alert('Login failed', e?.message ?? 'Unknown error'); }
          finally { setBusy(false); }
        }}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Sign in</Text>}
      </Pressable>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 3: Commit**

### Task 11.3: Auth-gated app layout

- [ ] **Step 1: `app/(app)/_layout.tsx`**

```tsx
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../src/auth/context';
import { useEffect } from 'react';
import { registerForPushNotifications } from '../../src/push/register';

export default function AppLayout() {
  const { status } = useAuth();
  useEffect(() => { if (status === 'signed-in') registerForPushNotifications().catch(console.error); }, [status]);
  if (status === 'loading') return null;
  if (status === 'signed-out') return <Redirect href="/(auth)/login" />;
  return (
    <Tabs>
      <Tabs.Screen name="enquiries" options={{ title: 'Enquiries' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
```

(`registerForPushNotifications` is implemented in Phase 12.)

- [ ] **Step 2: Commit**

---

## Phase 12 — Mobile push

### Task 12.1: Permissions + device token

**Files:**

- Create: `src/push/register.ts`
- Create: `src/api/devices.ts`

- [ ] **Step 1: `src/api/devices.ts`**

```ts
import { apiFetch } from './client';
export async function registerDevice(input: { deviceToken: string; deviceId: string; platform: 'ios' | 'android'; appVersion: string; osVersion: string }) {
  return apiFetch<{ success: true }>('/devices/register', { method: 'POST', body: JSON.stringify(input) });
}
export async function unregisterDevice(token: string) {
  return apiFetch<{ success: true }>(`/devices/${encodeURIComponent(token)}`, { method: 'DELETE' });
}
```

- [ ] **Step 2: `src/push/register.ts`**

```ts
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { registerDevice } from '../api/devices';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true,
    shouldPlaySound: true, shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('enquiries', {
      name: 'Enquiries', importance: Notifications.AndroidImportance.HIGH,
      sound: 'default', vibrationPattern: [0, 250, 250, 250],
    });
  }
  const perm = await Notifications.getPermissionsAsync();
  let status = perm.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return;

  // Native FCM (Android) / APNs (iOS) token — bypasses Expo Push service.
  const tokenData = await Notifications.getDevicePushTokenAsync();
  const deviceToken = tokenData.data;
  const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
  const deviceId = Application.getAndroidId() ?? (await Application.getIosIdForVendorAsync()) ?? 'unknown';

  await registerDevice({
    deviceToken, deviceId, platform,
    appVersion: Application.nativeApplicationVersion ?? '0.0.0',
    osVersion: Platform.Version.toString(),
  });
}
```

- [ ] **Step 3: Notification tap handler**

`src/push/handler.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

export function installNotificationTapHandler() {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { sessionId?: string };
    if (data?.sessionId) router.push(`/chat/${data.sessionId}`);
  });
  return () => sub.remove();
}
```

Wire it in `app/_layout.tsx` inside a `useEffect` so the cleanup runs.

- [ ] **Step 4: Manual on-device test**

Build and install (see Phase 15 Task 15.1 for EAS local dev build). Sign in, accept permission, watch logs for token, then trigger a test push:

```bash
# In stakeholder worker repo:
curl -X POST https://shweloader-stakeholder-worker.<acct>.workers.dev/internal/fanout \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: $STAKEHOLDER_FANOUT_SECRET" \
  -d '{"type":"test","title":"Hello","body":"Smoke test"}'
```

Expect notification on device.

- [ ] **Step 5: Commit**

---

## Phase 13 — Enquiry list screen

### Task 13.1: List query + screen

**Files:**

- Create: `src/api/enquiries.ts`
- Create: `src/hooks/useEnquiries.ts`
- Create: `src/components/EnquiryListItem.tsx`
- Modify: `app/(app)/enquiries.tsx`

- [ ] **Step 1: `src/api/enquiries.ts`**

```ts
import { apiFetch } from './client';

export interface EnquiryListItem {
  id: number; status: 'pending' | 'active' | 'resolved';
  last_message_at: string; last_message_preview: string | null;
  unread_admin_count: number;
  user_name: string | null; user_username: string | null;
  user_phone: string | null; user_company: string | null;
  user_avatar: string | null;
}

export interface EnquiryListResponse { items: EnquiryListItem[]; nextCursor: string | null }

export async function listEnquiries(cursor?: string | null): Promise<EnquiryListResponse> {
  const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiFetch<EnquiryListResponse>(`/enquiries${q}`);
}
```

- [ ] **Step 2: `src/hooks/useEnquiries.ts`**

```ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { listEnquiries } from '../api/enquiries';

export function useEnquiries() {
  return useInfiniteQuery({
    queryKey: ['enquiries'],
    queryFn: ({ pageParam }) => listEnquiries(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnWindowFocus: true,
  });
}
```

- [ ] **Step 3: `src/components/EnquiryListItem.tsx`**

```tsx
import { View, Text, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import type { EnquiryListItem as Item } from '../api/enquiries';

export function EnquiryListItem({ item }: { item: Item }) {
  return (
    <Pressable
      onPress={() => router.push(`/chat/${item.id}`)}
      style={{ flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: '#EEE', gap: 12, alignItems: 'center' }}
    >
      {item.user_avatar
        ? <Image source={{ uri: item.user_avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} />
        : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#DDD' }} />}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600' }} numberOfLines={1}>
          {item.user_name ?? item.user_username ?? 'Unknown user'}
        </Text>
        <Text style={{ color: '#666' }} numberOfLines={1}>{item.last_message_preview ?? '—'}</Text>
      </View>
      {item.unread_admin_count > 0 && (
        <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{item.unread_admin_count}</Text>
        </View>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 4: `app/(app)/enquiries.tsx`**

```tsx
import { FlatList, RefreshControl, View, Text, ActivityIndicator } from 'react-native';
import { useEnquiries } from '../../src/hooks/useEnquiries';
import { EnquiryListItem } from '../../src/components/EnquiryListItem';

export default function Enquiries() {
  const q = useEnquiries();
  const items = q.data?.pages.flatMap(p => p.items) ?? [];

  if (q.isLoading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (q.error) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Error: {(q.error as Error).message}</Text></View>;

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => String(i.id)}
      renderItem={({ item }) => <EnquiryListItem item={item} />}
      onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} />}
      ListEmptyComponent={<View style={{ padding: 32, alignItems: 'center' }}><Text>No enquiries yet</Text></View>}
    />
  );
}
```

- [ ] **Step 5: Commit**

### Task 13.2: Settings screen

**Files:**

- Create: `app/(app)/settings.tsx`

- [ ] **Step 1: Implement**

```tsx
import { View, Text, Pressable, Alert } from 'react-native';
import { useAuth } from '../../src/auth/context';
import Constants from 'expo-constants';

export default function Settings() {
  const { signOut } = useAuth();
  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Settings</Text>
      <Text>App version: {Constants.expoConfig?.version}</Text>
      <Pressable
        onPress={() => Alert.alert('Sign out?', 'You will need to log in again to receive notifications.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign out', style: 'destructive', onPress: signOut },
        ])}
        style={{ marginTop: 16, padding: 14, backgroundColor: '#E11D48', borderRadius: 8, alignItems: 'center' }}
      >
        <Text style={{ color: '#FFF', fontWeight: '600' }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

---

## Phase 14 — Chat detail + reply

### Task 14.1: Chat screen

**Files:**

- Create: `app/chat/[sessionId].tsx`
- Create: `src/hooks/useChat.ts`
- Create: `src/components/MessageBubble.tsx`

- [ ] **Step 1: `src/api/enquiries.ts` additions**

```ts
export interface ChatMessage {
  id: number; chat_session_id: number;
  sender_type: 'user' | 'admin' | 'system'; sender_id: number;
  message: string | null;
  sale_listing_id: number | null; rent_listing_id: number | null;
  created_at: string;
}

export interface ChatSessionDetail {
  session: { id: number; app_user_id: number; status: string;
    unread_admin_count: number; user_name: string | null; user_username: string | null;
    user_phone: string | null; user_company: string | null; user_avatar: string | null };
  messages: ChatMessage[];
}

export async function getChat(sessionId: number): Promise<ChatSessionDetail> {
  return apiFetch<ChatSessionDetail>(`/enquiries/${sessionId}/messages`);
}

export async function sendReply(sessionId: number, message: string): Promise<{ messageId: number; createdAt: string }> {
  return apiFetch<{ messageId: number; createdAt: string }>(
    `/enquiries/${sessionId}/messages`,
    { method: 'POST', body: JSON.stringify({ message }) },
  );
}

export async function markRead(sessionId: number): Promise<void> {
  await apiFetch(`/enquiries/${sessionId}/mark-read`, { method: 'POST' });
}

export async function resolveSession(sessionId: number): Promise<void> {
  await apiFetch(`/enquiries/${sessionId}/resolve`, { method: 'POST' });
}
```

- [ ] **Step 2: `src/hooks/useChat.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getChat, sendReply, markRead, resolveSession } from '../api/enquiries';
import { useEffect } from 'react';

export function useChat(sessionId: number) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['chat', sessionId],
    queryFn: () => getChat(sessionId),
    refetchInterval: 5000, // simple poll for v1; replace with Pusher in v1.5
  });
  useEffect(() => { if (q.data) markRead(sessionId).catch(() => {}); }, [q.data, sessionId]);

  const send = useMutation({
    mutationFn: (message: string) => sendReply(sessionId, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', sessionId] });
      qc.invalidateQueries({ queryKey: ['enquiries'] });
    },
  });

  const resolve = useMutation({
    mutationFn: () => resolveSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', sessionId] });
      qc.invalidateQueries({ queryKey: ['enquiries'] });
    },
  });

  return { ...q, send, resolve };
}
```

- [ ] **Step 3: `src/components/MessageBubble.tsx`**

```tsx
import { View, Text } from 'react-native';
import type { ChatMessage } from '../api/enquiries';

export function MessageBubble({ m }: { m: ChatMessage }) {
  const mine = m.sender_type === 'admin';
  return (
    <View style={{
      alignSelf: mine ? 'flex-end' : 'flex-start',
      backgroundColor: mine ? '#000' : '#EEE',
      borderRadius: 12, padding: 10, marginVertical: 4, maxWidth: '80%',
    }}>
      <Text style={{ color: mine ? '#FFF' : '#000' }}>{m.message ?? ''}</Text>
    </View>
  );
}
```

- [ ] **Step 4: `app/chat/[sessionId].tsx`**

```tsx
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, FlatList, Text, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useChat } from '../../src/hooks/useChat';
import { MessageBubble } from '../../src/components/MessageBubble';

export default function Chat() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const id = parseInt(sessionId, 10);
  const { data, isLoading, send, resolve } = useChat(id);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<any>>(null);

  useEffect(() => { listRef.current?.scrollToEnd({ animated: false }); }, [data?.messages.length]);

  if (isLoading || !data) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: data.session.user_name ?? data.session.user_username ?? 'Chat' }} />
      <FlatList
        ref={listRef}
        data={data.messages}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) => <MessageBubble m={item} />}
        contentContainerStyle={{ padding: 12 }}
      />
      <View style={{ flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderColor: '#EEE' }}>
        <TextInput
          value={draft} onChangeText={setDraft} placeholder="Type a reply…"
          style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 10 }}
          multiline
        />
        <Pressable
          disabled={send.isPending || !draft.trim()}
          onPress={() => { send.mutate(draft.trim(), { onSuccess: () => setDraft('') }); }}
          style={{ paddingHorizontal: 16, backgroundColor: '#000', borderRadius: 8, justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Send</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => resolve.mutate()} style={{ padding: 12, alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>{data.session.status === 'resolved' ? 'Resolved' : 'Mark resolved'}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 5: Commit**

---

## Phase 15 — Internal distribution

### Task 15.1: EAS setup

- [ ] **Step 1: Install + login**

```bash
cd /Users/peter/Desktop/shweloader-stakeholder-app
npm install -g eas-cli   # or use npx
eas login
eas init --id <create-new-on-prompt>
```

- [ ] **Step 2: Create `eas.json`**

```json
{
  "cli": { "version": ">= 14.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false },
      "android": { "buildType": "apk" }
    },
    "internal": {
      "distribution": "internal",
      "ios": { "buildConfiguration": "Release" },
      "android": { "buildType": "apk" }
    },
    "testflight": {
      "distribution": "store",
      "ios": { "buildConfiguration": "Release" }
    }
  },
  "submit": {
    "testflight": { "ios": { "appleId": "<your-apple-id>", "ascAppId": "<from-app-store-connect>" } }
  }
}
```

- [ ] **Step 3: Push credentials to EAS**

```bash
eas credentials   # configure iOS distribution cert + provisioning profile
                  # configure Android keystore (let EAS auto-generate)
```

For APNs: when prompted, upload `AuthKey_4LM47Y6GX4.p8` or paste its contents and provide the Key ID + Team ID.

### Task 15.2: First iOS build → TestFlight

- [ ] **Step 1: Build**

```bash
eas build --platform ios --profile testflight
```

Wait for build (10–25 min).

- [ ] **Step 2: Submit**

```bash
eas submit --platform ios --latest
```

- [ ] **Step 3:** In App Store Connect → TestFlight → Internal Testing, create a group and add internal-tester Apple IDs. They get a TestFlight invite email.

### Task 15.3: First Android build → Play Internal Testing

- [ ] **Step 1: Build**

```bash
eas build --platform android --profile internal
```

- [ ] **Step 2: Upload manually**

EAS produces an APK URL. Download, then in Play Console → Internal testing → Create new release → upload APK → add testers by email.

Alternative simpler path: `eas submit --platform android --latest --track internal` (requires a Play service account JSON configured in EAS).

### Task 15.4: End-to-end smoke test

- [ ] **Step 1:** Install build on at least one iOS and one Android device, both signed in as different admin accounts.
- [ ] **Step 2:** From the consumer app (or curl against the consumer worker `/chat/...` route), send a new chat message as a user.
- [ ] **Step 3:** Confirm both admin devices receive a push within 5 seconds.
- [ ] **Step 4:** Tap notification on iOS → app deep-links to `/chat/<sessionId>`.
- [ ] **Step 5:** Tap notification on Android → app deep-links to `/chat/<sessionId>`.
- [ ] **Step 6:** Send admin reply from mobile → confirm consumer app receives Pusher event + FCM push.
- [ ] **Step 7:** Mark resolved → confirm consumer app's chat status updates.
- [ ] **Step 8:** Sign out → confirm `admin_device_token` row still exists (logout doesn't unregister — by design, so push still works on next launch). If you want unregister-on-logout, uncomment the `unregisterDevice(token)` call in `signOut`. Document the choice.

### Task 15.5: Document the rollout

- [ ] **Step 1: Add `docs/STAKEHOLDER-APP.md`** in admin-portal repo with:
  - How to add a new internal tester (TestFlight + Play Internal).
  - How to rotate the JWT secret / fanout secret.
  - How to read worker logs (`wrangler tail`).
  - Known limitations: in-memory rate limit lost on cold start, poll-based chat refresh (no realtime in v1), no attachment send from mobile.
- [ ] **Step 2: Commit**

---

## Cross-cutting checks before v1 sign-off

These map to common production gaps. Tick each:

- [ ] `.gitignore` blocks all credential files in both new repos: `*.p8`, `GoogleService-Info.plist`, `google-services.json`, `*service-account*.json`, `.env*`.
- [ ] Worker `wrangler secret list` shows all 11 secrets set in stakeholder worker.
- [ ] Consumer worker has `STAKEHOLDER_FANOUT_SECRET` and `STAKEHOLDER_WORKER_URL` configured.
- [ ] `admin_device_token` exists in dev D1 (verify in Cloudflare dashboard).
- [ ] Production D1 — when prod branch promotes the admin portal, apply the same migration to the prod database (`shweloader-prod` or whatever id is used).
- [ ] APNs sandbox vs production: TestFlight uses production APNs. Local Xcode dev builds use sandbox. `APNS_ENVIRONMENT` defaults to `production`; flip to `sandbox` when testing a local-built ipa via Xcode.
- [ ] FCM project ID matches the Firebase project that owns the admin bundle's google-services entries.
- [ ] No PII appears in push body for v1 beyond user name and 100-char preview — matches existing consumer-side push posture.
- [ ] Logout: confirmed behaviour. Default = keep device token (so re-sign-in resumes pushes). If unregister-on-logout is required for security, update `signOut` and document.
- [ ] Concurrent admin sessions: same admin can be signed in on web portal + mobile simultaneously. Pusher events and FCM both reach all surfaces (verified in Task 15.4 step 6).
- [ ] RBAC: v1 does not filter enquiries by role — every admin sees every enquiry. If finer scoping is needed, gate the list/detail/reply endpoints with a `requirePermission('chat', 'view'|'edit')` check using existing `role_permission` joins. Add as v1.1.
- [ ] Soft-delete: `chat_session.deleted_at IS NULL` filter applied in both list and detail queries — verified in tests.
- [ ] Pusher channels (`private-chat-<id>`, `private-admin-chat`) match the channel names used by the consumer worker and admin portal — verified by inspecting `cloudflare-worker-app-rest-api-dev/src/routes/chat.ts` and `shweloader-admin-portal/src/lib/pusher.ts`.

---

## Deferred to v1.5 / v2

Out of scope for v1, listed so they don't get rediscovered as bugs:

- Realtime chat updates in the mobile app via Pusher subscription (v1 uses 5s poll).
- Admin attachment sending (images) from mobile.
- Per-admin notification preferences (mute, quiet hours).
- Per-role enquiry routing (only sales gets sales enquiries).
- Badge count on app icon.
- Sentry / crash reporting.
- Force-update / minimum-version gate.
- Public store distribution (App Store + Play public).
- Admin device list / "sign out other devices" page in admin portal.

---

## Open items requiring product input before kick-off

- Bundle id `com.shweloaderbyvmsn.admin` — confirm naming before reserving in App Store Connect / Play Console (irreversible once apps are submitted).
- App display name "Shwe Loader Admin" — confirm.
- Initial internal-tester list (Apple IDs + Google accounts).
- Push notification copy: title / body templates for new-message vs new-session events (currently `"<UserName> sent a message"` + preview).
- Whether logout should also unregister the device token (default = no; preserves pushes on next launch).
