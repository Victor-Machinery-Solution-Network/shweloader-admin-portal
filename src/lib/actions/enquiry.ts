"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { saveTrashMetadata } from "@/lib/actions/trash";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";

// ─── Data Fetching ──────────────────────────────────────────────────────────

/** Get all enquiries with user and listing details */
export async function getEnquiriesWithDetails(): Promise<
  EnquiryWithDetails[]
> {
  const result = await d1.query<EnquiryWithDetails>(
    `SELECT
       e.id,
       e.sale_listing_id,
       e.rent_listing_id,
       e.app_user_id,
       e.message,
       e.enquiry_status_id,
       e.created_at,
       e.updated_at,
       e.updated_by,
       est.status_name,
       c.full_name AS user_name,
       c.email AS user_email,
       c.phone AS user_phone,
       c.company_name AS user_company,
       CASE
         WHEN e.sale_listing_id IS NOT NULL THEN
           (SELECT COALESCE(em.name, am.name) FROM sale_listing sl
            JOIN product_list pl ON sl.product_list_id = pl.id
            LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
            LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
            WHERE sl.id = e.sale_listing_id
            LIMIT 1)
         WHEN e.rent_listing_id IS NOT NULL THEN
           (SELECT COALESCE(em.name, am.name) FROM rent_listing rl
            JOIN product_list pl ON rl.product_list_id = pl.id
            LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
            LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
            WHERE rl.id = e.rent_listing_id
            LIMIT 1)
         ELSE NULL
       END AS model_name,
       CASE
         WHEN e.sale_listing_id IS NOT NULL THEN 'sale'
         WHEN e.rent_listing_id IS NOT NULL THEN 'rent'
         ELSE NULL
       END AS listing_type,
       CASE
         WHEN e.sale_listing_id IS NOT NULL THEN
           (SELECT pl.thumbnail_url FROM sale_listing sl
            JOIN product_list pl ON sl.product_list_id = pl.id
            WHERE sl.id = e.sale_listing_id LIMIT 1)
         WHEN e.rent_listing_id IS NOT NULL THEN
           (SELECT pl.thumbnail_url FROM rent_listing rl
            JOIN product_list pl ON rl.product_list_id = pl.id
            WHERE rl.id = e.rent_listing_id LIMIT 1)
         ELSE NULL
       END AS thumbnail_url,
       cs.id AS session_id,
       COALESCE(cm_agg.message_count, 0) AS message_count,
       cm_agg.last_reply_at
     FROM enquiry e
     LEFT JOIN enquiry_status_type est ON e.enquiry_status_id = est.id
     LEFT JOIN app_user c ON e.app_user_id = c.app_user_id
     LEFT JOIN chat_session cs ON cs.enquiry_id = e.id
     LEFT JOIN (
       SELECT chat_session_id, COUNT(*) AS message_count, MAX(created_at) AS last_reply_at
       FROM chat_message
       GROUP BY chat_session_id
     ) cm_agg ON cm_agg.chat_session_id = cs.id
     WHERE e.deleted_at IS NULL
     ORDER BY e.created_at DESC`,
  );
  return result.results;
}

/** Get enquiry status types */
export async function getEnquiryStatusTypes(): Promise<EnquiryStatusType[]> {
  const result = await d1.query<EnquiryStatusType>(
    "SELECT id, status_name FROM enquiry_status_type ORDER BY id ASC",
  );
  return result.results;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Delete a single enquiry */
export async function deleteEnquiry(enquiryId: number) {
  try {
    const deletedBy = await requirePermission("enquiries", "delete");
    await d1.query(
      "UPDATE enquiry SET deleted_at = ?, deleted_by = ? WHERE id = ?",
      [new Date().toISOString(), deletedBy, enquiryId],
    );
    // Close linked chat session (preserve message history)
    await d1.query(
      `UPDATE chat_session SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE enquiry_id = ?`,
      [enquiryId],
    ).catch(() => {}); // Non-critical — don't fail the delete
    saveTrashMetadata("enquiry", enquiryId, deletedBy).catch(() => {});
    invalidateTag(CACHE_TAGS.ENQUIRIES);
    invalidateTag(CACHE_TAGS.CHAT_SESSIONS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete enquiry"),
    };
  }
}

/** Bulk delete enquiries */
export async function deleteEnquiries(ids: number[]) {
  if (ids.length === 0) return { success: true };
  const deletedBy = await requirePermission("enquiries", "delete");
  assertBulkLimit(ids);

  try {
    const placeholders = ids.map(() => "?").join(",");
    const now = new Date().toISOString();
    await d1.query(
      `UPDATE enquiry SET deleted_at = ?, deleted_by = ? WHERE id IN (${placeholders})`,
      [now, deletedBy, ...ids],
    );
    // Close linked chat sessions
    await d1.query(
      `UPDATE chat_session SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE enquiry_id IN (${placeholders})`,
      [...ids],
    ).catch(() => {});
    for (const id of ids) {
      saveTrashMetadata("enquiry", id, deletedBy).catch(() => {});
    }
    invalidateTag(CACHE_TAGS.ENQUIRIES);
    invalidateTag(CACHE_TAGS.CHAT_SESSIONS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete enquiries"),
    };
  }
}
