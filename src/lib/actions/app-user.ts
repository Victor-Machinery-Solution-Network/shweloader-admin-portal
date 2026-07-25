"use server";

import bcrypt from "bcryptjs";
import { appUserService, businessTypeService } from "@/lib/services/app-user";
import { partnerService } from "@/lib/services/partner";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";

const BCRYPT_ROUNDS = 12;
const PASSWORD_LENGTH = 12;
const PASSWORD_CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";

function generatePassword(): string {
  const bytes = new Uint8Array(PASSWORD_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARSET[b % PASSWORD_CHARSET.length]).join("");
}

function randomDigits(count: number): string {
  const bytes = new Uint8Array(count);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => String(b % 10)).join("");
}

/**
 * System-generated username (registration-simplification spec, 2026-07-25):
 * latinized full name + 4 random digits (e.g. "aungkyaw4821"). Burmese-script
 * names latinize to empty → fallback "user" + 8 digits ("user84213976").
 * Uniqueness is checked against ALL app_user rows (including soft-deleted —
 * the D1 unique index is global), retrying up to 5 times on collision.
 */
async function generateUsername(fullName: string): Promise<string> {
  const stem = fullName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
  const useFallbackStem = stem.length < 3;

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = useFallbackStem
      ? "user" + randomDigits(8)
      : stem + randomDigits(4);
    const existing = await d1.query<{ app_user_id: number }>(
      "SELECT app_user_id FROM app_user WHERE username = ? LIMIT 1",
      [candidate],
    );
    if (existing.results.length === 0) return candidate;
  }
  throw new Error("Could not generate a unique username — please try again");
}

// ─── Single-record fetch (for cross-feature consumers e.g. enquiries) ───────

import type { AppUser } from "@/types/app-user";

export async function getAppUserById(id: number): Promise<AppUser | null> {
  return appUserService.getById(id);
}

// ─── Create App User ──────────────────────────────────────────────────────────

export async function createAppUser(formData: FormData) {
  const fullName = formData.get("full_name") as string;
  const email = (formData.get("email") as string) || null;
  const phone = formData.get("phone") as string;
  const companyName = (formData.get("company_name") as string) || null;
  const businessTypeId = formData.get("business_type_id") as string;
  const businessTypeOther = (formData.get("business_type_other") as string) || null;
  const townshipId = formData.get("township_id") as string;
  const isApprovedPartner = formData.get("is_approved_partner") === "1";
  const partnerTypeId =
    isApprovedPartner && formData.get("partner_type_id")
      ? Number(formData.get("partner_type_id"))
      : null;

  if (!fullName?.trim()) {
    return { success: false, error: "Full name is required" };
  }
  if (!phone?.trim()) {
    return { success: false, error: "Phone number is required" };
  }
  if (!businessTypeId && !businessTypeOther?.trim()) {
    return { success: false, error: "Business type is required" };
  }
  if (!townshipId) {
    return { success: false, error: "Location is required" };
  }
  if (
    isApprovedPartner &&
    (partnerTypeId === null || !Number.isFinite(partnerTypeId) || partnerTypeId <= 0)
  ) {
    return {
      success: false,
      error: "Partner type is required for an approved partner",
    };
  }

  try {
    const actorId = await requirePermission("users", "create");

    // Resolve business type ID — create an unlisted type if "Other" was specified.
    // Reject malformed values: Number("") and Number("0") both yield 0, and
    // Number("abc") yields NaN — none of those are valid FKs.
    let resolvedBtId: number = 0;
    if (businessTypeId) {
      const parsed = Number(businessTypeId);
      if (Number.isFinite(parsed) && parsed > 0) resolvedBtId = parsed;
    }

    if (businessTypeOther?.trim()) {
      const otherName = businessTypeOther.trim();

      // Check if this name already exists (avoid duplicates)
      const existing = await d1.query<{ business_type_id: number }>(
        "SELECT business_type_id FROM business_type WHERE name = ? LIMIT 1",
        [otherName],
      );

      if (existing.results.length > 0) {
        resolvedBtId = existing.results[0].business_type_id;
      } else {
        // Create new unlisted business type
        const created = await businessTypeService.create({
          name: otherName,
          is_listed: 0,
          created_by: actorId,
        });
        resolvedBtId = created.business_type_id;
      }
    }

    const password = generatePassword();
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email?.trim().toLowerCase() || null;
    const trimmedPhone = phone.trim();
    const trimmedCompany = companyName?.trim() || null;

    // Username is system-owned — generated from the full name, never admin-entered.
    const generatedUsername = await generateUsername(trimmedFullName);

    // Use raw SQL with RETURNING to guarantee app_user_id is in the response
    // (the REST proxy's POST endpoint may not return custom PK columns)
    const userResult = await d1.query<{ app_user_id: number }>(
      `INSERT INTO app_user (username, full_name, email, password_hash, phone, company_name, business_type_id, township_id, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1) RETURNING app_user_id`,
      [generatedUsername, trimmedFullName, trimmedEmail, password_hash, trimmedPhone, trimmedCompany, resolvedBtId, Number(townshipId)],
    );
    const newUserId = userResult.results[0].app_user_id;

    // If partner switch is on, create an approved partner record
    if (isApprovedPartner) {
      const statusResult = await d1.query<{ id: number }>(
        "SELECT id FROM partner_status_type WHERE status_name = 'Approved' LIMIT 1",
        [],
      );
      const approvedStatusId = statusResult.results[0]?.id;

      if (approvedStatusId) {
        await partnerService.create({
          app_user_id: newUserId,
          partner_type_id: partnerTypeId,
          status_id: approvedStatusId,
          reviewed_at: new Date().toISOString(),
          reviewed_by: actorId,
        });
        invalidateTag(CACHE_TAGS.PARTNERS);
      }
    }

    invalidateTag(CACHE_TAGS.USERS);
    auditLog(actorId, "created app user | username=" + generatedUsername);
    return { success: true, password };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create user"),
    };
  }
}

