"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import {
  getErrorMessage,
  requirePermission,
  assertBulkLimit,
} from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { auditLog } from "@/lib/actions/audit";
import type { BlacklistImpactPreview } from "@/types/blacklist";
import type { AppUser } from "@/types/app-user";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function invalidateBlacklistCaches() {
  invalidateTag(
    CACHE_TAGS.USERS,
    CACHE_TAGS.BLACKLIST,
    CACHE_TAGS.PARTNERS,
    CACHE_TAGS.SALE_LISTINGS,
    CACHE_TAGS.RENT_LISTINGS,
    CACHE_TAGS.FEATURED_LISTINGS,
    CACHE_TAGS.ENQUIRIES,
  );
}

// ---------------------------------------------------------------------------
// Impact Preview
// ---------------------------------------------------------------------------

/**
 * Fetch the impact preview before confirming a blacklist action.
 * Shows affected users (company-level ban), listing counts, etc.
 */
export async function getBlacklistImpactPreview(
  appUserId: number,
): Promise<BlacklistImpactPreview> {
  await requirePermission("blacklist", "create");

  // 1. Get the target user
  const userResult = await d1.query<AppUser>(
    "SELECT * FROM app_user WHERE app_user_id = ? AND deleted_at IS NULL",
    [appUserId],
  );
  const targetUser = userResult.results[0];
  if (!targetUser) throw new Error("User not found");

  // 2. Determine affected users (company-level ban or individual)
  let affectedUsers: AppUser[];
  const isCompanyBan = !!targetUser.company_name;

  if (isCompanyBan) {
    const companyResult = await d1.query<AppUser>(
      "SELECT * FROM app_user WHERE company_name = ? AND deleted_at IS NULL",
      [targetUser.company_name],
    );
    affectedUsers = companyResult.results;
  } else {
    affectedUsers = [targetUser];
  }

  const userIds = affectedUsers.map((u) => u.app_user_id);
  const placeholders = userIds.map(() => "?").join(",");

  // 3. Count related entities across all affected users
  const [sales, rents, enquiries, partners] = await Promise.all([
    d1.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM sale_listing sl
       JOIN product_list pl ON sl.product_list_id = pl.id
       JOIN partner p ON pl.partner_id = p.id
       WHERE p.app_user_id IN (${placeholders})
       AND sl.deleted_at IS NULL`,
      userIds,
    ),
    d1.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM rent_listing rl
       JOIN product_list pl ON rl.product_list_id = pl.id
       JOIN partner p ON pl.partner_id = p.id
       WHERE p.app_user_id IN (${placeholders})
       AND rl.deleted_at IS NULL`,
      userIds,
    ),
    d1.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM enquiry
       WHERE app_user_id IN (${placeholders}) AND deleted_at IS NULL`,
      userIds,
    ),
    d1.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM partner
       WHERE app_user_id IN (${placeholders}) AND deleted_at IS NULL`,
      userIds,
    ),
  ]);

  const saleCount = sales.results[0]?.count ?? 0;
  const rentCount = rents.results[0]?.count ?? 0;

  return {
    affected_users: affectedUsers.map((u) => ({
      app_user_id: u.app_user_id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      company_name: u.company_name,
    })),
    listing_count: saleCount + rentCount,
    sale_listing_count: saleCount,
    rent_listing_count: rentCount,
    enquiry_count: enquiries.results[0]?.count ?? 0,
    partner_count: partners.results[0]?.count ?? 0,
    is_company_ban: isCompanyBan,
  };
}

// ---------------------------------------------------------------------------
// Blacklist User
// ---------------------------------------------------------------------------

/**
 * Blacklist a user (and all company users if applicable).
 * Creates blacklist entries, soft-deletes user + related data.
 */
