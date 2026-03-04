"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { invalidateTag } from "@/lib/cache-invalidation";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { keyBetween, nKeysBetween } from "@/lib/utils/display-order";

type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Whitelist of tables that support display_order reordering.
 * Only tables in this map can be reordered (prevents SQL injection).
 */
const ORDERABLE_TABLES = {
  equipment_main_category: {
    pk: "category_id",
    tag: CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES as CacheTag,
  },
  equipment_sub_category: {
    pk: "sub_category_id",
    tag: CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES as CacheTag,
  },
  attachment_category: {
    pk: "category_id",
    tag: CACHE_TAGS.ATTACHMENT_CATEGORIES as CacheTag,
  },
  announcement_text: {
    pk: "announcement_id",
    tag: CACHE_TAGS.ANNOUNCEMENTS as CacheTag,
  },
  carousel_image: {
    pk: "image_id",
    tag: CACHE_TAGS.CAROUSELS as CacheTag,
    scopeColumn: "carousel_id",
  },
  featured_listing: {
    pk: "id",
    tag: CACHE_TAGS.FEATURED_LISTINGS as CacheTag,
  },
  product_image: {
    pk: "image_id",
    tag: CACHE_TAGS.SALE_LISTINGS as CacheTag,
    scopeColumn: "product_list_id",
  },
  sale_listing: {
    pk: "id",
    tag: CACHE_TAGS.SALE_LISTINGS as CacheTag,
    softDelete: true,
  },
  rent_listing: {
    pk: "id",
    tag: CACHE_TAGS.RENT_LISTINGS as CacheTag,
    softDelete: true,
  },
} as const;

export type OrderableTable = keyof typeof ORDERABLE_TABLES;

/**
 * Update a single row's display_order.
 * Uses parameterized queries — no string interpolation of user values.
 */
export async function updateDisplayOrder(
  table: OrderableTable,
  id: number,
  newKey: string,
  feature: string,
  scopeId?: number,
) {
  const config = ORDERABLE_TABLES[table];
  if (!config) {
    return { success: false, error: "Invalid table" };
  }

  try {
    await requirePermission(feature, "edit");
    if (!newKey || !/^[0-9A-Za-z]+$/.test(newKey)) {
      return { success: false, error: "Invalid display order key" };
    }

    const hasScopeColumn = "scopeColumn" in config;

    if (hasScopeColumn && scopeId !== undefined) {
      await d1.query(
        `UPDATE ${table} SET display_order = ? WHERE ${config.pk} = ? AND ${config.scopeColumn} = ?`,
        [newKey, id, scopeId],
      );
    } else {
      await d1.query(
        `UPDATE ${table} SET display_order = ? WHERE ${config.pk} = ?`,
        [newKey, id],
      );
    }

    invalidateTag(config.tag);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update display order"),
    };
  }
}

/** Build WHERE clause + params for optional soft-delete and scope filtering. */
function buildWhereClause(
  config: (typeof ORDERABLE_TABLES)[OrderableTable],
  scopeColumn?: string,
  scopeId?: number,
): { where: string; params: (string | number)[] } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if ("softDelete" in config && config.softDelete) {
    conditions.push("deleted_at IS NULL");
  }
  if (scopeColumn && scopeId !== undefined) {
    conditions.push(`${scopeColumn} = ?`);
    params.push(scopeId);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
}

/** Check if a display_order value is a valid fractional-indexing key */
function isValidFractionalKey(key: string | null): boolean {
  if (!key) return true;
  return /^[a-zA-Z][0-9A-Za-z]*$/.test(key);
}

/**
 * Migrate all rows in a table from legacy integer display_order values
 * to proper fractional-indexing keys. Preserves existing sort order.
 * Only migrates non-deleted rows.
 */
async function migrateLegacyKeys(
  table: OrderableTable,
  scopeColumn?: string,
  scopeId?: number,
): Promise<void> {
  const config = ORDERABLE_TABLES[table];
  if (!config) return;

  const { where, params } = buildWhereClause(config, scopeColumn, scopeId);
  const sql =
    `SELECT ${config.pk} AS id, display_order FROM ${table}` +
    where +
    ` ORDER BY CAST(display_order AS INTEGER) ASC, display_order ASC`;

  const result = await d1.query<{ id: number; display_order: string }>(
    sql,
    params,
  );
  const rows = result.results;
  if (rows.length === 0) return;

  const freshKeys = nKeysBetween(null, null, rows.length);

  await Promise.all(
    rows.map((row, i) =>
      d1.query(`UPDATE ${table} SET display_order = ? WHERE ${config.pk} = ?`, [
        freshKeys[i],
        row.id,
      ]),
    ),
  );
}

/**
 * Get a boundary display_order from a table.
 * @param direction "ASC" for first (lowest), "DESC" for last (highest)
 */
async function getBoundaryDisplayOrder(
  table: OrderableTable,
  direction: "ASC" | "DESC",
  scopeColumn?: string,
  scopeId?: number,
): Promise<string | null> {
  const config = ORDERABLE_TABLES[table];
  if (!config) return null;

  const { where, params } = buildWhereClause(config, scopeColumn, scopeId);
  const sql =
    `SELECT display_order FROM ${table}` +
    where +
    ` ORDER BY display_order ${direction} LIMIT 1`;

  const result = await d1.query<{ display_order: string }>(sql, params);
  return result.results[0]?.display_order ?? null;
}

/**
 * Generate a display_order key that places the item at the TOP of the list.
 * Use for categories, announcements, etc. where newest items should appear first.
 *
 * If the table contains legacy integer display_order values, migrates all rows
 * to fractional-indexing keys first, then generates the new key.
 */
export async function getNextDisplayOrder(
  table: OrderableTable,
  scopeColumn?: string,
  scopeId?: number,
): Promise<string> {
  const firstKey = await getBoundaryDisplayOrder(
    table,
    "ASC",
    scopeColumn,
    scopeId,
  );

  // Valid fractional key → compute directly
  if (isValidFractionalKey(firstKey)) {
    return keyBetween(null, firstKey);
  }

  // Legacy integer keys detected → migrate all rows, then retry
  await migrateLegacyKeys(table, scopeColumn, scopeId);
  const newFirstKey = await getBoundaryDisplayOrder(
    table,
    "ASC",
    scopeColumn,
    scopeId,
  );
  return keyBetween(null, newFirstKey);
}

/**
 * Generate a display_order key that places the item at the END of the list.
 * Use for carousel images, product images, etc. where order is append-based.
 *
 * If the table contains legacy integer display_order values, migrates all rows
 * to fractional-indexing keys first, then generates the new key.
 */
export async function getLastDisplayOrder(
  table: OrderableTable,
  scopeColumn?: string,
  scopeId?: number,
): Promise<string> {
  const lastKey = await getBoundaryDisplayOrder(
    table,
    "DESC",
    scopeColumn,
    scopeId,
  );

  // Valid fractional key → compute directly
  if (isValidFractionalKey(lastKey)) {
    return keyBetween(lastKey, null);
  }

  // Legacy integer keys detected → migrate all rows, then retry
  await migrateLegacyKeys(table, scopeColumn, scopeId);
  const newLastKey = await getBoundaryDisplayOrder(
    table,
    "DESC",
    scopeColumn,
    scopeId,
  );
  return keyBetween(newLastKey, null);
}
