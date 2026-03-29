import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { d1 } from "@/lib/api/d1-client";
import type { AdminUser } from "@/types";

// Custom error for deactivated accounts
export class AccountDeactivatedError extends CredentialsSignin {
  code = "account_deactivated";
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, sufficient for single-instance admin portal)
// ---------------------------------------------------------------------------
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function isRateLimited(email: string): boolean {
  const record = loginAttempts.get(email);
  if (!record) return false;

  // Reset if lockout window has passed
  if (Date.now() - record.lastAttempt > LOCKOUT_DURATION_MS) {
    loginAttempts.delete(email);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(email: string): void {
  const record = loginAttempts.get(email);
  if (record) {
    record.count += 1;
    record.lastAttempt = Date.now();
  } else {
    loginAttempts.set(email, { count: 1, lastAttempt: Date.now() });
  }
}

function clearAttempts(email: string): void {
  loginAttempts.delete(email);
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// ---------------------------------------------------------------------------
// Middleware route → feature mapping
// Checked in the `authorized` callback (runs as Next.js middleware).
// Routes not listed here are accessible to any authenticated user.
// ---------------------------------------------------------------------------
const ROUTE_FEATURE_MAP: [prefix: string, feature: string][] = [
  // Dashboard — /dashboard itself is handled specially in the authorized
  // callback (redirects to getFirstAllowedRoute), so no loop is possible.
  ["/dashboard/overview", "dashboard"],
  ["/dashboard/analytics", "analytics"],
  // Catalog
  ["/brands", "brands"],
  ["/locations", "locations"],
  ["/equipment/main-categories", "equipment_main_categories"],
  ["/equipment/sub-categories", "equipment_sub_categories"],
  ["/equipment/models", "equipment_models"],
  ["/attachments/categories", "attachment_categories"],
  ["/attachments/models", "attachment_models"],
  // Marketplace
  ["/listings/new", "sale_listings"], // also accepts rent_listings (OR logic below)
  ["/listings/for-sale", "sale_listings"],
  ["/listings/for-rent", "rent_listings"],
  ["/listing-templates", "listing_templates"],
  ["/chat", "chat"],
  // Users
  ["/users", "users"],
  ["/partners", "partners"],
  // Content
  ["/articles/posts", "articles"],
  ["/articles/categories", "article_categories"],
  ["/carousel-images", "carousels"],
  ["/announcement-bar", "announcements"],
  // Settings
  ["/admins", "admin_users"],
  ["/roles-permissions", "roles"],
  ["/settings", "app_settings"],
  ["/activity-logs", "admin_users"],
];

/**
 * Priority-ordered landing pages. When the user hits /dashboard, the middleware
 * redirects them to the first route they have :read permission for.
 * Order mirrors the sidebar so the experience feels natural.
 */
const LANDING_PRIORITY: [route: string, permission: string][] = [
  ["/dashboard/overview", "dashboard:read"],
  ["/dashboard/analytics", "analytics:read"],
  // Catalog
  ["/equipment/main-categories", "equipment_main_categories:read"],
  ["/brands", "brands:read"],
  ["/locations", "locations:read"],
  // Marketplace
  ["/listings/for-sale", "sale_listings:read"],
  ["/listings/for-rent", "rent_listings:read"],
  ["/chat", "chat:read"],
  // Users
  ["/users", "users:read"],
  ["/partners", "partners:read"],
  // Content
  ["/articles/posts", "articles:read"],
  ["/carousel-images", "carousels:read"],
  ["/announcement-bar", "announcements:read"],
  // Settings
  ["/admins", "admin_users:read"],
  ["/roles-permissions", "roles:read"],
  ["/listing-templates", "listing_templates:read"],
  ["/settings", "app_settings:read"],
];

/** Return the first route the user has permission to view, or /login as fallback. */
function getFirstAllowedRoute(permissions: string[]): string {
  for (const [route, perm] of LANDING_PRIORITY) {
    if (permissions.includes(perm)) {
      return route;
    }
  }
  return "/login";
}

/** Check if the user's permissions include access for a given route. */
function isRouteAllowed(pathname: string, permissions: string[]): boolean {
  for (const [prefix, feature] of ROUTE_FEATURE_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      // /listings/new accepts either sale_listings OR rent_listings
      if (prefix === "/listings/new") {
        return (
          permissions.includes("sale_listings:create") ||
          permissions.includes("rent_listings:create")
        );
      }
      return permissions.includes(`${feature}:read`);
    }
  }
  // No mapping = always accessible (e.g. /dashboard, /notifications, /bulk-upload)
  return true;
}

// ---------------------------------------------------------------------------
// Auth.js v5 configuration
// ---------------------------------------------------------------------------
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        // Input validation (rate limiting is handled in loginAction before signIn is called)
        if (!email || !password) return null;
        if (!EMAIL_REGEX.test(email)) return null;
        if (password.length < MIN_PASSWORD_LENGTH) return null;

        try {
          // Query admin_user by email via D1 REST API
          const { results } = await d1.query<AdminUser>(
            "SELECT * FROM admin_user WHERE email = ? LIMIT 1",
            [email],
          );

          const user = results[0];
          if (!user) {
            recordFailedAttempt(email);
            return null;
          }

          // Check if account is deactivated
          if (!user.active) {
            recordFailedAttempt(email);
            throw new AccountDeactivatedError();
          }

          // Verify password with bcrypt
          const isValid = await bcrypt.compare(password, user.password_hash);
          if (!isValid) {
            recordFailedAttempt(email);
            return null;
          }

          // Success — clear failed attempts
          clearAttempts(email);

          // Fetch permissions for this user's role (stored in JWT for middleware + client)
          let permissions: string[] = [];
          if (user.role_id) {
            const permResult = await d1.query<{ perm: string }>(
              `SELECT f.name || ':' || p.name AS perm
               FROM role_permission rp
               JOIN feature_permission fp ON rp.feature_permission_id = fp.feature_permission_id
               JOIN feature f ON fp.feature_id = f.feature_id
               JOIN permission p ON fp.permission_id = p.permission_id
               WHERE rp.role_id = ?`,
              [user.role_id],
            );
            permissions = permResult.results.map((r) => r.perm);
          }

          return {
            id: String(user.user_id),
            name: user.username,
            email: user.email,
            role_id: user.role_id,
            permissions,
            avatar_url: user.avatar_url ?? null,
          };
        } catch (error) {
          // Re-throw AccountDeactivatedError so auth-actions.ts can
          // show the specific "account deactivated" message to the user.
          if (error instanceof AccountDeactivatedError) {
            throw error;
          }
          console.error("[auth:authorize] error:", error);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8, // 8 hours
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign-in, persist custom fields into the JWT
      if (user) {
        token.user_id = user.id;
        token.username = user.name;
        token.role_id = (
          user as AdminUser & { role_id: number | null }
        ).role_id;
        token.permissions = (user as { permissions?: string[] }).permissions ?? [];
        token.avatar_url = (user as { avatar_url?: string | null }).avatar_url ?? null;
        token.refreshed_at = Date.now();
      }

      // Force immediate refresh when session.update() is called (e.g. after profile changes)
      if (trigger === "update") {
        console.log("[auth:jwt] trigger=update, forcing refresh");
        token.refreshed_at = 0;
      }

      // Periodic refresh: re-check active status, role_id, and permissions
      // every 5 minutes so that role changes / deactivation take effect
      // without requiring the user to re-login.
      const REFRESH_MS = 5 * 60 * 1000;
      const lastRefresh = (token.refreshed_at as number) ?? 0;
      if (token.user_id && Date.now() - lastRefresh > REFRESH_MS) {
        try {
          const dbUser = await d1.query<{
            active: number;
            role_id: number | null;
            username: string;
            avatar_url: string | null;
          }>(
            "SELECT active, role_id, username, avatar_url FROM admin_user WHERE user_id = ? LIMIT 1",
            [token.user_id as string],
          );
          const row = dbUser.results[0];

          if (!row || !row.active) {
            // User deleted or deactivated — clear identity to force logout
            token.user_id = undefined;
            token.username = undefined;
            token.role_id = null;
            token.permissions = [];
            token.avatar_url = null;
            return token;
          }

          // Sync profile fields in case they were changed
          token.role_id = row.role_id;
          token.username = row.username;
          token.avatar_url = row.avatar_url ?? null;
          console.log("[auth:jwt] refreshed from DB, avatar_url:", row.avatar_url);

          // Re-fetch permissions for the (possibly new) role
          if (row.role_id) {
            const permResult = await d1.query<{ perm: string }>(
              `SELECT f.name || ':' || p.name AS perm
               FROM role_permission rp
               JOIN feature_permission fp ON rp.feature_permission_id = fp.feature_permission_id
               JOIN feature f ON fp.feature_id = f.feature_id
               JOIN permission p ON fp.permission_id = p.permission_id
               WHERE rp.role_id = ?`,
              [row.role_id],
            );
            token.permissions = permResult.results.map((r) => r.perm);
          } else {
            token.permissions = [];
          }
        } catch (error) {
          // On refresh failure, keep existing token data — don't break the session
          console.error("[auth:jwt] periodic refresh failed:", error);
        }
        token.refreshed_at = Date.now();
      }

      return token;
    },

    async session({ session, token }) {
      // Expose custom fields on session.user
      if (session.user) {
        session.user.id = token.user_id as string;
        session.user.name = token.username as string;
        session.user.role_id = token.role_id as number | null;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.avatar_url = (token.avatar_url as string | null) ?? null;
      }
      return session;
    },

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isOnLogin = pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          const landing = getFirstAllowedRoute(auth?.user?.permissions ?? []);
          return Response.redirect(new URL(landing, nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false;

      // Route-level permission check (permissions stored in JWT)
      const permissions = auth?.user?.permissions ?? [];

      // /dashboard is a landing route — redirect to the first allowed page
      if (pathname === "/dashboard" || pathname === "/dashboard/") {
        return Response.redirect(
          new URL(getFirstAllowedRoute(permissions), nextUrl),
        );
      }

      if (!isRouteAllowed(pathname, permissions)) {
        return Response.redirect(
          new URL(getFirstAllowedRoute(permissions), nextUrl),
        );
      }

      return true;
    },
  },
});
