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
 * Shows the target user and counts of related data that will be soft-deleted.
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

  // 2. Count related entities for this user only
  const [sales, rents, enquiries, partners] = await Promise.all([
    d1.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM sale_listing sl
       JOIN product_list pl ON sl.product_list_id = pl.id
       JOIN partner p ON pl.partner_id = p.id
       WHERE p.app_user_id = ?
       AND sl.deleted_at IS NULL`,
      [appUserId],
    ),
    d1.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM rent_listing rl
       JOIN product_list pl ON rl.product_list_id = pl.id
       JOIN partner p ON pl.partner_id = p.id
       WHERE p.app_user_id = ?
       AND rl.deleted_at IS NULL`,
      [appUserId],
    ),
    d1.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM enquiry
       WHERE app_user_id = ? AND deleted_at IS NULL`,
      [appUserId],
    ),
    d1.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM partner
       WHERE app_user_id = ? AND deleted_at IS NULL`,
      [appUserId],
    ),
  ]);

  const saleCount = sales.results[0]?.count ?? 0;
  const rentCount = rents.results[0]?.count ?? 0;

  return {
    user: {
      app_user_id: targetUser.app_user_id,
      username: targetUser.username,
      full_name: targetUser.full_name,
      email: targetUser.email,
      phone: targetUser.phone,
      company_name: targetUser.company_name,
    },
    listing_count: saleCount + rentCount,
    sale_listing_count: saleCount,
    rent_listing_count: rentCount,
    enquiry_count: enquiries.results[0]?.count ?? 0,
    partner_count: partners.results[0]?.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Blacklist User
// ---------------------------------------------------------------------------

/**
 * Blacklist an individual user.
 * Creates a blacklist entry, soft-deletes user + related data.
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

    const now = new Date().toISOString();

    // 2. Create blacklist entry
    await d1.query(
      `INSERT INTO blacklist (app_user_id, phone, email, company_name, reason, blacklisted_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        targetUser.app_user_id,
        targetUser.phone,
        targetUser.email,
        targetUser.company_name,
        reason.trim(),
        adminId,
      ],
    );

    // 3. Soft-delete the user
    await d1.query(
      "UPDATE app_user SET deleted_at = ? WHERE app_user_id = ?",
      [now, appUserId],
    );

    // 4. Soft-delete related entities
    await d1.query(
      `UPDATE partner SET deleted_at = ?
       WHERE app_user_id = ? AND deleted_at IS NULL`,
      [now, appUserId],
    );

    await d1.query(
      `UPDATE product_list SET deleted_at = ?
       WHERE partner_id IN (SELECT id FROM partner WHERE app_user_id = ?)
       AND deleted_at IS NULL`,
      [now, appUserId],
    );

    await d1.query(
      `UPDATE sale_listing SET deleted_at = ?
       WHERE product_list_id IN (
         SELECT pl.id FROM product_list pl
         JOIN partner p ON pl.partner_id = p.id
         WHERE p.app_user_id = ?
       ) AND deleted_at IS NULL`,
      [now, appUserId],
    );

    await d1.query(
      `UPDATE rent_listing SET deleted_at = ?
       WHERE product_list_id IN (
         SELECT pl.id FROM product_list pl
         JOIN partner p ON pl.partner_id = p.id
         WHERE p.app_user_id = ?
       ) AND deleted_at IS NULL`,
      [now, appUserId],
    );

    await d1.query(
      `UPDATE enquiry SET deleted_at = ?
       WHERE app_user_id = ? AND deleted_at IS NULL`,
      [now, appUserId],
    );

    // 5. Audit log
    await auditLog(
      adminId,
      `Blacklisted user: ${targetUser.username}. Reason: ${reason.trim()}`,
    );

    // 6. Invalidate caches
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

    // 1. Get the blacklist entries to find affected user IDs + timestamps
    //    The created_at timestamp matches the deleted_at set during blacklisting,
    //    so we only restore rows that were deleted BY the blacklist — not rows
    //    that were independently deleted before the ban.
    const entries = await d1.query<{
      blacklist_id: number;
      app_user_id: number;
      created_at: string;
      username?: string;
    }>(
      `SELECT b.blacklist_id, b.app_user_id, b.created_at, u.username
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

    // Collect the blacklist timestamps per user — these are the deleted_at
    // values that the blacklist cascade wrote, so we can precisely target them.
    const timestampsByUser = new Map<number, Set<string>>();
    for (const entry of entries.results) {
      let set = timestampsByUser.get(entry.app_user_id);
      if (!set) {
        set = new Set();
        timestampsByUser.set(entry.app_user_id, set);
      }
      set.add(entry.created_at);
    }

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

    // 4. Restore only rows whose deleted_at matches a blacklist timestamp.
    //    This prevents resurrecting rows that were independently deleted
    //    (via trash or manual action) before the ban.
    for (const userId of fullyUnblacklisted) {
      const timestamps = [...(timestampsByUser.get(userId) ?? [])];
      if (timestamps.length === 0) continue;

      const tsPlaceholders = timestamps.map(() => "?").join(",");

      // 4a. Restore app_user
      await d1.query(
        `UPDATE app_user SET deleted_at = NULL
         WHERE app_user_id = ? AND deleted_at IN (${tsPlaceholders})`,
        [userId, ...timestamps],
      );

      // 4b. Restore partner
      await d1.query(
        `UPDATE partner SET deleted_at = NULL
         WHERE app_user_id = ? AND deleted_at IN (${tsPlaceholders})`,
        [userId, ...timestamps],
      );

      // 4c. Restore product_list
      await d1.query(
        `UPDATE product_list SET deleted_at = NULL
         WHERE partner_id IN (SELECT id FROM partner WHERE app_user_id = ?)
         AND deleted_at IN (${tsPlaceholders})`,
        [userId, ...timestamps],
      );

      // 4d. Restore sale_listing
      await d1.query(
        `UPDATE sale_listing SET deleted_at = NULL
         WHERE product_list_id IN (
           SELECT pl.id FROM product_list pl
           JOIN partner p ON pl.partner_id = p.id
           WHERE p.app_user_id = ?
         ) AND deleted_at IN (${tsPlaceholders})`,
        [userId, ...timestamps],
      );

      // 4e. Restore rent_listing
      await d1.query(
        `UPDATE rent_listing SET deleted_at = NULL
         WHERE product_list_id IN (
           SELECT pl.id FROM product_list pl
           JOIN partner p ON pl.partner_id = p.id
           WHERE p.app_user_id = ?
         ) AND deleted_at IN (${tsPlaceholders})`,
        [userId, ...timestamps],
      );

      // 4f. Restore enquiry
      await d1.query(
        `UPDATE enquiry SET deleted_at = NULL
         WHERE app_user_id = ? AND deleted_at IN (${tsPlaceholders})`,
        [userId, ...timestamps],
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
