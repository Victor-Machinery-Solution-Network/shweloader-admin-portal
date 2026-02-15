"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";

// ─── Data Fetching ──────────────────────────────────────────────────────────

/** Get all enquiries with customer and listing details */
export async function getEnquiriesWithDetails(): Promise<
  EnquiryWithDetails[]
> {
  const result = await d1.query<EnquiryWithDetails>(
    `SELECT
       e.id,
       e.sale_listing_id,
       e.rent_listing_id,
       e.customer_id,
       e.message,
       e.enquiry_status_id,
       e.created_at,
       e.updated_at,
       e.updated_by,
       est.status_name,
       c.username AS customer_name,
       c.email AS customer_email,
       c.phone AS customer_phone,
       c.company_name AS customer_company,
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
       END AS listing_type
     FROM enquiry e
     LEFT JOIN enquiry_status_type est ON e.enquiry_status_id = est.id
     LEFT JOIN customer c ON e.customer_id = c.customer_id
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

/** Update enquiry status */
export async function updateEnquiryStatus(
  enquiryId: number,
  statusId: number,
) {
  try {
    const updatedBy = await getCurrentUserId();

    await d1.query(
      `UPDATE enquiry
       SET enquiry_status_id = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [statusId, updatedBy, enquiryId],
    );

    invalidateTag(CACHE_TAGS.ENQUIRIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update enquiry status"),
    };
  }
}

/** Delete a single enquiry */
export async function deleteEnquiry(enquiryId: number) {
  try {
    await d1.query("DELETE FROM enquiry WHERE id = ?", [enquiryId]);
    invalidateTag(CACHE_TAGS.ENQUIRIES);
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

  try {
    const placeholders = ids.map(() => "?").join(",");
    await d1.query(
      `DELETE FROM enquiry WHERE id IN (${placeholders})`,
      ids,
    );
    invalidateTag(CACHE_TAGS.ENQUIRIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete enquiries"),
    };
  }
}
