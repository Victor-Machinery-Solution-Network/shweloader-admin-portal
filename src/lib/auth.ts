import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { d1 } from "@/lib/api/d1-client";
import type { AdminUser } from "@/types";

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
            "SELECT * FROM admin_user WHERE email = ? AND active = 1 LIMIT 1",
            [email],
          );

          const user = results[0];
          if (!user) {
            recordFailedAttempt(email);
            return null;
          }

          // Verify password with bcrypt
          const isValid = await bcrypt.compare(password, user.password_hash);
          if (!isValid) {
            recordFailedAttempt(email);
            return null;
          }

          // Success — clear failed attempts
          clearAttempts(email);

          return {
            id: String(user.user_id),
            name: user.username,
            email: user.email,
            role_id: user.role_id,
          };
        } catch (error) {
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
    async jwt({ token, user }) {
      // On initial sign-in, persist custom fields into the JWT
      if (user) {
        token.user_id = user.id;
        token.username = user.name;
        token.role_id = (
          user as AdminUser & { role_id: number | null }
        ).role_id;
      }
      return token;
    },

    async session({ session, token }) {
      // Expose custom fields on session.user
      if (session.user) {
        session.user.id = token.user_id as string;
        session.user.name = token.username as string;
        session.user.role_id = token.role_id as number | null;
      }
      return session;
    },

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
});
