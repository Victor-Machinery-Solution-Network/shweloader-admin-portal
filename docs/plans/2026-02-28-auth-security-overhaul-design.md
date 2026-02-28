# Auth Security Overhaul — Design Document

**Date:** 2026-02-28
**Status:** Approved
**Scope:** Authentication flow security audit and fixes

---

## Context

Security audit of the admin portal's authentication flow identified several vulnerabilities and hardening opportunities. The auth system uses NextAuth v5 with JWT sessions, Cloudflare Turnstile CAPTCHA, bcrypt password hashing, and a custom RBAC permission system backed by Cloudflare D1.

## Already Fixed (Prior to This Plan)

1. **`updateRole` Super Admin guard** — `src/lib/actions/role.ts`: Added `SUPER_ADMIN_ROLE_ID` check to prevent modifying Super Admin role permissions. Matches existing guard in `deleteRole`.
2. **`deleteAdmins` bulk limit** — `src/lib/actions/admin.ts`: Added missing `assertBulkLimit(ids)` call, consistent with all other bulk delete functions.

---

## Fix 1: Auth Check on `getPermissionsForRole`

**Problem:** `getPermissionsForRole` in `src/lib/actions/permission.ts` is a `"use server"` export with no authentication check. Any authenticated admin (regardless of role) can call it with any `roleId` to enumerate the full permission set of any role.

**Fix:** Add `await requireAuth()` at the top of the function.

**Files:** `src/lib/actions/permission.ts`

---

## Fix 2: `getFirstAllowedRoute` Fallback

**Problem:** When a user has zero matching permissions, `getFirstAllowedRoute` in `src/lib/auth.ts` returns `/dashboard/overview`, granting access to a page they shouldn't see.

**Fix:** Change the fallback return value from `"/dashboard/overview"` to `"/login"`.

**Files:** `src/lib/auth.ts`

---

## Fix 3: Normalize Login Error Messages

**Problem:** The login flow in `src/lib/actions/auth-actions.ts` returns `"Please enter a valid email address."` for email format validation failures, which differs from the generic `"Invalid email or password."` for credential failures. This allows attackers to distinguish email format issues from actual credential checks.

**Fix:** Replace the email format error message with the same generic message: `"Invalid email or password."`.

**Files:** `src/lib/actions/auth-actions.ts`

---

## Fix 4: Pusher-Based Instant Session Revocation

**Problem:** When an admin deactivates a user or changes their role, the JWT stays valid until the 5-minute periodic refresh. There is no way to force immediate logout.

**Fix:** Leverage the existing Pusher infrastructure to push a `session-revoked` event to the affected user's private channel.

**Server side:**
- After `toggleAdminActive` sets `active=0`: fire `pusher.trigger("private-user-{userId}", "session-revoked", { reason: "account_deactivated" })`
- After `updateAdmin` changes the role: fire `pusher.trigger("private-user-{userId}", "session-revoked", { reason: "role_changed" })`

**Client side:**
- In `PusherProvider`, bind to `session-revoked` event
- On receive: call `signOut({ redirect: false })` then `window.location.href = "/login"`

**Safety net:** The existing 5-minute JWT refresh remains as a fallback for users whose browser was offline when the Pusher event fired.

**Files:**
- `src/lib/actions/admin.ts` — fire Pusher events
- `src/components/providers/pusher-provider.tsx` — listen for `session-revoked`

---

## Fix 5: Audit Logging

**Problem:** No record of security-relevant events (login attempts, session revocations, role modifications) for incident investigation.

**Fix:** Create an `auditLog()` helper that inserts rows into the existing `admin_activity_log` table.

**Events to log:**

| Event | actor_id | Description format |
|---|---|---|
| `login_success` | user_id | `login_success \| ip={ip}` |
| `login_failed` | null | `login_failed \| email={email} \| reason={reason} \| ip={ip}` |
| `logout` | user_id | `logout` |
| `session_revoked` | revoker_id | `session_revoked \| target={userId} \| reason={reason}` |
| `role_modified` | modifier_id | `role_modified \| role={roleId}` |
| `admin_deactivated` | actor_id | `admin_deactivated \| target={userId}` |

**Helper signature:**
```typescript
async function auditLog(userId: number | null, description: string): Promise<void>
```

Calls are fire-and-forget (non-blocking). IP is extracted from `headers()` via `x-forwarded-for` or `x-real-ip`.

**Files:**
- `src/lib/actions/audit.ts` (new) — `auditLog` helper
- `src/lib/actions/auth-actions.ts` — log login success/failure/logout
- `src/lib/actions/admin.ts` — log deactivation
- `src/lib/actions/role.ts` — log role modifications

---

## Decision Log

| Decision | Chosen | Alternatives Considered |
|---|---|---|
| Rate limiter storage | Keep in-memory Map | D1-backed (rejected: unnecessary complexity for admin portal) |
| IP-based rate limiting | Skip | Add IP tracking (rejected: Turnstile already blocks automation) |
| Session revocation | Pusher events | Reduce JWT refresh to 1 min; Add force_logout_at column |
| Audit log table | Reuse `admin_activity_log` | New dedicated `audit_log` table |
| Error normalization | Single generic message | Keep distinct messages |
