"use server";

import { revalidatePath, updateTag } from "next/cache";
import { partnerService } from "@/lib/services/partner";
import { d1 } from "@/lib/api/d1-client";
import { ROUTES } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import type { PartnerWithDetails } from "@/types/partner";

// ─── Partner Queries ─────────────────────────────────────────────────────────

export async function getPartnersWithDetails(): Promise<PartnerWithDetails[]> {
  const result = await d1.query<PartnerWithDetails>(
    `SELECT
      p.*,
      c.username AS customer_name,
      c.email AS customer_email,
      c.company_name AS customer_company,
      pt.name AS partner_type_name,
      pst.status_name AS status_name
    FROM partner p
    LEFT JOIN customer c ON p.customer_id = c.customer_id
    LEFT JOIN partner_type pt ON p.partner_type_id = pt.id
    LEFT JOIN partner_status_type pst ON p.status_id = pst.id
    ORDER BY p.applied_at DESC`,
  );
  return result.results;
}

// ─── Partner Actions ─────────────────────────────────────────────────────────

export async function approvePartner(id: number) {
  try {
    const [reviewed_by, statusResult] = await Promise.all([
      getCurrentUserId(),
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
    revalidatePath(ROUTES.PARTNERS);
    updateTag("partners");
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
      getCurrentUserId(),
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
    revalidatePath(ROUTES.PARTNERS);
    updateTag("partners");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reject partner"),
    };
  }
}
