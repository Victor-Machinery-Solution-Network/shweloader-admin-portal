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

  // Verify Turnstile token first (skip when explicitly disabled for dev/testing)
  const turnstileDisabled = process.env.NEXT_PUBLIC_DISABLE_TURNSTILE === "true";
  if (!turnstileDisabled && (!turnstileToken || !(await verifyTurnstile(turnstileToken)))) {
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
      switch (error.type) {
        case "CredentialsSignin":
          auditLog(null, `login_failed | email=${email} | reason=invalid_credentials | ip=${ip}`);
          return { error: "Invalid email or password." };
        default:
          auditLog(null, `login_failed | email=${email} | reason=unknown_error | ip=${ip}`);
          return { error: "Something went wrong. Please try again." };
      }
    }
    auditLog(null, `login_failed | email=${email} | reason=unknown_error | ip=${ip}`);
    return { error: "Something went wrong. Please try again." };
  }

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
