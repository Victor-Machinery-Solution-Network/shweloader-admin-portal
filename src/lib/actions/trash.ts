"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import {
  getErrorMessage,
  requirePermission,
  assertBulkLimit,
} from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { auditLog } from "@/lib/actions/audit";
import { deleteFile } from "@/lib/actions/upload-helpers";
import { ENTITY_REGISTRY, getNameColumn } from "@/lib/trash/entity-registry";
import type {
  TrashItem,
  TrashCounts,
  TrashEntityType,
  TrashGroup,
} from "@/types/trash";

const TRASH_RETENTION_DAYS = 30;

// ─── Save Trash Metadata ──────────────────────────────────────────────────────

/**
 * Record trash metadata when an item is soft-deleted.
 * Called from delete actions AFTER softDelete() so the row still exists.
 *
 * @param entityType - Registry key (e.g. "brand", "article")
 * @param entityId   - Primary key value of the soft-deleted row
 * @param deletedBy  - admin_user.user_id who performed the delete
 * @param options    - Optional batch_id for cascading deletes
 */
export async function saveTrashMetadata(
  entityType: TrashEntityType,
  entityId: number,
  deletedBy: number,
  options?: {
    batchId?: string;
    relatedData?: Record<string, unknown>;
  },
) {
  const config = ENTITY_REGISTRY[entityType];
  const nameCol = getNameColumn(entityType);

  // Read entity name + file keys from the (now soft-deleted) source row
  const cols = [nameCol, ...config.fileColumns];
  const result = await d1.query<Record<string, unknown>>(
    `SELECT ${cols.join(", ")} FROM ${config.table} WHERE ${config.primaryKey} = ? LIMIT 1`,
    [entityId],
  );

  const row = result.results[0];
  let entityName = row
    ? String(row[nameCol] ?? `${config.displayName} #${entityId}`)
    : `${config.displayName} #${entityId}`;

  // sale_listing / rent_listing: compose the displayed custom_id from product_list
  if (entityType === "sale_listing" || entityType === "rent_listing") {
    const composed = await d1.query<{ custom_id: string }>(
      `SELECT (
         CASE
           WHEN sl.id IS NOT NULL AND rl.id IS NOT NULL THEN 'B'
           WHEN sl.id IS NOT NULL THEN 'S'
           ELSE 'R'
         END
         || 'L' ||
         CASE WHEN pl.equipment_model_id IS NOT NULL THEN 'E' ELSE 'A' END
         || '-' || pl.custom_id_suffix
       ) AS custom_id
       FROM product_list pl
       LEFT JOIN sale_listing sl ON sl.product_list_id = pl.id
       LEFT JOIN rent_listing rl ON rl.product_list_id = pl.id
       WHERE pl.id = ?
       LIMIT 1`,
      [Number(row?.product_list_id ?? 0)],
    );
    const composedId = composed.results[0]?.custom_id;
    if (composedId) entityName = composedId;
  }

  // Collect R2 file keys for cleanup on permanent delete
  const fileKeys: string[] = [];
  if (row) {
    for (const col of config.fileColumns) {
      const val = row[col];
      if (typeof val === "string" && val.length > 0) {
        fileKeys.push(val);
      }
    }
  }

  // For product_list, also capture product_image R2 keys
  if (entityType === "product_list") {
    const images = await d1.query<{ url: string }>(
      `SELECT url FROM product_image WHERE product_list_id = ?`,
      [entityId],
    );
    for (const img of images.results) {
      if (img.url) fileKeys.push(img.url);
    }
  }

  // For popup_promotion, the linked image lives in a SEPARATE `image` table
  // (1:1 via image_id with ON DELETE RESTRICT). Capture both the R2 keys
  // (so the file gets cleaned up on permanent delete) and the image_id
  // (so doPermanentDelete can DELETE the orphaned image row).
  // The base SELECT above doesn't include image_id (it only fetches the
  // name column + config.fileColumns), so do a dedicated lookup here.
  const relatedData: Record<string, unknown> = { ...(options?.relatedData ?? {}) };
  if (entityType === "popup_promotion") {
    const ppRow = await d1.query<{
      image_id: number | null;
      image_url: string | null;
      thumb_url: string | null;
    }>(
      `SELECT pp.image_id, i.image_url, i.thumb_url
         FROM popup_promotion pp
         LEFT JOIN image i ON i.image_id = pp.image_id
        WHERE pp.popup_promotion_id = ?
        LIMIT 1`,
      [entityId],
    );
    const pp = ppRow.results[0];
    if (pp?.image_url) fileKeys.push(pp.image_url);
    if (pp?.thumb_url) fileKeys.push(pp.thumb_url);
    if (pp?.image_id) relatedData.image_id = pp.image_id;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TRASH_RETENTION_DAYS);

  await d1.query(
    `INSERT INTO trash_metadata
       (entity_type, entity_id, entity_table, entity_name, file_keys, related_data, batch_id, deleted_by, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entityType,
      entityId,
      config.table,
      entityName.slice(0, 200),
      fileKeys.length > 0 ? JSON.stringify(fileKeys) : null,
      Object.keys(relatedData).length > 0 ? JSON.stringify(relatedData) : null,
      options?.batchId ?? null,
      deletedBy,
      expiresAt.toISOString(),
    ],
  );

  // Invalidate trash cache so the Trash page picks up the new item
  invalidateTag(CACHE_TAGS.TRASH);
}

// ─── Fetch Trash Page Data ────────────────────────────────────────────────────

interface TrashPageRaw {
  items: string;
  counts: string;
}

/**
 * Fetch all data for the Trash page in a single D1 query.
 * Returns items + counts for PPR page.
 * No auth check — PermissionGate guards the page component.
 */
export async function getTrashPageData(group?: TrashGroup) {

  // Build entity-type filter for group
  let typeFilter = "";
  const typeParams: string[] = [];
  if (group && group !== "all") {
    const types = Object.entries(ENTITY_REGISTRY)
      .filter(([, config]) => config.group === group)
      .map(([type]) => type);
    if (types.length === 0) return { items: [] as TrashItem[], counts: {} as TrashCounts };
    const placeholders = types.map(() => "?").join(", ");
    typeFilter = `AND tm.entity_type IN (${placeholders})`;
    typeParams.push(...types);
  }

  // Build a WHERE clause that verifies the source row is still soft-deleted.
  // For each entity type: (entity_type = 'x' AND EXISTS(SELECT 1 FROM table WHERE pk = entity_id AND deleted_at IS NOT NULL))
  const softDeleteCheck = Object.entries(ENTITY_REGISTRY)
    .map(
      ([type, config]) =>
        `(tm.entity_type = '${type}' AND EXISTS (SELECT 1 FROM ${config.table} WHERE ${config.primaryKey} = tm.entity_id AND deleted_at IS NOT NULL))`,
    )
    .join("\n        OR ");

  // Single consolidated query
  const { results } = await d1.query<TrashPageRaw>(`
    SELECT
      (SELECT json_group_array(json_object(
        'id', t.id,
        'entity_type', t.entity_type,
        'entity_id', t.entity_id,
        'entity_name', t.entity_name,
        'deleted_at', t.deleted_at,
        'expires_at', t.expires_at,
        'batch_id', t.batch_id,
        'has_files', CASE WHEN t.file_keys IS NOT NULL THEN 1 ELSE 0 END,
        'deleted_by_name', t.deleted_by_name
      )) FROM (
        SELECT tm.*, au.username AS deleted_by_name
        FROM trash_metadata tm
        LEFT JOIN admin_user au ON tm.deleted_by = au.user_id
        WHERE (${softDeleteCheck})
        ${typeFilter}
        ORDER BY tm.deleted_at DESC
      ) t
      ) AS items,

      (SELECT json_group_array(json_object(
        'entity_type', entity_type,
        'count', cnt
      )) FROM (
        SELECT tm.entity_type, COUNT(*) as cnt
        FROM trash_metadata tm
        WHERE (${softDeleteCheck})
        GROUP BY tm.entity_type
      )) AS counts
  `, typeParams);

  const raw = results[0];

  // Parse items — SQLite returns 0/1 for has_files, convert to boolean
  interface RawTrashItem {
    id: number;
    entity_type: TrashEntityType;
    entity_id: number;
    entity_name: string;
    deleted_at: string;
    expires_at: string;
    batch_id: string | null;
    has_files: number;
    deleted_by_name: string | null;
  }
  const parsedItems: (RawTrashItem | null)[] = raw?.items
    ? JSON.parse(raw.items)
    : [];
  // json_group_array returns [null] for empty results — filter nulls
  const rawItems = parsedItems.filter((r): r is RawTrashItem => r !== null);
  const items: TrashItem[] = rawItems.map((r) => ({
    id: r.id,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    entity_name: r.entity_name,
    deleted_at: r.deleted_at,
    expires_at: r.expires_at,
    batch_id: r.batch_id,
    deleted_by_name: r.deleted_by_name,
    has_files: r.has_files === 1,
  }));

  // Parse counts
  const parsedCounts: ({ entity_type: TrashEntityType; count: number } | null)[] = raw?.counts
    ? JSON.parse(raw.counts)
    : [];
  // json_group_array returns [null] for empty results — filter nulls
  const rawCounts = parsedCounts.filter((r): r is { entity_type: TrashEntityType; count: number } => r !== null);
  const counts: TrashCounts = {};
  for (const row of rawCounts) {
    counts[row.entity_type] = row.count;
  }

  return { items, counts };
}

// ─── Restore ──────────────────────────────────────────────────────────────────

/**
 * Internal restore logic (no permission check).
 * Restores the source row and cleans up trash_metadata.
 */
async function doRestore(entityType: TrashEntityType, entityId: number) {
  const config = ENTITY_REGISTRY[entityType];

  // Restore the source row
  await d1.query(
    `UPDATE ${config.table}
     SET deleted_at = NULL, deleted_by = NULL
     WHERE ${config.primaryKey} = ?`,
    [entityId],
  );

  // For sale/rent listings, also restore the parent product_list — but ONLY
  // if it was deleted in the same batch (i.e. cascade-deleted alongside the
  // listing). If the product_list was independently deleted, leave it alone.
  if (entityType === "sale_listing" || entityType === "rent_listing") {
    const listing = await d1.query<{ product_list_id: number }>(
      `SELECT product_list_id FROM ${config.table} WHERE ${config.primaryKey} = ? LIMIT 1`,
      [entityId],
    );
    const plId = listing.results[0]?.product_list_id;
    if (plId) {
      // Check if both the listing and product_list share the same batch_id
      const batchCheck = await d1.query<{ batch_id: string }>(
        `SELECT batch_id FROM trash_metadata WHERE entity_type = ? AND entity_id = ? LIMIT 1`,
        [entityType, entityId],
      );
      const listingBatchId = batchCheck.results[0]?.batch_id;

      if (listingBatchId) {
        // Only restore product_list if it was deleted in the same batch
        const plTrash = await d1.query<{ id: number }>(
          `SELECT id FROM trash_metadata WHERE entity_type = 'product_list' AND entity_id = ? AND batch_id = ? LIMIT 1`,
          [plId, listingBatchId],
        );
        if (plTrash.results.length > 0) {
          await d1.query(
            `UPDATE product_list SET deleted_at = NULL, deleted_by = NULL WHERE id = ? AND deleted_at IS NOT NULL`,
            [plId],
          );
          await d1.query(
            `DELETE FROM trash_metadata WHERE entity_type = 'product_list' AND entity_id = ?`,
            [plId],
          );
        }
      }
    }
  }

  // Clean up trash_metadata for this item
  await d1.query(
    `DELETE FROM trash_metadata WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId],
  );

  // Invalidate caches
  invalidateTag(CACHE_TAGS.TRASH, ...config.cacheTags);
}