export async function blacklistUser(appUserId: number, reason: string) {
  try {
    const adminId = await requirePermission("blacklist", "create");

    if (!reason.trim()) {
      return { success: false, error: "Reason is required" };
    }

    // 1. Get the target user
    const userResult = await d1.query<AppUser>(
      "SELECT * FROM app_user WHERE app_user_id = ? AND deleted_at IS NULL",
      [appUserId],
    );
    const targetUser = userResult.results[0];
    if (!targetUser) {
      return { success: false, error: "User not found or already blacklisted" };
    }

    // 2. Determine affected users
    let affectedUsers: AppUser[];
    if (targetUser.company_name) {
      const companyResult = await d1.query<AppUser>(
        "SELECT * FROM app_user WHERE company_name = ? AND deleted_at IS NULL",
        [targetUser.company_name],
      );
      affectedUsers = companyResult.results;
    } else {
      affectedUsers = [targetUser];
    }

    const now = new Date().toISOString();
    const userIds = affectedUsers.map((u) => u.app_user_id);
    const placeholders = userIds.map(() => "?").join(",");

    // 3. Create blacklist entries (one per user)
    for (const user of affectedUsers) {
      await d1.query(
        `INSERT INTO blacklist (app_user_id, phone, email, company_name, reason, blacklisted_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user.app_user_id,
          user.phone,
          user.email,
          user.company_name,
          reason.trim(),
          adminId,
        ],
      );
    }

    // 4. Soft-delete: set deleted_at on app_user rows
    await d1.query(
      `UPDATE app_user SET deleted_at = ? WHERE app_user_id IN (${placeholders})`,
      [now, ...userIds],
    );

    // 5. Soft-delete related entities
    await d1.query(
      `UPDATE partner SET deleted_at = ?
       WHERE app_user_id IN (${placeholders}) AND deleted_at IS NULL`,
      [now, ...userIds],
    );

    await d1.query(
      `UPDATE product_list SET deleted_at = ?
       WHERE partner_id IN (SELECT id FROM partner WHERE app_user_id IN (${placeholders}))
       AND deleted_at IS NULL`,
      [now, ...userIds],
    );

    await d1.query(
      `UPDATE sale_listing SET deleted_at = ?
       WHERE product_list_id IN (
         SELECT pl.id FROM product_list pl
         JOIN partner p ON pl.partner_id = p.id
         WHERE p.app_user_id IN (${placeholders})
       ) AND deleted_at IS NULL`,
      [now, ...userIds],
    );

    await d1.query(
      `UPDATE rent_listing SET deleted_at = ?
       WHERE product_list_id IN (
         SELECT pl.id FROM product_list pl
         JOIN partner p ON pl.partner_id = p.id
         WHERE p.app_user_id IN (${placeholders})
       ) AND deleted_at IS NULL`,
      [now, ...userIds],
    );

    await d1.query(
      `UPDATE enquiry SET deleted_at = ?
       WHERE app_user_id IN (${placeholders}) AND deleted_at IS NULL`,
      [now, ...userIds],
    );

    // 6. Audit log
    const usernames = affectedUsers.map((u) => u.username).join(", ");
    await auditLog(
      adminId,
      `Blacklisted ${affectedUsers.length} user(s): ${usernames}. Reason: ${reason.trim()}`,
    );

    // 7. Invalidate caches
    invalidateBlacklistCaches();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to blacklist user"),
    };
  }
}

// ---------------------------------------------------------------------------
// Unblacklist Users
// ---------------------------------------------------------------------------

/**
 * Remove blacklist entries and restore users + their data.
 * No reason required for unblacklisting.
 */
export async function unblacklistUsers(blacklistIds: number[]) {
  try {
    const adminId = await requirePermission("blacklist", "delete");
    assertBulkLimit(blacklistIds);

    if (blacklistIds.length === 0) {
      return { success: false, error: "No entries selected" };
    }

    const placeholders = blacklistIds.map(() => "?").join(",");

    // 1. Get the blacklist entries to find affected user IDs
    const entries = await d1.query<{
      blacklist_id: number;
      app_user_id: number;
      username?: string;
    }>(
      `SELECT b.blacklist_id, b.app_user_id, u.username
       FROM blacklist b
       LEFT JOIN app_user u ON b.app_user_id = u.app_user_id
       WHERE b.blacklist_id IN (${placeholders})`,
      blacklistIds,
    );

    if (entries.results.length === 0) {
      return { success: false, error: "Blacklist entries not found" };
    }

    const userIds = [...new Set(entries.results.map((e) => e.app_user_id))];
    const userPlaceholders = userIds.map(() => "?").join(",");

    // 2. Delete blacklist entries
    await d1.query(
      `DELETE FROM blacklist WHERE blacklist_id IN (${placeholders})`,
      blacklistIds,
    );

    // 3. Check if any of these users still have OTHER blacklist entries
    const remaining = await d1.query<{ app_user_id: number }>(
      `SELECT DISTINCT app_user_id FROM blacklist WHERE app_user_id IN (${userPlaceholders})`,
      userIds,
    );
    const stillBlacklisted = new Set(
      remaining.results.map((r) => r.app_user_id),
    );
    const fullyUnblacklisted = userIds.filter(
      (id) => !stillBlacklisted.has(id),
    );

    if (fullyUnblacklisted.length > 0) {
      const fullyPlaceholders = fullyUnblacklisted.map(() => "?").join(",");

      // 4. Restore: clear deleted_at on app_user
      await d1.query(
        `UPDATE app_user SET deleted_at = NULL WHERE app_user_id IN (${fullyPlaceholders})`,
        fullyUnblacklisted,
      );

      // 5. Restore related entities (restores to original state)
      await d1.query(
        `UPDATE partner SET deleted_at = NULL WHERE app_user_id IN (${fullyPlaceholders})`,
        fullyUnblacklisted,
      );

      await d1.query(
        `UPDATE product_list SET deleted_at = NULL
         WHERE partner_id IN (SELECT id FROM partner WHERE app_user_id IN (${fullyPlaceholders}))`,
        fullyUnblacklisted,
      );

      await d1.query(
        `UPDATE sale_listing SET deleted_at = NULL
         WHERE product_list_id IN (
           SELECT pl.id FROM product_list pl
           JOIN partner p ON pl.partner_id = p.id
           WHERE p.app_user_id IN (${fullyPlaceholders})
         )`,
        fullyUnblacklisted,
      );

      await d1.query(
        `UPDATE rent_listing SET deleted_at = NULL
         WHERE product_list_id IN (
           SELECT pl.id FROM product_list pl
           JOIN partner p ON pl.partner_id = p.id
           WHERE p.app_user_id IN (${fullyPlaceholders})
         )`,
        fullyUnblacklisted,
      );

      await d1.query(
        `UPDATE enquiry SET deleted_at = NULL WHERE app_user_id IN (${fullyPlaceholders})`,
        fullyUnblacklisted,
      );
    }

    // 6. Audit log
    const usernames = entries.results
      .map((e) => e.username ?? `#${e.app_user_id}`)
      .join(", ");
    await auditLog(
      adminId,
      `Unblacklisted ${entries.results.length} entry(ies) for user(s): ${usernames}`,
    );

    // 7. Invalidate caches
    invalidateBlacklistCaches();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to unblacklist"),
    };
  }
}

// ---------------------------------------------------------------------------
// Search Users (for "Add to Blacklist" dialog)
// ---------------------------------------------------------------------------

/**
 * Search active (non-blacklisted) users by name, phone, email, or company.
 * Used in the blacklist search dialog on the Blacklist tab.
 */
export async function searchUsersForBlacklist(query: string) {
  try {
    await requirePermission("blacklist", "create");

    if (!query.trim() || query.trim().length < 2) {
      return { success: true, data: [] as AppUser[] };
    }

    const term = `%${query.trim()}%`;
    const result = await d1.query<AppUser>(
      `SELECT * FROM app_user
       WHERE deleted_at IS NULL
       AND (username LIKE ? OR email LIKE ? OR phone LIKE ? OR company_name LIKE ?)
       ORDER BY username ASC
       LIMIT 20`,
      [term, term, term, term],
    );

    return { success: true, data: result.results };
  } catch (error) {
    return {
      success: false,
      data: [] as AppUser[],
      error: getErrorMessage(error, "Failed to search users"),
    };
  }
}
