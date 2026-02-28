# Auth Security Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 5 security vulnerabilities in the authentication flow identified during security audit.

**Architecture:** Surgical fixes to existing files. One new file (`audit.ts`). Leverages existing Pusher infrastructure for session revocation. Uses existing `admin_activity_log` D1 table for audit events.

**Tech Stack:** Next.js 16, NextAuth v5, Cloudflare D1, Pusher, TypeScript

**Design doc:** `docs/plans/2026-02-28-auth-security-overhaul-design.md`

---

### Task 1: Auth Check on `getPermissionsForRole`

**Files:**
- Modify: `src/lib/actions/permission.ts:1-24`

**Step 1: Add requireAuth import and call**

In `src/lib/actions/permission.ts`, add `requireAuth` import from utils and call it at the top of `getPermissionsForRole`:

```typescript
"use server";

import { d1 } from "@/lib/api/d1-client";
import { auth } from "@/lib/auth";
import { getCachedPermissionsForRole } from "@/lib/cache";
import { requireAuth } from "@/lib/actions/utils";

/**
 * Get all permission strings for a given role.
 * Returns array like ["articles:create", "articles:approve", "dashboard:read"]
 */
export async function getPermissionsForRole(
  roleId: number,
): Promise<string[]> {
  await requireAuth();
  const result = await d1.query<{ permission_string: string }>(
    `SELECT f.name || ':' || p.name AS permission_string
     FROM role_permission rp
     JOIN feature_permission fp ON rp.feature_permission_id = fp.feature_permission_id
     JOIN feature f ON fp.feature_id = f.feature_id
     JOIN permission p ON fp.permission_id = p.permission_id
     WHERE rp.role_id = ?`,
    [roleId],
  );
  return result.results.map((r) => r.permission_string);
}
```

Leave `fetchMyPermissions` unchanged (it already calls `auth()` itself).

**Step 2: Verify the dev server compiles without errors**

Run: Check dev server logs for compilation errors on the permission.ts file.

**Step 3: Commit**

```bash
git add src/lib/actions/permission.ts
git commit -m "security: add auth check to getPermissionsForRole server action"
```

---

### Task 2: Fix `getFirstAllowedRoute` Fallback

**Files:**
- Modify: `src/lib/auth.ts:121-129`

**Step 1: Change fallback from `/dashboard/overview` to `/login`**

In `src/lib/auth.ts`, change line 128:

```typescript
/** Return the first route the user has permission to view, or /login as fallback. */
function getFirstAllowedRoute(permissions: string[]): string {
  for (const [route, perm] of LANDING_PRIORITY) {
    if (permissions.includes(perm)) {
      return route;
    }
  }
  return "/login";
}
```

Only two things change:
1. JSDoc comment: `"/dashboard/overview"` → `"/login"`
2. Return value: `"/dashboard/overview"` → `"/login"`

**Step 2: Verify the dev server compiles without errors**

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "security: redirect to /login when user has no permissions"
```

---

### Task 3: Normalize Login Error Messages

**Files:**
- Modify: `src/lib/actions/auth-actions.ts:60-62`

**Step 1: Replace email format error message**

In `src/lib/actions/auth-actions.ts`, change line 61:

Before:
```typescript
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Please enter a valid email address." };
  }
```

After:
```typescript
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Invalid email or password." };
  }
```

**Step 2: Verify the dev server compiles without errors**

**Step 3: Commit**

```bash
git add src/lib/actions/auth-actions.ts
git commit -m "security: normalize login error messages to prevent enumeration"
```

---

### Task 4: Create Audit Log Helper

**Files:**
- Create: `src/lib/actions/audit.ts`

**Step 1: Create the audit log helper file**

Create `src/lib/actions/audit.ts`:

```typescript
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
```

**Step 2: Verify the dev server compiles without errors**

**Step 3: Commit**

```bash
git add src/lib/actions/audit.ts
git commit -m "feat: add audit logging helper for admin_activity_log"
```

---

### Task 5: Add Audit Logging to Auth Actions

**Files:**
- Modify: `src/lib/actions/auth-actions.ts`

**Step 1: Add audit log calls to loginAction and logoutAction**

In `src/lib/actions/auth-actions.ts`, add imports and audit calls:

```typescript
"use server";

import { signIn, signOut, isRateLimited, AccountDeactivatedError } from "@/lib/auth";
import { AuthError } from "next-auth";
import { auditLog, getClientIp } from "@/lib/actions/audit";
import { auth } from "@/lib/auth";

