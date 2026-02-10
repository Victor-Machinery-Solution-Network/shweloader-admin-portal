import { auth } from "@/lib/auth";

/** Extract a user-friendly error message from D1/API errors */
export function getErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes("UNIQUE constraint failed")) {
    return "A record with that name already exists";
  }
  if (raw.includes("FOREIGN KEY constraint failed")) {
    return "Cannot delete — this record is referenced by other data";
  }
  return fallback;
}

/** Get current user ID from session */
export async function getCurrentUserId(): Promise<number | null> {
  const session = await auth();
  return session?.user?.id ? Number(session.user.id) : null;
}
