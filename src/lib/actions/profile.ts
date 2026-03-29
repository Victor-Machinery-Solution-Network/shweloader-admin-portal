"use server";

import bcrypt from "bcryptjs";
import { d1 } from "@/lib/api/d1-client";
import { uploadToR2, deleteFromR2, isR2Key } from "@/lib/api/r2-client";
import { requireAuth } from "@/lib/actions/utils";
import { auditLog } from "@/lib/actions/audit";

const BCRYPT_ROUNDS = 12;

// ─── Update Username ────────────────────────────────────────────────────────

export async function updateUsername(username: string) {
  const userId = await requireAuth();

  if (!username?.trim()) {
    return { success: false, error: "Username is required" };
  }

  if (username.trim().length < 2) {
    return { success: false, error: "Username must be at least 2 characters" };
  }

  try {
    await d1.query(
      "UPDATE admin_user SET username = ?, updated_at = datetime('now') WHERE user_id = ?",
      [username.trim(), userId],
    );
    auditLog(userId, `profile_update | field=username`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to update username";
    if (msg.includes("UNIQUE constraint failed")) {
      return { success: false, error: "That username is already taken" };
    }
    return { success: false, error: "Failed to update username" };
  }
}

// ─── Change Password ────────────────────────────────────────────────────────

export async function changePassword(currentPassword: string, newPassword: string) {
  const userId = await requireAuth();

  if (!currentPassword || !newPassword) {
    return { success: false, error: "Both passwords are required" };
  }

  if (newPassword.length < 8) {
    return { success: false, error: "New password must be at least 8 characters" };
  }

  try {
    // Verify current password
    const { results } = await d1.query<{ password_hash: string }>(
      "SELECT password_hash FROM admin_user WHERE user_id = ? LIMIT 1",
      [userId],
    );
    const user = results[0];
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Hash and save new password
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await d1.query(
      "UPDATE admin_user SET password_hash = ?, updated_at = datetime('now') WHERE user_id = ?",
      [hash, userId],
    );
    auditLog(userId, `profile_update | field=password`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to change password" };
  }
}

// ─── Upload Avatar ──────────────────────────────────────────────────────────

export async function uploadAvatar(formData: FormData) {
  const userId = await requireAuth();
  const file = formData.get("avatar") as File | null;

  if (!file || file.size === 0) {
    return { success: false, error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, WebP, and GIF images are allowed" };
  }

  try {
    // Delete old avatar if exists
    const { results } = await d1.query<{ avatar_url: string | null }>(
      "SELECT avatar_url FROM admin_user WHERE user_id = ? LIMIT 1",
      [userId],
    );
    const oldKey = results[0]?.avatar_url;
    if (oldKey && isR2Key(oldKey)) {
      deleteFromR2(oldKey).catch(() => {});
    }

    // Convert to webp for smaller storage
    let uploadFile: File | Blob = file;
    let ext = file.name.split(".").pop() ?? "webp";

    if (file.type.startsWith("image/") && file.type !== "image/webp") {
      try {
        const sharp = (await import("sharp")).default;
        const buffer = Buffer.from(await file.arrayBuffer());
        const webpBuffer = await sharp(buffer, {
          limitInputPixels: 100_000_000,
          sequentialRead: true,
        })
          .resize(512, 512, { fit: "cover" })
          .webp({ quality: 80 })
          .toBuffer();

        uploadFile = new File(
          [new Uint8Array(webpBuffer)],
          file.name.replace(/\.[^.]+$/, ".webp"),
          { type: "image/webp" },
        );
        ext = "webp";
      } catch {
        // Fallback to original file
      }
    }

    const filename = `admin-avatar-${userId}-${Date.now()}.${ext}`;
    const result = await uploadToR2(uploadFile, "products/photos/", filename);

    // Save R2 key to DB
    await d1.query(
      "UPDATE admin_user SET avatar_url = ?, updated_at = datetime('now') WHERE user_id = ?",
      [result.key, userId],
    );

    auditLog(userId, `profile_update | field=avatar`);
    return { success: true, key: result.key };
  } catch (error) {
    console.error("[profile:uploadAvatar] error:", error);
    return { success: false, error: "Failed to upload avatar" };
  }
}

// ─── Remove Avatar ──────────────────────────────────────────────────────────

export async function removeAvatar() {
  const userId = await requireAuth();

  try {
    const { results } = await d1.query<{ avatar_url: string | null }>(
      "SELECT avatar_url FROM admin_user WHERE user_id = ? LIMIT 1",
      [userId],
    );
    const oldKey = results[0]?.avatar_url;
    if (oldKey && isR2Key(oldKey)) {
      deleteFromR2(oldKey).catch(() => {});
    }

    await d1.query(
      "UPDATE admin_user SET avatar_url = NULL, updated_at = datetime('now') WHERE user_id = ?",
      [userId],
    );

    auditLog(userId, `profile_update | field=avatar_removed`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove avatar" };
  }
}

// ─── Get Profile ────────────────────────────────────────────────────────────

export async function getProfile() {
  const userId = await requireAuth();

  const { results } = await d1.query<{
    user_id: number;
    username: string;
    email: string;
    avatar_url: string | null;
    role_id: number | null;
    created_at: string;
  }>(
    `SELECT a.user_id, a.username, a.email, a.avatar_url, a.role_id, a.created_at
     FROM admin_user a
     WHERE a.user_id = ? LIMIT 1`,
    [userId],
  );

  const user = results[0];
  if (!user) throw new Error("User not found");

  // Get role name
  let roleName: string | null = null;
  if (user.role_id) {
    const roleResult = await d1.query<{ name: string }>(
      "SELECT name FROM role WHERE role_id = ? LIMIT 1",
      [user.role_id],
    );
    roleName = roleResult.results[0]?.name ?? null;
  }

  return {
    userId: user.user_id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatar_url,
    roleName,
    createdAt: user.created_at,
  };
}