export interface LoginState {
  error?: string;
  success?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    return data.success === true;
  } catch {
    // In development, allow login if Turnstile endpoint is unreachable
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[auth] Turnstile verification failed (network), skipping in dev mode",
      );
      return true;
    }
    return false;
  }
}

export async function loginAction(
  _prevState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  const turnstileToken = formData.get("cf-turnstile-response") as string | null;
  const ip = await getClientIp();

  // Verify Turnstile token first
  if (!turnstileToken || !(await verifyTurnstile(turnstileToken))) {
    return { error: "Security verification failed. Please try again." };
  }

  // Server-side input validation
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { error: "Invalid email or password." };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: "Invalid email or password." };
  }

  if (isRateLimited(email)) {
    auditLog(null, `login_failed | email=${email} | reason=rate_limited | ip=${ip}`);
    return { error: "Too many attempts. Please try again later." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      auditLog(null, `login_failed | email=${email} | reason=account_deactivated | ip=${ip}`);
      return { error: "Your account has been deactivated. Please contact an administrator." };
    }
    if (error instanceof AuthError) {
      auditLog(null, `login_failed | email=${email} | reason=invalid_credentials | ip=${ip}`);
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    auditLog(null, `login_failed | email=${email} | reason=unknown_error | ip=${ip}`);
    return { error: "Something went wrong. Please try again." };
  }

  // Login succeeded — get session to find user ID for audit log
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  auditLog(userId, `login_success | ip=${ip}`);

  return { success: true };
}

export async function logoutAction() {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  await signOut({ redirect: false });
  auditLog(userId, "logout");
}
```

Key changes from original:
- Import `auditLog`, `getClientIp` from `audit.ts` and `auth` from `auth.ts`
- Get `ip` at the start of `loginAction`
- `auditLog` calls on: rate limited, deactivated, invalid credentials, unknown error, success
- `logoutAction` gets session before signOut, logs the event
- Error message on line 61 changed per Task 3 (normalize messages)
- `auditLog` calls are NOT awaited (fire-and-forget) — they return void and don't block

**Step 2: Verify the dev server compiles without errors**

**Step 3: Commit**

```bash
git add src/lib/actions/auth-actions.ts
git commit -m "security: add audit logging to login and logout actions"
```

---

### Task 6: Pusher Session Revocation — Server Side

**Files:**
- Modify: `src/lib/actions/admin.ts`

**Step 1: Add Pusher and audit imports, modify toggleAdminActive and updateAdmin**

Add imports at the top of `src/lib/actions/admin.ts`:

```typescript
import { triggerNotification } from "@/lib/pusher";
import { auditLog } from "@/lib/actions/audit";
```

Replace `toggleAdminActive` (lines 142-157) with:

```typescript
export async function toggleAdminActive(userId: number) {
  try {
    const actorId = await requirePermission("admin_users", "edit");

    // Read current state to know the result of the toggle
    const current = await d1.query<{ active: number }>(
      "SELECT active FROM admin_user WHERE user_id = ? LIMIT 1",
      [userId],
    );
    const wasActive = current.results[0]?.active === 1;

    await d1.query(
      "UPDATE admin_user SET active = 1 - active WHERE user_id = ?",
      [userId],
    );

    invalidateTag(CACHE_TAGS.ADMINS);

    // If user was active and is now deactivated, revoke their session
    if (wasActive) {
      triggerNotification(userId, "session-revoked", { reason: "account_deactivated" });
      auditLog(actorId, `admin_deactivated | target=${userId}`);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update admin status"),
    };
  }
}
```

After the `adminUserService.update(userId, updateData)` call in `updateAdmin` (after line 130), add session revocation for role changes:

```typescript
    await adminUserService.update(userId, updateData);

    // Notify user of role change so their session refreshes
    triggerNotification(userId, "session-revoked", { reason: "role_changed" });
    auditLog(actorId, `admin_role_changed | target=${userId} | role=${roleId}`);

    invalidateTag(CACHE_TAGS.ADMINS, CACHE_TAGS.PERMISSIONS);
```

Note: `updateAdmin` needs to capture the actor ID. Change `await requirePermission("admin_users", "edit");` to `const actorId = await requirePermission("admin_users", "edit");` (it already returns the user ID).

**Step 2: Verify the dev server compiles without errors**

**Step 3: Commit**

```bash
git add src/lib/actions/admin.ts
git commit -m "security: add Pusher session revocation and audit logging to admin actions"
```

---

### Task 7: Pusher Session Revocation — Client Side

**Files:**
- Modify: `src/components/providers/pusher-provider.tsx`

**Step 1: Add session-revoked listener to PusherProvider**

Replace the full file content of `src/components/providers/pusher-provider.tsx`:

```typescript
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useSession, signOut } from "next-auth/react";
import PusherClient from "pusher-js";

