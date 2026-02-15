"use server";

import { roleService } from "@/lib/services/role";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import type { RoleWithPermissionCount, FeaturePermission } from "@/types/role";

// ─── Data Fetching Helpers ──────────────────────────────────────────────────

/** Get all roles with their permission counts */
export async function getRolesWithPermissionCount(): Promise<
  RoleWithPermissionCount[]
> {
  const result = await d1.query<RoleWithPermissionCount>(
    `SELECT r.role_id, r.name, r.description, r.created_by, r.created_at,
            COUNT(rp.feature_permission_id) as permission_count
     FROM role r
     LEFT JOIN role_permission rp ON r.role_id = rp.role_id
     GROUP BY r.role_id
     ORDER BY r.created_at ASC`,
  );
  return result.results;
}

/** Get all feature_permission rows with feature and permission names */
export async function getAllFeaturePermissions(): Promise<FeaturePermission[]> {
  const result = await d1.query<FeaturePermission>(
    `SELECT fp.feature_permission_id, fp.feature_id, fp.permission_id,
            f.name as feature_name, p.name as permission_name
     FROM feature_permission fp
     JOIN feature f ON fp.feature_id = f.feature_id
     JOIN permission p ON fp.permission_id = p.permission_id
     ORDER BY f.name, p.name`,
  );
  return result.results;
}

/** Get the feature_permission_ids assigned to a role */
export async function getRolePermissionIds(
  roleId: number,
): Promise<number[]> {
  const result = await d1.query<{ feature_permission_id: number }>(
    "SELECT feature_permission_id FROM role_permission WHERE role_id = ?",
    [roleId],
  );
  return result.results.map((r) => r.feature_permission_id);
}

// ─── Role Permission Sync ───────────────────────────────────────────────────

/** Sync role_permission junction table (diff-based) */
async function syncRolePermissions(
  roleId: number,
  featurePermissionIds: number[],
  grantedBy: number | null,
) {
  const existing = await getRolePermissionIds(roleId);

  const toAdd = featurePermissionIds.filter((id) => !existing.includes(id));
  const toRemove = existing.filter((id) => !featurePermissionIds.includes(id));

  for (const fpId of toAdd) {
    await d1.query(
      "INSERT INTO role_permission (role_id, feature_permission_id, granted_by) VALUES (?, ?, ?)",
      [roleId, fpId, grantedBy],
    );
  }

  if (toRemove.length > 0) {
    const placeholders = toRemove.map(() => "?").join(",");
    await d1.query(
      `DELETE FROM role_permission WHERE role_id = ? AND feature_permission_id IN (${placeholders})`,
      [roleId, ...toRemove],
    );
  }
}

// ─── Role CRUD Actions ──────────────────────────────────────────────────────

export async function createRole(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const permissionIdsRaw = formData.get("permissionIds") as string;

  if (!name?.trim()) {
    return { success: false, error: "Role name is required" };
  }

  try {
    const created_by = await getCurrentUserId();

    await roleService.create({
      name: name.trim(),
      description: description?.trim() || null,
      created_by,
    });

    const permissionIds = permissionIdsRaw
      ? (JSON.parse(permissionIdsRaw) as number[])
      : [];

    if (permissionIds.length > 0) {
      const roleResult = await d1.query<{ role_id: number }>(
        "SELECT role_id FROM role WHERE name = ? ORDER BY created_at DESC LIMIT 1",
        [name.trim()],
      );
      const roleId = roleResult.results[0]?.role_id;
      if (roleId) {
        await syncRolePermissions(roleId, permissionIds, created_by);
      }
    }

    invalidateTag(CACHE_TAGS.ROLES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create role"),
    };
  }
}

export async function updateRole(roleId: number, formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const permissionIdsRaw = formData.get("permissionIds") as string;

  if (!name?.trim()) {
    return { success: false, error: "Role name is required" };
  }

  try {
    await roleService.update(roleId, {
      name: name.trim(),
      description: description?.trim() || null,
    });

    if (permissionIdsRaw) {
      const permissionIds = JSON.parse(permissionIdsRaw) as number[];
      const grantedBy = await getCurrentUserId();
      await syncRolePermissions(roleId, permissionIds, grantedBy);
    }

    invalidateTag(CACHE_TAGS.ROLES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update role"),
    };
  }
}

export async function deleteRole(roleId: number) {
  try {
    const role = await roleService.getById(roleId);
    if (role?.name === "Super Admin") {
      return { success: false, error: "The Super Admin role cannot be deleted" };
    }

    await roleService.delete(roleId);
    invalidateTag(CACHE_TAGS.ROLES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete role"),
    };
  }
}

export async function deleteRoles(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const role = await roleService.getById(id);
      if (role?.name === "Super Admin") {
        throw new Error("The Super Admin role cannot be deleted");
      }
      return roleService.delete(id);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => getErrorMessage(r.reason, "Failed to delete role"));
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.ROLES);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

// ─── Linked Count Helpers ───────────────────────────────────────────────────

/** Count admin_user rows assigned to each role */
export async function getAdminCountByRole(
  roleIds: number[],
): Promise<Record<number, number>> {
  if (roleIds.length === 0) return {};

  const placeholders = roleIds.map(() => "?").join(",");
  const result = await d1.query<{ role_id: number; count: number }>(
    `SELECT role_id, COUNT(*) as count FROM admin_user WHERE role_id IN (${placeholders}) GROUP BY role_id`,
    roleIds,
  );

  const countMap: Record<number, number> = {};
  for (const id of roleIds) {
    countMap[id] = 0;
  }
  for (const row of result.results) {
    countMap[row.role_id] = row.count;
  }
  return countMap;
}
