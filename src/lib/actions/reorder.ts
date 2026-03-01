"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { invalidateTag } from "@/lib/cache-invalidation";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { keyBetween } from "@/lib/utils/display-order";

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

  let sql = `SELECT display_order FROM ${table}`;
  const params: (string | number)[] = [];

  if (scopeColumn && scopeId !== undefined) {
    sql += ` WHERE ${scopeColumn} = ?`;
    params.push(scopeId);
  }

  sql += ` ORDER BY display_order ${direction} LIMIT 1`;

  const result = await d1.query<{ display_order: string }>(sql, params);
  return result.results[0]?.display_order ?? null;
}

/**
 * Generate a display_order key that places the item at the TOP of the list.
 * Use for categories, announcements, etc. where newest items should appear first.
 */
export async function getNextDisplayOrder(
  table: OrderableTable,
  scopeColumn?: string,
  scopeId?: number,
): Promise<string> {
  const firstKey = await getBoundaryDisplayOrder(table, "ASC", scopeColumn, scopeId);
  try {
    return keyBetween(null, firstKey);
  } catch {
    // Legacy rows may have plain integer display_order values (e.g. "5")
    // which aren't valid fractional-indexing keys. Start fresh.
    return keyBetween(null, null);
  }
}

/**
 * Generate a display_order key that places the item at the END of the list.
 * Use for carousel images, product images, etc. where order is append-based.
 */
export async function getLastDisplayOrder(
  table: OrderableTable,
  scopeColumn?: string,
  scopeId?: number,
): Promise<string> {
  const lastKey = await getBoundaryDisplayOrder(table, "DESC", scopeColumn, scopeId);
  try {
    return keyBetween(lastKey, null);
  } catch {
    return keyBetween(null, null);
  }
}
