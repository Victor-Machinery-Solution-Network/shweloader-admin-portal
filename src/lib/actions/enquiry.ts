"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { customIdSqlExpr } from "@/lib/utils/custom-id";
import { auditLog } from "@/lib/actions/audit";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";

// ─── Data Fetching ──────────────────────────────────────────────────────────

/**
 * One row per (chat_session, listing) pair. Joins out everything needed for the
 * report — inquiring user, listing/product metadata, partner (owner), and the
 * admin-side tracking fields (status + notes).
 *
 * No `requirePermission` here — this function runs inside `use cache` and
 * `auth()` would touch `headers()`, which Cache Components forbid. The
 * PermissionGate wrapping the page is what gates access.
 *
 * The location string is composed in SQL from township → district → state_region
 * via the user's township_id. NULLs degrade gracefully — if a user has no
 * township set, location comes back null.
 */
export async function getEnquiriesWithDetails(): Promise<EnquiryWithDetails[]> {
  const result = await d1.query<EnquiryWithDetails>(
    `SELECT
        ce.id,
        ce.enquired_at,

        au.full_name        AS user_name,
        au.username         AS user_username,
        au.phone            AS user_phone,
        au.email            AS user_email,
        CASE
          WHEN t.name IS NOT NULL AND d.name IS NOT NULL AND sr.name IS NOT NULL
            THEN t.name || ', ' || d.name || ', ' || sr.name
          WHEN t.name IS NOT NULL AND d.name IS NOT NULL
            THEN t.name || ', ' || d.name
          ELSE t.name
        END                 AS user_location,
        au.app_user_id      AS app_user_id,

        CASE WHEN ce.sale_listing_id IS NOT NULL THEN 'sale' ELSE 'rent' END AS product_type,
        ${customIdSqlExpr({ saleListing: "sl_state", rentListing: "rl_state" })} AS product_code,
        pl.id               AS product_list_id,
        COALESCE(ce.sale_listing_id, ce.rent_listing_id) AS listing_id,
        pb.name             AS brand_name,
        COALESCE(em.name, am.name) AS model_name,
        COALESCE(sl.mmk_price, rl.mmk_price)            AS mmk_price,
        COALESCE(sl.usd_price, rl.usd_price)            AS usd_price,
        COALESCE(sl.display_currency, rl.display_currency) AS display_currency,
        rl.rental_unit      AS rental_unit,

        pau.full_name       AS partner_name,
        pau.username        AS partner_username,
        p.id                AS partner_id,

        ce.status_id,
        est.status_name,
        ce.close_outcome,
        ce.notes,
        ce.chat_session_id
      FROM chat_enquiry ce
      JOIN chat_session cs        ON cs.id = ce.chat_session_id AND cs.deleted_at IS NULL
      JOIN app_user au            ON au.app_user_id = cs.app_user_id AND au.deleted_at IS NULL
      LEFT JOIN township t        ON t.township_id = au.township_id AND t.deleted_at IS NULL
      LEFT JOIN district d        ON d.district_id = t.district_id AND d.deleted_at IS NULL
      LEFT JOIN state_region sr   ON sr.state_region_id = d.state_region_id AND sr.deleted_at IS NULL
      LEFT JOIN sale_listing sl   ON sl.id = ce.sale_listing_id AND sl.deleted_at IS NULL
      LEFT JOIN rent_listing rl   ON rl.id = ce.rent_listing_id AND rl.deleted_at IS NULL
      JOIN product_list pl        ON pl.id = COALESCE(sl.product_list_id, rl.product_list_id)
      LEFT JOIN sale_listing sl_state ON sl_state.product_list_id = pl.id AND sl_state.deleted_at IS NULL
      LEFT JOIN rent_listing rl_state ON rl_state.product_list_id = pl.id AND rl_state.deleted_at IS NULL
      LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
      LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
      LEFT JOIN product_brand pb   ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
      LEFT JOIN partner p          ON p.id = pl.partner_id AND p.deleted_at IS NULL
      LEFT JOIN app_user pau       ON pau.app_user_id = p.app_user_id AND pau.deleted_at IS NULL
      JOIN enquiry_status_type est ON est.id = ce.status_id
      ORDER BY ce.enquired_at DESC`,
  );

  return result.results;
}

export async function getEnquiryStatusTypes(): Promise<EnquiryStatusType[]> {
  const result = await d1.query<EnquiryStatusType>(
    "SELECT id, status_name FROM enquiry_status_type ORDER BY id ASC",
  );
  return result.results;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function updateEnquiryStatus(
  id: number,
  statusId: number,
  closeOutcome: "won" | "lost" | null,
) {
  try {
    const adminId = await requirePermission("enquiries", "edit");

    // close_outcome only meaningful when status='Closed' (id=3). Clear it
    // otherwise so the data stays clean.
    const outcome = statusId === 3 ? closeOutcome : null;

    await d1.query(
      `UPDATE chat_enquiry
         SET status_id = ?,
             close_outcome = ?,
             updated_at = CURRENT_TIMESTAMP,
             updated_by = ?
       WHERE id = ?`,
      [statusId, outcome, adminId, id],
    );

    invalidateTag(CACHE_TAGS.ENQUIRIES);
    auditLog(adminId, `updated enquiry status | id=${id} status_id=${statusId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update enquiry status"),
    };
  }
}

export async function updateEnquiryNotes(id: number, notes: string) {
  try {
    const adminId = await requirePermission("enquiries", "edit");
    const trimmed = notes.trim();

    await d1.query(
      `UPDATE chat_enquiry
         SET notes = ?,
             updated_at = CURRENT_TIMESTAMP,
             updated_by = ?
       WHERE id = ?`,
      [trimmed.length === 0 ? null : trimmed, adminId, id],
    );

    invalidateTag(CACHE_TAGS.ENQUIRIES);
    auditLog(adminId, `updated enquiry notes | id=${id}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update enquiry notes"),
    };
  }
}