// ─── Update App User ──────────────────────────────────────────────────────────

export async function updateAppUser(userId: number, formData: FormData) {
  const fullName = formData.get("full_name") as string;
  const email = (formData.get("email") as string) || null;
  const phone = formData.get("phone") as string;
  const companyName = (formData.get("company_name") as string) || null;
  const businessTypeId = formData.get("business_type_id") as string;
  const businessTypeOther = (formData.get("business_type_other") as string) || null;
  const townshipId = formData.get("township_id") as string;
  const isVerified = formData.get("is_verified") === "1" ? 1 : 0;

  if (!fullName?.trim()) {
    return { success: false, error: "Full name is required" };
  }
  if (!phone?.trim()) {
    return { success: false, error: "Phone number is required" };
  }
  if (!businessTypeId && !businessTypeOther?.trim()) {
    return { success: false, error: "Business type is required" };
  }
  if (!townshipId) {
    return { success: false, error: "Location is required" };
  }

  try {
    const actorId = await requirePermission("users", "edit");

    const prior = await d1.query<{ is_verified: number; username: string }>(
      "SELECT is_verified, username FROM app_user WHERE app_user_id = ? AND deleted_at IS NULL",
      [userId],
    );
    const priorVerified = prior.results[0]?.is_verified ?? 0;
    // Username is system-owned and immutable — kept only for audit messages.
    const existingUsername = prior.results[0]?.username ?? "";

    // Resolve business type ID — create an unlisted type if "Other" was specified.
    // Reject malformed values: Number("") and Number("0") both yield 0, and
    // Number("abc") yields NaN — none of those are valid FKs.
    let resolvedBtId: number = 0;
    if (businessTypeId) {
      const parsed = Number(businessTypeId);
      if (Number.isFinite(parsed) && parsed > 0) resolvedBtId = parsed;
    }

    if (businessTypeOther?.trim()) {
      const otherName = businessTypeOther.trim();

      const existing = await d1.query<{ business_type_id: number }>(
        "SELECT business_type_id FROM business_type WHERE name = ? LIMIT 1",
        [otherName],
      );

      if (existing.results.length > 0) {
        resolvedBtId = existing.results[0].business_type_id;
      } else {
        const created = await businessTypeService.create({
          name: otherName,
          is_listed: 0,
          created_by: actorId,
        });
        resolvedBtId = created.business_type_id;
      }
    }

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email?.trim().toLowerCase() || null;
    const trimmedPhone = phone.trim();
    const trimmedCompany = companyName?.trim() || null;

    // When an admin manually verifies a stuck user (0 → 1), also stamp
    // last_login_at = NOW() so the worker's OTP-bypass window (is_verified
    // && last_login_at within 60 days) activates immediately — otherwise
    // the user still hits OTP on next login, defeating the purpose.
    const stampLogin = priorVerified === 0 && isVerified === 1;
    const now = new Date().toISOString();

    await d1.query(
      `UPDATE app_user
       SET full_name = ?, email = ?, phone = ?, company_name = ?, business_type_id = ?, township_id = ?, is_verified = ?${stampLogin ? ", last_login_at = ?" : ""}
       WHERE app_user_id = ? AND deleted_at IS NULL`,
      stampLogin
        ? [trimmedFullName, trimmedEmail, trimmedPhone, trimmedCompany, resolvedBtId, Number(townshipId), isVerified, now, userId]
        : [trimmedFullName, trimmedEmail, trimmedPhone, trimmedCompany, resolvedBtId, Number(townshipId), isVerified, userId],
    );

    invalidateTag(CACHE_TAGS.USERS);
    auditLog(actorId, "updated app user | username=" + existingUsername);
    if (priorVerified !== isVerified) {
      auditLog(
        actorId,
        `manually ${isVerified ? "verified" : "unverified"} app user | id=${userId} username=${existingUsername}${stampLogin ? " (stamped last_login_at)" : ""}`,
      );
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update user"),
    };
  }
}

