"use server";

import { d1 } from "@/lib/api/d1-client";
import { requirePermission } from "@/lib/actions/utils";

/**
 * Overview dashboard stats. Definitions agreed with stakeholders (2026-07-02):
 *
 * - Listing scope = approved + not deleted (hidden and sold-out INCLUDED —
 *   these are "total catalog" numbers, not "live on site" numbers).
 * - Unit quantity = listing count (1 row = 1 machine; no quantity column).
 * - Product enquiries = chat_enquiry rows — the table is already UNIQUE per
 *   chat_session × listing, which matches "same product in one chat counts
 *   once, different products count separately".
 * - User enquiries = chat_session count.
 * - Partners = APPROVED partners only (15 of 18 rows on dev are pending
 *   applications — counting those would inflate the number). The live table
 *   has applied_at/reviewed_at, not created_at, so the monthly delta uses
 *   reviewed_at (when the partner was approved).
 * - monthly* = added since the 1st of the CURRENT calendar month (month-to-
 *   date, per stakeholder — not a rolling 30 days).
 */
export interface OverviewStats {
  saleValueMmk: number;
  saleValueUsd: number;
  monthlySaleValueMmk: number;
  users: number;
  monthlyUsers: number;
  partners: number;
  monthlyPartners: number;
  saleUnits: number;
  monthlySaleUnits: number;
  rentUnits: number;
  monthlyRentUnits: number;
  productEnquiries: number;
  monthlyProductEnquiries: number;
  userEnquiries: number;
  monthlyUserEnquiries: number;
}

const APPROVED =
  "(SELECT id FROM approval_status_type WHERE status_name = 'Approved')";

/** Approved + not-deleted scope for a listing table alias. */
const scope = (t: string) =>
  `${t}.deleted_at IS NULL AND ${t}.approve_status_id = ${APPROVED}`;

export async function getOverviewStats(): Promise<OverviewStats> {
  await requirePermission("dashboard", "read");

  // First day of the current calendar month, UTC (D1 timestamps are UTC).
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01 00:00:00`;

  // One round-trip: every metric is a scalar subselect. All are COUNT/SUM over
  // indexed or small tables — cheap even on the free-plan rows_read budget.
  const { results } = await d1.query<Record<string, number | null>>(
    `SELECT
      (SELECT IFNULL(SUM(sl.mmk_price), 0) FROM sale_listing sl WHERE ${scope("sl")}) AS sale_value_mmk,
      (SELECT IFNULL(SUM(sl.usd_price), 0) FROM sale_listing sl WHERE ${scope("sl")}) AS sale_value_usd,
      (SELECT IFNULL(SUM(sl.mmk_price), 0) FROM sale_listing sl WHERE ${scope("sl")} AND sl.created_at >= ?1) AS monthly_sale_value_mmk,
      (SELECT COUNT(*) FROM sale_listing sl WHERE ${scope("sl")}) AS sale_units,
      (SELECT COUNT(*) FROM sale_listing sl WHERE ${scope("sl")} AND sl.created_at >= ?1) AS monthly_sale_units,
      (SELECT COUNT(*) FROM rent_listing rl WHERE ${scope("rl")}) AS rent_units,
      (SELECT COUNT(*) FROM rent_listing rl WHERE ${scope("rl")} AND rl.created_at >= ?1) AS monthly_rent_units,
      (SELECT COUNT(*) FROM app_user WHERE deleted_at IS NULL) AS users,
      (SELECT COUNT(*) FROM app_user WHERE deleted_at IS NULL AND created_at >= ?1) AS monthly_users,
      (SELECT COUNT(*) FROM partner WHERE deleted_at IS NULL AND status_id = (SELECT id FROM partner_status_type WHERE status_name = 'Approved')) AS partners,
      (SELECT COUNT(*) FROM partner WHERE deleted_at IS NULL AND status_id = (SELECT id FROM partner_status_type WHERE status_name = 'Approved') AND reviewed_at >= ?1) AS monthly_partners,
      (SELECT COUNT(*) FROM chat_enquiry) AS product_enquiries,
      (SELECT COUNT(*) FROM chat_enquiry WHERE enquired_at >= ?1) AS monthly_product_enquiries,
      (SELECT COUNT(*) FROM chat_session) AS user_enquiries,
      (SELECT COUNT(*) FROM chat_session WHERE created_at >= ?1) AS monthly_user_enquiries`,
    [monthStart],
  );

  const r = results[0] ?? {};
  const n = (key: string) => Number(r[key] ?? 0);

  return {
    saleValueMmk: n("sale_value_mmk"),
    saleValueUsd: n("sale_value_usd"),
    monthlySaleValueMmk: n("monthly_sale_value_mmk"),
    users: n("users"),
    monthlyUsers: n("monthly_users"),
    partners: n("partners"),
    monthlyPartners: n("monthly_partners"),
    saleUnits: n("sale_units"),
    monthlySaleUnits: n("monthly_sale_units"),
    rentUnits: n("rent_units"),
    monthlyRentUnits: n("monthly_rent_units"),
    productEnquiries: n("product_enquiries"),
    monthlyProductEnquiries: n("monthly_product_enquiries"),
    userEnquiries: n("user_enquiries"),
    monthlyUserEnquiries: n("monthly_user_enquiries"),
  };
}
