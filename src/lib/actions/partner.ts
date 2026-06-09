"use server";

import { partnerService } from "@/lib/services/partner";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { auditLog } from "@/lib/actions/audit";
import { insertUserNotification } from "@/lib/services/user-notification";
import { sendPushToUser } from "@/lib/services/push-notification";
import type { PartnerWithDetails } from "@/types/partner";
import type { AppUser } from "@/types/app-user";

// ─── Partner Queries ─────────────────────────────────────────────────────────

export async function getPartnersWithDetails(): Promise<PartnerWithDetails[]> {
  const result = await d1.query<PartnerWithDetails>(
    `SELECT
      p.*,
      c.username AS user_name,
      c.email AS user_email,
      c.phone AS user_phone,
      c.company_name AS user_company,
      c.address AS user_address,
      c.is_verified AS user_verified,
      c.created_at AS user_joined,
      bt.name AS business_type_name,
      pt.name AS partner_type_name,
      pst.status_name AS status_name
    FROM partner p
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN business_type bt ON c.business_type_id = bt.business_type_id
    LEFT JOIN partner_type pt ON p.partner_type_id = pt.id
    LEFT JOIN partner_status_type pst ON p.status_id = pst.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.applied_at DESC`,
  );
  return result.results;
}

export async function getPartnerDetails(partnerId: number): Promise<PartnerWithDetails | null> {
  const result = await d1.query<PartnerWithDetails>(
    `SELECT
      p.*,
      c.username AS user_name,
      c.email AS user_email,
      c.phone AS user_phone,
      c.company_name AS user_company,
      c.address AS user_address,
      c.is_verified AS user_verified,
      c.created_at AS user_joined,
      bt.name AS business_type_name,
      pt.name AS partner_type_name,
      pst.status_name AS status_name
    FROM partner p
    LEFT JOIN app_user c ON p.app_user_id = c.app_user_id
    LEFT JOIN business_type bt ON c.business_type_id = bt.business_type_id
    LEFT JOIN partner_type pt ON p.partner_type_id = pt.id
    LEFT JOIN partner_status_type pst ON p.status_id = pst.id
    WHERE p.id = ? AND p.deleted_at IS NULL`,
    [partnerId],
  );
  return result.results[0] ?? null;
}

// ─── Partner Actions ─────────────────────────────────────────────────────────

export async function approvePartner(id: number) {
  try {
    const [reviewed_by, statusResult] = await Promise.all([
      requirePermission("partners", "approve"),
      d1.query<{ id: number }>(
        "SELECT id FROM partner_status_type WHERE status_name = ?",
        ["Approved"],
      ),
    ]);
    const statusId = statusResult.results[0]?.id;
    if (!statusId) {
      return { success: false, error: "Approved status type not found" };
    }

    // Idempotent no-op if already Approved — avoids re-stamping reviewed_at,
    // re-firing partner_approved push, and inserting a duplicate notification.
    const current = await d1.query<{ status_id: number | null }>(
      "SELECT status_id FROM partner WHERE id = ? LIMIT 1",
      [id],
    );
    if (current.results[0]?.status_id === statusId) {
      return { success: true };
    }

    await partnerService.update(id, {
      status_id: statusId,
      reviewed_at: new Date().toISOString(),
      reviewed_by,
      rejection_reason: null,
    });

    const partnerRow = await d1.query<{ app_user_id: number | null }>(
      "SELECT app_user_id FROM partner WHERE id = ?",
      [id],
    );
    const appUserId = partnerRow.results[0]?.app_user_id ?? null;
    if (appUserId) {
      await insertUserNotification({
        app_user_id: appUserId,
        type: "partner_approved",
        title: "Partner application approved",
        body: null,
        reference_type: "partner",
        reference_id: id,
      });
      sendPushToUser(appUserId, {
        type: "partner_approved",
        title: "Shwe Loader",
        body: "Your partner application has been approved.",
        referenceId: String(id),
        referenceType: "partner",
      }).catch(() => {});
    }

    invalidateTag(CACHE_TAGS.PARTNERS);
    auditLog(reviewed_by, "approved partner | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to approve partner"),
    };
  }
}

export async function rejectPartner(id: number, reason: string) {
  try {
    const [reviewed_by, statusResult] = await Promise.all([
      requirePermission("partners", "approve"),
      d1.query<{ id: number }>(
        "SELECT id FROM partner_status_type WHERE status_name = ?",
        ["Rejected"],
      ),
    ]);
    const statusId = statusResult.results[0]?.id;
    if (!statusId) {
      return { success: false, error: "Rejected status type not found" };
    }

    // Idempotent no-op if already Rejected.
    const current = await d1.query<{ status_id: number | null }>(
      "SELECT status_id FROM partner WHERE id = ? LIMIT 1",
      [id],
    );
    if (current.results[0]?.status_id === statusId) {
      return { success: true };
    }

    await partnerService.update(id, {
      status_id: statusId,
      reviewed_at: new Date().toISOString(),
      reviewed_by,
      rejection_reason: reason || null,
    });

    const partnerRow = await d1.query<{ app_user_id: number | null }>(
      "SELECT app_user_id FROM partner WHERE id = ?",
      [id],
    );
    const appUserId = partnerRow.results[0]?.app_user_id ?? null;
    if (appUserId) {
      await insertUserNotification({
        app_user_id: appUserId,
        type: "partner_rejected",
        title: "Partner application rejected",
        body: reason || null,
        reference_type: "partner",
        reference_id: id,
      });
      sendPushToUser(appUserId, {
        type: "partner_rejected",
        title: "Shwe Loader",
        body: reason
          ? `Application rejected: ${reason}`
          : "Your partner application was not approved.",
        referenceId: String(id),
        referenceType: "partner",
      }).catch(() => {});
    }

    invalidateTag(CACHE_TAGS.PARTNERS);
    auditLog(reviewed_by, "rejected partner | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reject partner"),
    };
  }
}

