"use server";

import bcrypt from "bcryptjs";
import { adminUserService } from "@/lib/services/admin";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import type { AdminWithRole } from "@/types/admin";
import type { Role } from "@/types/role";

const BCRYPT_ROUNDS = 12;

// ─── Data Fetching Helpers ──────────────────────────────────────────────────

/** Get all admins with their role names (excludes password_hash) */
export async function getAdminsWithRoles(): Promise<AdminWithRole[]> {
  const result = await d1.query<AdminWithRole>(
    `SELECT a.user_id, a.username, a.email, a.role_id, a.active, a.created_at,
            r.name as role_name
     FROM admin_user a
     LEFT JOIN role r ON a.role_id = r.role_id
     ORDER BY a.created_at ASC`,
  );
  return result.results;
}

/** Get all roles except Super Admin (for role selection dropdown) */
export async function getAssignableRoles(): Promise<Role[]> {
  const result = await d1.query<Role>(
    `SELECT role_id, name, description, created_by, created_at
     FROM role
     WHERE name != 'Super Admin'
     ORDER BY name ASC`,
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
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await adminUserService.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      role_id: Number(roleId),
      active: 1,
    });

    invalidateTag(CACHE_TAGS.ADMINS);
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

    invalidateTag(CACHE_TAGS.ADMINS);
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
    await d1.query(
      "UPDATE admin_user SET active = 1 - active WHERE user_id = ?",
      [userId],
    );
    invalidateTag(CACHE_TAGS.ADMINS);
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
    // Guard: don't delete the seed admin (user_id = 1)
    if (userId === 1) {
      return { success: false, error: "Cannot delete the primary admin" };
    }
    await adminUserService.delete(userId);
    invalidateTag(CACHE_TAGS.ADMINS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete admin"),
    };
  }
}

export async function deleteAdmins(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map((id) => {
      if (id === 1) return Promise.reject(new Error("Cannot delete the primary admin"));
      return adminUserService.delete(id);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete admin ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.ADMINS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
