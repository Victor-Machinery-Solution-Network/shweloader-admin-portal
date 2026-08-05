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

/**
 * Listing mix by subcategory — feeds the two donuts on Overview.
 *
 * Same scope as the KPI cards above (approved + not deleted), so each donut's
 * centre total equals the "Total Sale/Rent Units" card. Attachment listings have
 * no subcategory of their own, so they fall back to their attachment category.
 */
export interface MixSlice {
  name: string;
  sale: number;
  rent: number;
}
export interface ListingMix {
  slices: MixSlice[];
  saleTotal: number;
  rentTotal: number;
}

// ponytail: top 5 by volume, the tail bucketed into a grey "Other". Dev already
// has 19 subcategories over 30 listings — past ~6 slices the small ones are
// unhoverable slivers and the hues stop being tellable apart. Both charts share
// one slice list so a subcategory keeps its colour across them.
const TOP_N = 5;
const OTHER = "Other";

const mixQuery = (table: string, alias: string, kind: string) => `
  SELECT '${kind}' AS kind, COALESCE(esc.name, ac.name, 'Uncategorised') AS name, COUNT(*) AS total
  FROM ${table} ${alias}
  JOIN product_list pl ON pl.id = ${alias}.product_list_id
  LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
  LEFT JOIN equipment_sub_category esc ON esc.sub_category_id = em.sub_category_id
  LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
  LEFT JOIN attachment_category ac ON ac.category_id = am.category_id
  WHERE ${scope(alias)}
  GROUP BY 2`;

export async function getListingMix(): Promise<ListingMix> {
  await requirePermission("dashboard", "read");

  const { results } = await d1.query<{
    kind: string;
    name: string;
    total: number;
  }>(
    `${mixQuery("sale_listing", "sl", "sale")}
     UNION ALL
     ${mixQuery("rent_listing", "rl", "rent")}`,
  );

  const byName = new Map<string, MixSlice>();
  for (const row of results) {
    const slice = byName.get(row.name) ?? { name: row.name, sale: 0, rent: 0 };
    slice[row.kind === "sale" ? "sale" : "rent"] += Number(row.total);
    byName.set(row.name, slice);
  }

  // Rank by the bigger of the two, not the sum: on the sale donut a subcategory
  // must never lose its slice to one with fewer sale listings just because that
  // one also rents.
  const rank = (s: MixSlice) => Math.max(s.sale, s.rent);
  const ranked = [...byName.values()].sort(
    (a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name),
  );
  const top = ranked.slice(0, TOP_N);
  const rest = ranked.slice(TOP_N);
  if (rest.length) {
    top.push({
      name: OTHER,
      sale: rest.reduce((t, s) => t + s.sale, 0),
      rent: rest.reduce((t, s) => t + s.rent, 0),
    });
  }

  return {
    slices: top,
    saleTotal: ranked.reduce((t, s) => t + s.sale, 0),
    rentTotal: ranked.reduce((t, s) => t + s.rent, 0),
  };
}
