"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { invalidateTag } from "@/lib/cache-invalidation";
import { getErrorMessage } from "@/lib/actions/utils";
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
  scopeId?: number,
) {
  const config = ORDERABLE_TABLES[table];
  if (!config) {
    return { success: false, error: "Invalid table" };
  }

  try {
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
 * Get the last (highest) display_order from a table.
 * Used when creating new items to place them at the end.
 */
export async function getLastDisplayOrder(
  table: OrderableTable,
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

  sql += ` ORDER BY display_order DESC LIMIT 1`;

  const result = await d1.query<{ display_order: string }>(sql, params);
  return result.results[0]?.display_order ?? null;
}

/**
 * Generate the next display_order key for a new item in a table.
 * Places the item at the end of the list.
 */
export async function getNextDisplayOrder(
  table: OrderableTable,
  scopeColumn?: string,
  scopeId?: number,
): Promise<string> {
  const lastKey = await getLastDisplayOrder(table, scopeColumn, scopeId);
  return keyBetween(lastKey, null);
}