interface PusherContextValue {
  /** Subscribe to an event on the user's private channel */
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
}

const PusherContext = createContext<PusherContextValue>({
  subscribe: () => () => {},
});

export function PusherProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pusherRef = useRef<PusherClient | null>(null);
  const channelRef = useRef<ReturnType<PusherClient["subscribe"]> | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (status !== "authenticated" || !session?.user?.id || !key || !cluster) {
      return;
    }

    const pusher = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });

    const channel = pusher.subscribe(`private-user-${session.user.id}`);
    pusherRef.current = pusher;
    channelRef.current = channel;

    // Listen for session revocation (deactivation or role change)
    channel.bind("session-revoked", async () => {
      await signOut({ redirect: false });
      window.location.href = "/login";
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${session.user.id}`);
      pusher.disconnect();
      pusherRef.current = null;
      channelRef.current = null;
    };
  }, [status, session?.user?.id]);

  const subscribe = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      const channel = channelRef.current;
      if (!channel) return () => {};
      channel.bind(event, callback);
      return () => channel.unbind(event, callback);
    },
    [],
  );

  return (
    <PusherContext value={{ subscribe }}>
      {children}
    </PusherContext>
  );
}

export function usePusher() {
  return useContext(PusherContext);
}
```

Key change: Added `signOut` import from `next-auth/react` and the `channel.bind("session-revoked", ...)` handler inside the useEffect, before the cleanup function.

**Step 2: Verify the dev server compiles without errors**

**Step 3: Commit**

```bash
git add src/components/providers/pusher-provider.tsx
git commit -m "security: add client-side session-revoked Pusher listener"
```

---

### Task 8: Add Audit Logging to Role Actions

**Files:**
- Modify: `src/lib/actions/role.ts`

**Step 1: Add audit import and log calls**

Add import at the top of `src/lib/actions/role.ts`:

```typescript
import { auditLog } from "@/lib/actions/audit";
```

In `updateRole` (after line 167, before `return { success: true }`), add:

```typescript
    auditLog(grantedBy, `role_modified | role=${roleId}`);
    invalidateTag(CACHE_TAGS.ROLES, CACHE_TAGS.PERMISSIONS);
    return { success: true };
```

In `createRole` (after line 133, before `return { success: true }`), add:

```typescript
    auditLog(created_by, `role_created | name=${name.trim()}`);
    invalidateTag(CACHE_TAGS.ROLES, CACHE_TAGS.PERMISSIONS);
    return { success: true };
```

In `deleteRole` (after line 184, before `return { success: true }`), add:

```typescript
    const actorId = await requirePermission("roles", "delete");
```

Wait — `deleteRole` already calls `requirePermission` but doesn't capture the return. Change:

```typescript
export async function deleteRole(roleId: number) {
  try {
    const actorId = await requirePermission("roles", "delete");
    if (roleId === SUPER_ADMIN_ROLE_ID) {
      return { success: false, error: "The Super Admin role cannot be deleted" };
    }

    await roleService.delete(roleId);
    auditLog(actorId, `role_deleted | role=${roleId}`);
    invalidateTag(CACHE_TAGS.ROLES, CACHE_TAGS.PERMISSIONS);
    return { success: true };
```

**Step 2: Verify the dev server compiles without errors**

**Step 3: Commit**

```bash
git add src/lib/actions/role.ts
git commit -m "security: add audit logging to role CRUD actions"
```

---

### Task 9: Final Verification

**Step 1: Check dev server for any compilation errors**

Review server logs for TypeScript errors across all modified files.

**Step 2: Manual smoke test checklist**

Verify these scenarios work (if env vars are configured):
- [ ] Login page renders and accepts credentials
- [ ] Login error messages show generic "Invalid email or password." for bad email format
- [ ] Logged-in user can navigate normally
- [ ] Admin deactivation triggers Pusher event (check server logs)
- [ ] Role update triggers Pusher event
- [ ] `admin_activity_log` table receives entries for login/logout events

**Step 3: Final commit with all files**

If any files were missed in prior commits:

```bash
git add -A
git status
git commit -m "security: auth security overhaul - all fixes applied"
```