// ─── Admin-initiated promotion ───────────────────────────────────────────────

/**
 * Users eligible to be promoted to partner: any non-deleted user who is NOT
 * already an approved partner. With no (or a <2-char) query it returns the most
 * recent eligible users so the "Add Partner" dialog can show a browsable list
 * without the admin having to type; a 2+ char query filters by
 * name/email/phone/company. Used by the Partners page "Add Partner" dialog.
 */
export async function searchUsersForPartner(query: string) {
  try {
    await requirePermission("partners", "approve");

    const trimmed = query.trim();
    const hasQuery = trimmed.length >= 2;
    const term = `%${trimmed}%`;

    const result = await d1.query<AppUser>(
      `SELECT c.*, 0 AS is_approved_partner
       FROM app_user c
       WHERE c.deleted_at IS NULL
         ${hasQuery ? "AND (c.username LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company_name LIKE ?)" : ""}
         AND NOT EXISTS (
           SELECT 1 FROM partner p
           JOIN partner_status_type pst ON p.status_id = pst.id
           WHERE p.app_user_id = c.app_user_id AND pst.status_name = 'Approved'
         )
       ORDER BY ${hasQuery ? "c.username ASC" : "c.created_at DESC"}
       LIMIT 20`,
      hasQuery ? [term, term, term, term] : [],
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

/**
 * Admin-initiated promotion of an existing user to an approved partner. Instant
 * approve (no review step), exactly like the Add-User toggle. Upserts the
 * partner row so a user with a prior pending/rejected/soft-deleted application
 * is reused rather than duplicated. Reuses the same partner_approved
 * notification as approvePartner().
 */
export async function promoteUserToPartner(
  appUserId: number,
  partnerTypeId: number,
) {
  try {
    const [reviewed_by, statusResult] = await Promise.all([
      requirePermission("partners", "approve"),
      d1.query<{ id: number }>(
        "SELECT id FROM partner_status_type WHERE status_name = ?",
        ["Approved"],
      ),
    ]);
    const statusId = statusResult.results[0]?.id;
    if (!statusId) {
      return { success: false, error: "Approved status type not found" };
    }

    // Reuse an existing partner row (any status, including soft-deleted) so we
    // never create a duplicate partner record for the same user.
    const existing = await d1.query<{
      id: number;
      status_id: number | null;
      deleted_at: string | null;
    }>(
      "SELECT id, status_id, deleted_at FROM partner WHERE app_user_id = ? ORDER BY id DESC LIMIT 1",
      [appUserId],
    );
    const existingRow = existing.results[0];

    // Idempotent no-op if already an active approved partner.
    if (
      existingRow &&
      existingRow.status_id === statusId &&
      existingRow.deleted_at === null
    ) {
      return { success: true };
    }

    const now = new Date().toISOString();
    let partnerId: number;

    if (existingRow) {
      if (existingRow.deleted_at !== null) {
        await partnerService.restore(existingRow.id);
      }
      await partnerService.update(existingRow.id, {
        partner_type_id: partnerTypeId,
        status_id: statusId,
        reviewed_at: now,
        reviewed_by,
        rejection_reason: null,
      });
      partnerId = existingRow.id;
    } else {
      const created = await partnerService.create({
        app_user_id: appUserId,
        partner_type_id: partnerTypeId,
        status_id: statusId,
        reviewed_at: now,
        reviewed_by,
      });
      partnerId = created.id;
    }

    await insertUserNotification({
      app_user_id: appUserId,
      type: "partner_approved",
      title: "Partner application approved",
      body: null,
      reference_type: "partner",
      reference_id: partnerId,
    });
    sendPushToUser(appUserId, {
      type: "partner_approved",
      title: "Shwe Loader",
      body: "Your partner application has been approved.",
      referenceId: String(partnerId),
      referenceType: "partner",
    }).catch(() => {});

    invalidateTag(CACHE_TAGS.PARTNERS);
    invalidateTag(CACHE_TAGS.USERS);
    auditLog(reviewed_by, "promoted user to partner | app_user_id=" + appUserId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to promote user to partner"),
    };
  }
}

// ─── Partner type change ─────────────────────────────────────────────────────

/**
 * Admin-initiated change of an existing partner's partner type (reclassify,
 * e.g. Dealer → Rental Company). Internal correction: updates the record and
 * writes an audit-log entry only — no push, no in-app notification. Idempotent
 * no-op when the type is unchanged.
 */
export async function updatePartnerType(
  partnerId: number,
  partnerTypeId: number,
) {
  try {
    const adminId = await requirePermission("partners", "approve");

    if (!Number.isFinite(partnerTypeId) || partnerTypeId <= 0) {
      return { success: false, error: "Invalid partner type" };
    }

    const current = await d1.query<{
      partner_type_id: number | null;
      deleted_at: string | null;
    }>(
      "SELECT partner_type_id, deleted_at FROM partner WHERE id = ? LIMIT 1",
      [partnerId],
    );
    const row = current.results[0];
    if (!row || row.deleted_at !== null) {
      return { success: false, error: "Partner not found" };
    }

    // Idempotent no-op if the type is unchanged.
    if (row.partner_type_id === partnerTypeId) {
      return { success: true };
    }

    await partnerService.update(partnerId, { partner_type_id: partnerTypeId });

    invalidateTag(CACHE_TAGS.PARTNERS);
    auditLog(
      adminId,
      "updated partner type | id=" + partnerId + " type=" + partnerTypeId,
    );
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update partner type"),
    };
  }
}