// ─── Reset App User Password ──────────────────────────────────────────────────

export async function resetAppUserPassword(userId: number) {
  try {
    const actorId = await requirePermission("users", "edit");

    const password = generatePassword();
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await d1.query(
      "UPDATE app_user SET password_hash = ? WHERE app_user_id = ? AND deleted_at IS NULL",
      [password_hash, userId],
    );

    auditLog(actorId, "reset password for app user | id=" + userId);
    return { success: true, password };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reset password"),
    };
  }
}

// ─── Get User Delete Impact ─────────────────────────────────────────────────

export interface UserDeleteImpact {
  partnerCount: number;
  chatSessionCount: number;
  saleListingCount: number;
  rentListingCount: number;
}

export async function getUserDeleteImpact(
  userId: number,
): Promise<UserDeleteImpact> {
  await requirePermission("users", "delete");

  const [partners, chatSessions, saleListings, rentListings] =
    await Promise.all([
      d1.query<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM partner WHERE app_user_id = ? AND deleted_at IS NULL",
        [userId],
      ),
      d1.query<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM chat_session WHERE app_user_id = ? AND deleted_at IS NULL",
        [userId],
      ),
      d1.query<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM sale_listing sl JOIN product_list pl ON sl.product_list_id = pl.id JOIN partner p ON pl.partner_id = p.id WHERE p.app_user_id = ? AND sl.deleted_at IS NULL",
        [userId],
      ),
      d1.query<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM rent_listing rl JOIN product_list pl ON rl.product_list_id = pl.id JOIN partner p ON pl.partner_id = p.id WHERE p.app_user_id = ? AND rl.deleted_at IS NULL",
        [userId],
      ),
    ]);

  return {
    partnerCount: partners.results[0]?.cnt ?? 0,
    chatSessionCount: chatSessions.results[0]?.cnt ?? 0,
    saleListingCount: saleListings.results[0]?.cnt ?? 0,
    rentListingCount: rentListings.results[0]?.cnt ?? 0,
  };
}

// ─── Delete App User ────────────────────────────────────────────────────────

export async function deleteAppUser(userId: number) {
  try {
    const deletedBy = await requirePermission("users", "delete");

    const existing = await d1.query<{ app_user_id: number }>(
      "SELECT app_user_id FROM app_user WHERE app_user_id = ? AND deleted_at IS NULL",
      [userId],
    );
    if (existing.results.length === 0) {
      return { success: false, error: "User not found or already deleted" };
    }

    await appUserService.softDelete(userId, deletedBy);
    await saveTrashMetadata("app_user", userId, deletedBy);

    invalidateTag(CACHE_TAGS.USERS);
    auditLog(deletedBy, "deleted app user | id=" + userId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete user"),
    };
  }
}
