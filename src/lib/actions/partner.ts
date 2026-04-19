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
