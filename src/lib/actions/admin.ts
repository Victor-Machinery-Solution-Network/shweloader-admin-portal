"use server";

import bcrypt from "bcryptjs";
import { adminUserService } from "@/lib/services/admin";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS, PRIMARY_ADMIN_ID, SUPER_ADMIN_ROLE_ID } from "@/lib/constants";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import type { AdminWithRole } from "@/types/admin";
import type { Role } from "@/types/role";
import { triggerNotification } from "@/lib/pusher";
import { auditLog } from "@/lib/actions/audit";
import { saveTrashMetadata } from "@/lib/actions/trash";

const BCRYPT_ROUNDS = 12;

// ─── Data Fetching Helpers ──────────────────────────────────────────────────

/** Get all admins with their role names (excludes password_hash) */
export async function getAdminsWithRoles(): Promise<AdminWithRole[]> {
  const result = await d1.query<AdminWithRole>(
    `SELECT a.user_id, a.username, a.email, a.role_id, a.active, a.created_at,
            r.name as role_name
     FROM admin_user a
     LEFT JOIN role r ON a.role_id = r.role_id
     WHERE a.deleted_at IS NULL
     ORDER BY CASE WHEN a.user_id = ${PRIMARY_ADMIN_ID} THEN 0 ELSE 1 END, a.created_at DESC`,
  );
  return result.results;
}

/** Get all roles except Super Admin (for role selection dropdown) */
export async function getAssignableRoles(): Promise<Role[]> {
  const result = await d1.query<Role>(
    `SELECT role_id, name, description, created_by, created_at
     FROM role
     WHERE role_id != ? AND deleted_at IS NULL
     ORDER BY name ASC`,
    [SUPER_ADMIN_ROLE_ID],
  );
  return result.results;
}

// ─── CRUD Actions ───────────────────────────────────────────────────────────

export async function createAdmin(formData: FormData) {
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const roleId = formData.get("roleId") as string;

  if (!username?.trim()) {
    return { success: false, error: "Username is required" };
  }
  if (!email?.trim()) {
    return { success: false, error: "Email is required" };
  }
  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }
  if (!roleId) {
    return { success: false, error: "Role is required" };
  }

  try {
    const actorId = await requirePermission("admin_users", "create");

    // Prevent assigning the Super Admin role via form manipulation
    if (Number(roleId) === SUPER_ADMIN_ROLE_ID) {
      return { success: false, error: "Cannot assign the Super Admin role" };
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await adminUserService.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      role_id: Number(roleId),
      active: 1,
    });

    invalidateTag(CACHE_TAGS.ADMINS);
    auditLog(actorId, "created admin | username=" + username.trim());
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create admin"),
    };
  }
}

export async function updateAdmin(userId: number, formData: FormData) {
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const roleId = formData.get("roleId") as string;

  if (!username?.trim()) {
    return { success: false, error: "Username is required" };
  }
  if (!email?.trim()) {
    return { success: false, error: "Email is required" };
  }
  if (!roleId) {
    return { success: false, error: "Role is required" };
  }

  try {
    const actorId = await requirePermission("admin_users", "edit");

    // Prevent assigning the Super Admin role via form manipulation
    if (Number(roleId) === SUPER_ADMIN_ROLE_ID) {
      return { success: false, error: "Cannot assign the Super Admin role" };
    }

    const updateData: Record<string, string | number | null> = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      role_id: Number(roleId),
    };

    // Only update password if provided
    if (password && password.length > 0) {
      if (password.length < 8) {
        return {
          success: false,
          error: "Password must be at least 8 characters",
        };
      }
      updateData.password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    await adminUserService.update(userId, updateData);

    // Notify user of role change so their session refreshes
    triggerNotification(userId, "session-revoked", { reason: "role_changed" });
    auditLog(actorId, `admin_role_changed | target=${userId} | role=${roleId}`);

    invalidateTag(CACHE_TAGS.ADMINS, CACHE_TAGS.PERMISSIONS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update admin"),
    };
  }
}

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

export async function deleteAdmin(userId: number) {
  try {
    const deletedBy = await requirePermission("admin_users", "delete");
    if (userId === PRIMARY_ADMIN_ID) {
      return { success: false, error: "Cannot delete the primary admin" };
    }
    await adminUserService.softDelete(userId, deletedBy);
    await saveTrashMetadata("admin_user", userId, deletedBy);
    invalidateTag(CACHE_TAGS.ADMINS);
    auditLog(deletedBy, "deleted admin | id=" + userId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete admin"),
    };
  }
}

export async function deleteAdmins(ids: number[]) {
  const deletedBy = await requirePermission("admin_users", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      if (id === PRIMARY_ADMIN_ID) throw new Error("Cannot delete the primary admin");
      await adminUserService.softDelete(id, deletedBy);
      await saveTrashMetadata("admin_user", id, deletedBy);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete admin ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.ADMINS);
  auditLog(deletedBy, "bulk deleted admins | count=" + deleted);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