export async function restoreItem(entityType: TrashEntityType, entityId: number) {
  try {
    const userId = await requirePermission("trash", "restore");
    await doRestore(entityType, entityId);
    auditLog(userId, "restored trash item | type=" + entityType + " | id=" + entityId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to restore item"),
    };
  }
}

export async function restoreItems(
  items: { entityType: TrashEntityType; entityId: number }[],
) {
  try {
    const userId = await requirePermission("trash", "restore");
    assertBulkLimit(items);

    const results = await Promise.allSettled(
      items.map((item) => doRestore(item.entityType, item.entityId)),
    );

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => getErrorMessage(r.reason, "Failed to restore item"));
    const restored = results.filter((r) => r.status === "fulfilled").length;

    auditLog(userId, "bulk restored trash items | count=" + restored);

    if (errors.length > 0) {
      return {
        success: false,
        error: `Restored ${restored} of ${items.length}. ${errors[0]}`,
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to restore items"),
    };
  }
}

// ─── Permanent Delete ─────────────────────────────────────────────────────────

/**
 * Internal permanent-delete logic (no permission check).
 * Hard-deletes the source row, cleans up R2 files, removes trash_metadata.
 */
async function doPermanentDelete(entityType: TrashEntityType, entityId: number) {
  const config = ENTITY_REGISTRY[entityType];

  // Get file keys + related_data from trash_metadata for R2 + DB cleanup
  const meta = await d1.query<{
    file_keys: string | null;
    related_data: string | null;
  }>(
    `SELECT file_keys, related_data FROM trash_metadata WHERE entity_type = ? AND entity_id = ? LIMIT 1`,
    [entityType, entityId],
  );
  const fileKeys: string[] = meta.results[0]?.file_keys
    ? JSON.parse(meta.results[0].file_keys)
    : [];
  const relatedData: Record<string, unknown> = meta.results[0]?.related_data
    ? JSON.parse(meta.results[0].related_data)
    : {};

  // For product_list, also delete child rows (product_image, sale_listing, rent_listing)
  if (entityType === "product_list") {
    // Collect child IDs BEFORE deleting (needed for trash_metadata cleanup)
    const [childSale, childRent] = await Promise.all([
      d1.query<{ id: number }>(
        `SELECT id FROM sale_listing WHERE product_list_id = ?`,
        [entityId],
      ),
      d1.query<{ id: number }>(
        `SELECT id FROM rent_listing WHERE product_list_id = ?`,
        [entityId],
      ),
    ]);
    const childIds = [
      ...childSale.results.map((r) => r.id),
      ...childRent.results.map((r) => r.id),
    ];

    // Delete product images (already captured in file_keys via saveTrashMetadata)
    await d1.query(
      `DELETE FROM product_image WHERE product_list_id = ?`,
      [entityId],
    );
    // Hard-delete child listings
    await d1.query(
      `DELETE FROM sale_listing WHERE product_list_id = ?`,
      [entityId],
    );
    await d1.query(
      `DELETE FROM rent_listing WHERE product_list_id = ?`,
      [entityId],
    );
    // Clean up child trash_metadata using pre-collected IDs
    if (childIds.length > 0) {
      const placeholders = childIds.map(() => "?").join(", ");
      await d1.query(
        `DELETE FROM trash_metadata
         WHERE entity_type IN ('sale_listing', 'rent_listing')
           AND entity_id IN (${placeholders})`,
        childIds,
      );
    }
  }

  // Hard DELETE the source row
  await d1.query(
    `DELETE FROM ${config.table} WHERE ${config.primaryKey} = ?`,
    [entityId],
  );

  // For popup_promotion, also delete the orphaned `image` row.
  // The FK image_id → image(image_id) is ON DELETE RESTRICT, so this MUST
  // happen AFTER the popup_promotion row is gone. Without this, the image
  // table accumulates dead rows pointing at now-deleted R2 keys.
  if (entityType === "popup_promotion" && typeof relatedData.image_id === "number") {
    await d1.query("DELETE FROM image WHERE image_id = ?", [relatedData.image_id]);
  }

  // Clean up trash_metadata
  await d1.query(
    `DELETE FROM trash_metadata WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId],
  );

  // R2 file cleanup (non-blocking — best effort)
  for (const key of fileKeys) {
    deleteFile(key).catch(() => {});
  }

  invalidateTag(CACHE_TAGS.TRASH, ...config.cacheTags);
}

export async function permanentDeleteItem(
  entityType: TrashEntityType,
  entityId: number,
) {
  try {
    const userId = await requirePermission("trash", "delete");
    await doPermanentDelete(entityType, entityId);
    auditLog(userId, "permanently deleted item | type=" + entityType + " | id=" + entityId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to permanently delete item"),
    };
  }
}

export async function permanentDeleteItems(
  items: { entityType: TrashEntityType; entityId: number }[],
) {
  try {
    const userId = await requirePermission("trash", "delete");
    assertBulkLimit(items);

    const results = await Promise.allSettled(
      items.map((item) => doPermanentDelete(item.entityType, item.entityId)),
    );

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => getErrorMessage(r.reason, "Failed to delete"));
    const deleted = results.filter((r) => r.status === "fulfilled").length;

    auditLog(userId, "bulk permanently deleted items | count=" + deleted);

    if (errors.length > 0) {
      return {
        success: false,
        error: `Deleted ${deleted} of ${items.length}. ${errors[0]}`,
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to permanently delete items"),
    };
  }
}

// ─── Empty Trash ──────────────────────────────────────────────────────────────

export async function emptyTrash(group?: TrashGroup) {
  try {
    const userId = await requirePermission("trash", "delete");

    // Only purge rows whose source row is STILL soft-deleted. Without this,
    // a row that was restored (deleted_at = NULL) but whose trash_metadata
    // entry hadn't been cleaned up would get hard-deleted — killing a live
    // row racing against restore. Same pattern used in getTrashPageData.
    const softDeleteCheck = Object.entries(ENTITY_REGISTRY)
      .map(
        ([type, config]) =>
          `(tm.entity_type = '${type}' AND EXISTS (SELECT 1 FROM ${config.table} WHERE ${config.primaryKey} = tm.entity_id AND deleted_at IS NOT NULL))`,
      )
      .join("\n        OR ");

    let sql = `SELECT tm.entity_type, tm.entity_id FROM trash_metadata tm WHERE (${softDeleteCheck})`;
    const params: string[] = [];

    if (group && group !== "all") {
      const types = Object.entries(ENTITY_REGISTRY)
        .filter(([, config]) => config.group === group)
        .map(([type]) => type);
      if (types.length === 0) return { success: true };
      const placeholders = types.map(() => "?").join(", ");
      sql += ` AND tm.entity_type IN (${placeholders})`;
      params.push(...types);
    }

    const allItems = await d1.query<{
      entity_type: TrashEntityType;
      entity_id: number;
    }>(sql, params);

    if (allItems.results.length === 0) return { success: true };

    // Permanent delete each item (product_list entries first so they cascade)
    const productLists = allItems.results.filter((i) => i.entity_type === "product_list");
    const rest = allItems.results.filter((i) => i.entity_type !== "product_list");

    // Delete product_lists first (they cascade to sale/rent listings)
    const plResults = await Promise.allSettled(
      productLists.map((item) => doPermanentDelete(item.entity_type, item.entity_id)),
    );

    // Delete remaining items
    const restResults = await Promise.allSettled(
      rest.map((item) => doPermanentDelete(item.entity_type, item.entity_id)),
    );

    const deleted = [...plResults, ...restResults].filter((r) => r.status === "fulfilled").length;
    const failed = allItems.results.length - deleted;

    auditLog(userId, "emptied trash" + (group && group !== "all" ? " | group=" + group : ""));

    if (failed > 0) {
      return {
        success: false,
        error: `Deleted ${deleted} of ${allItems.results.length} items. ${failed} failed.`,
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to empty trash"),
    };
  }
}

// ─── Purge Expired (called by cron job) ───────────────────────────────────────

/**
 * Permanently delete all items past their expiry date.
 * Called by the /api/cron/purge-trash route handler.
 * Does NOT require RBAC — caller must verify cron secret.
 */
export async function purgeExpiredTrash(): Promise<{ deleted: number; errors: number }> {
  // Cap each invocation so a backlogged DB doesn't push the Vercel function
  // past its timeout (leaving us in an inconsistent partial state). The next
  // daily cron picks up the remainder.
  const PURGE_BATCH_LIMIT = 200;

  // Verify the source row is STILL soft-deleted before purging. Without this,
  // a row that was restored (deleted_at = NULL) but whose trash_metadata
  // entry hadn't been cleaned up would get hard-deleted by the cron. Same
  // guard as emptyTrash.
  const softDeleteCheck = Object.entries(ENTITY_REGISTRY)
    .map(
      ([type, config]) =>
        `(tm.entity_type = '${type}' AND EXISTS (SELECT 1 FROM ${config.table} WHERE ${config.primaryKey} = tm.entity_id AND deleted_at IS NOT NULL))`,
    )
    .join("\n        OR ");

  const expired = await d1.query<{
    entity_type: TrashEntityType;
    entity_id: number;
  }>(
    `SELECT tm.entity_type, tm.entity_id
       FROM trash_metadata tm
      WHERE tm.expires_at <= ?
        AND (${softDeleteCheck})
      LIMIT ?`,
    [new Date().toISOString(), PURGE_BATCH_LIMIT],
  );

  if (expired.results.length === 0) return { deleted: 0, errors: 0 };

  // Delete product_lists first (they cascade)
  const productLists = expired.results.filter((i) => i.entity_type === "product_list");
  const rest = expired.results.filter((i) => i.entity_type !== "product_list");

  let deleted = 0;
  let errors = 0;

  for (const item of productLists) {
    try {
      await doPermanentDelete(item.entity_type, item.entity_id);
      deleted++;
    } catch {
      errors++;
    }
  }

  for (const item of rest) {
    try {
      await doPermanentDelete(item.entity_type, item.entity_id);
      deleted++;
    } catch {
      errors++;
    }
  }

  return { deleted, errors };
}
