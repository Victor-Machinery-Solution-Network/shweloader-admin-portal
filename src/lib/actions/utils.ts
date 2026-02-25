import { auth } from "@/lib/auth";
import { getCachedPermissionsForRole } from "@/lib/cache";

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

const MAX_BULK_SIZE = 100;

/**
 * Require authentication. Throws if not authenticated.
 * Use at the top of every mutating server action for defense-in-depth
 * (Auth.js middleware is the primary gate, this is the fallback).
 */
export async function requireAuth(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return Number(session.user.id);
}

/**
 * Require authentication + a specific feature permission.
 * Throws "Unauthorized" if not logged in, "Forbidden" if missing permission.
 * Returns the authenticated user's ID (drop-in replacement for requireAuth).
 *
 * @param feature  - DB feature name, e.g. "articles", "brands"
 * @param permission - DB permission name, e.g. "create", "read", "edit", "delete", "approve"
 */
export async function requirePermission(
  feature: string,
  permission: string,
): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const roleId = session.user.role_id;
  if (!roleId) {
    throw new Error("Forbidden: no role assigned");
  }

  const permissions = await getCachedPermissionsForRole(roleId);
  const required = `${feature}:${permission}`;
  if (!permissions.includes(required)) {
    throw new Error(`Forbidden: missing permission "${required}"`);
  }

  return Number(session.user.id);
}

/**
 * Validate and cap bulk operation array size.
 * Prevents DoS via unbounded arrays of IDs.
 */
export function assertBulkLimit(ids: unknown[]): void {
  if (ids.length > MAX_BULK_SIZE) {
    throw new Error(`Bulk operations limited to ${MAX_BULK_SIZE} items`);
  }
}
