"use server";

import { d1 } from "@/lib/api/d1-client";
import { auth } from "@/lib/auth";
import { getCachedPermissionsForRole } from "@/lib/cache";

/**
 * Get all permission strings for a given role.
 * Returns array like ["articles:create", "articles:approve", "dashboard:read"]
 */
export async function getPermissionsForRole(
  roleId: number,
): Promise<string[]> {
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

/**
 * Server action callable from client to get current user's permissions.
 * Used by PermissionsProvider on mount.
 */
export async function fetchMyPermissions(): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.role_id) return [];
  return getCachedPermissionsForRole(session.user.role_id);
}
