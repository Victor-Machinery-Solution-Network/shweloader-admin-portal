"use server";

import { attachmentCategoryService } from "@/lib/services/attachment";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { getNextDisplayOrder } from "@/lib/actions/reorder";
import { processFileField, cleanupOldFile } from "@/lib/actions/upload-helpers";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";

// ─── Attachment Category ↔ Sub-Category Link Helpers ─────────────────────────

/** Replace the attachment_category_sub_category links for a category */
async function syncAttachmentCategorySubCategories(
  categoryId: number,
  subCategoryIds: number[],
  userId: number | null,
) {
  // Replace the full selection: drop existing links, then insert the current
  // set. INSERT OR IGNORE relies on the UNIQUE(attachment_category_id,
  // sub_category_id) index to dedupe.
  await d1.query(
    "DELETE FROM attachment_category_sub_category WHERE attachment_category_id = ?",
    [categoryId],
  );

  for (const subCategoryId of subCategoryIds) {
    await d1.query(
      "INSERT OR IGNORE INTO attachment_category_sub_category (attachment_category_id, sub_category_id, created_by) VALUES (?, ?, ?)",
      [categoryId, subCategoryId, userId],
    );
  }
}

/**
 * Get ALL attachment category ↔ equipment sub-category links (for the optional
 * "Equipment Subcategory" cascade filter in the listing Model Picker). Mirrors
 * `getAllCategoryBrandLinks`; aliases attachment_category_id → category_id so
 * the shape matches the other link arrays.
 */
export async function getAllCategorySubCategoryLinks(): Promise<
  { category_id: number; sub_category_id: number }[]
> {
  const result = await d1.query<{ category_id: number; sub_category_id: number }>(
    "SELECT attachment_category_id AS category_id, sub_category_id FROM attachment_category_sub_category",
  );
  return result.results;
}

// ─── Attachment Category Actions ─────────────────────────────────────────────

export async function createAttachmentCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const subCategoryIdsRaw = formData.get("subCategoryIds") as string;
  const subCategoryIds = subCategoryIdsRaw
    ? (JSON.parse(subCategoryIdsRaw) as number[])
    : [];

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }
  if (subCategoryIds.length === 0) {
    return { success: false, error: "At least one equipment sub-category is required" };
  }

  try {
    const image_url = await processFileField(
      formData, "image_url", "categories/attachments/", name.trim(),
    );
    const [created_by, display_order] = await Promise.all([
      requirePermission("attachment_categories", "create"),
      getNextDisplayOrder("attachment_category"),
    ]);
    // Use the row returned by create to get the new id — a separate
    // SELECT last_insert_rowid() returns 0 under D1 sessions/replication.
    const created = await attachmentCategoryService.create({
      name: name.trim(),
      image_url,
      created_by,
      display_order,
    });
    const categoryId = (created as unknown as { category_id: number })
      ?.category_id;
    if (categoryId) {
      await syncAttachmentCategorySubCategories(
        categoryId,
        subCategoryIds,
        created_by,
      );
    }
    invalidateTag(CACHE_TAGS.ATTACHMENT_CATEGORIES);
    auditLog(created_by, "created attachment category | name=" + name.trim());
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create category"),
    };
  }
}

export async function updateAttachmentCategory(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const subCategoryIdsRaw = formData.get("subCategoryIds") as string;
  const subCategoryIds = subCategoryIdsRaw
    ? (JSON.parse(subCategoryIdsRaw) as number[])
    : [];

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }
  if (subCategoryIds.length === 0) {
    return { success: false, error: "At least one equipment sub-category is required" };
  }

  try {
    const userId = await requirePermission("attachment_categories", "edit");
    const existing = await attachmentCategoryService.getById(id);
    const image_url = await processFileField(
      formData, "image_url", "categories/attachments/", name.trim(), existing?.image_url,
    );
    await attachmentCategoryService.update(id, {
      name: name.trim(),
      image_url,
    });
    await syncAttachmentCategorySubCategories(id, subCategoryIds, userId);
    await cleanupOldFile(existing?.image_url, image_url);
    invalidateTag(CACHE_TAGS.ATTACHMENT_CATEGORIES);
    auditLog(userId, "updated attachment category | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update category"),
    };
  }
}

export async function deleteAttachmentCategory(id: number) {
  try {
    const deletedBy = await requirePermission("attachment_categories", "delete");
    await attachmentCategoryService.softDelete(id, deletedBy);
    await saveTrashMetadata("attachment_category", id, deletedBy);
    invalidateTag(CACHE_TAGS.ATTACHMENT_CATEGORIES);
    auditLog(deletedBy, "deleted attachment category | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete category"),
    };
  }
}

export async function deleteAttachmentCategories(ids: number[]) {
  const deletedBy = await requirePermission("attachment_categories", "delete");
  assertBulkLimit(ids);

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await attachmentCategoryService.softDelete(id, deletedBy);
      await saveTrashMetadata("attachment_category", id, deletedBy);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete category ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.ATTACHMENT_CATEGORIES);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  auditLog(deletedBy, "bulk deleted attachment categories | count=" + deleted);
  return { success: true };
}

// ─── Linked Count Helpers ─────────────────────────────────────────────────────

export interface AttachmentCategoryLinkedCounts {
  attachmentModels: number;
  brands: number;
  total: number;
}

export async function getAttachmentCategoryLinkedCounts(
  categoryIds: number[],
): Promise<Record<number, AttachmentCategoryLinkedCounts>> {
  if (categoryIds.length === 0) return {};

  const placeholders = categoryIds.map(() => "?").join(",");

  const [modelResults, brandResults] = await Promise.all([
    d1.query<{ category_id: number; count: number }>(
      `SELECT category_id, COUNT(*) as count FROM attachment_model WHERE category_id IN (${placeholders}) AND deleted_at IS NULL GROUP BY category_id`,
      categoryIds,
    ),
    d1.query<{ category_id: number; count: number }>(
      `SELECT category_id, COUNT(*) as count FROM attachment_category_brand WHERE category_id IN (${placeholders}) GROUP BY category_id`,
      categoryIds,
    ),
  ]);

  const modelMap = Object.fromEntries(
    modelResults.results.map((r) => [r.category_id, r.count]),
  );
  const brandMap = Object.fromEntries(
    brandResults.results.map((r) => [r.category_id, r.count]),
  );

  return Object.fromEntries(
    categoryIds.map((id) => {
      const attachmentModels = modelMap[id] ?? 0;
      const brands = brandMap[id] ?? 0;
      return [id, { attachmentModels, brands, total: attachmentModels + brands }];
    }),
  );
}

export async function formatAttachmentCategoryLinkedSummary(
  c: AttachmentCategoryLinkedCounts,
): Promise<string> {
  const parts: string[] = [];
  if (c.attachmentModels > 0) {
    parts.push(
      `${c.attachmentModels} attachment ${c.attachmentModels === 1 ? "model" : "models"}`,
    );
  }
  if (c.brands > 0) {
    parts.push(`${c.brands} ${c.brands === 1 ? "brand" : "brands"}`);
  }
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

// ─── Consolidated Attachment Models Page Query ───────────────────────────────

interface AttachmentModelsPageRaw {
  models: string;
  categories: string;
  brands: string;
  category_brand_links: string;
  sub_categories: string;
  category_sub_category_links: string;
}

/** Fetch all data for the Attachment Models page in a single D1 query */
export async function getAttachmentModelsPageData() {
  const { results } = await d1.query<AttachmentModelsPageRaw>(`
    SELECT
      (SELECT json_group_array(json_object(
        'model_id', am.model_id, 'name', am.name,
        'brand_id', am.brand_id, 'category_id', am.category_id,
        'pdf_url', am.pdf_url, 'created_by', am.created_by,
        'created_at', am.created_at, 'updated_at', am.updated_at
      )) FROM (SELECT * FROM attachment_model WHERE deleted_at IS NULL ORDER BY created_at DESC) am
      ) AS models,

      (SELECT json_group_array(json_object(
        'category_id', ac.category_id, 'name', ac.name,
        'image_url', ac.image_url, 'display_order', ac.display_order,
        'created_by', ac.created_by, 'created_at', ac.created_at
      )) FROM (SELECT * FROM attachment_category WHERE deleted_at IS NULL ORDER BY display_order) ac
      ) AS categories,

      -- Only brand_id + name are consumed on this page (dropdown, table name
      -- lookup, brand filter); skip the other columns to keep the payload small.
      (SELECT json_group_array(json_object(
        'brand_id', b.brand_id, 'name', b.name
      )) FROM (SELECT brand_id, name FROM product_brand WHERE deleted_at IS NULL ORDER BY name) b
      ) AS brands,

      (SELECT json_group_array(json_object(
        'category_id', acb.category_id, 'brand_id', acb.brand_id
      )) FROM attachment_category_brand acb
      ) AS category_brand_links,

      -- Equipment sub-categories + the attachment-category→sub-category tags,
      -- so the models table can offer an "Equipment Subcategory" filter
      -- (model → its category → tagged sub-categories).
      (SELECT json_group_array(json_object(
        'sub_category_id', sc.sub_category_id, 'name', sc.name
      )) FROM (SELECT sub_category_id, name FROM equipment_sub_category WHERE deleted_at IS NULL ORDER BY display_order) sc
      ) AS sub_categories,

      (SELECT json_group_array(json_object(
        'category_id', acsc.attachment_category_id, 'sub_category_id', acsc.sub_category_id
      )) FROM attachment_category_sub_category acsc
      ) AS category_sub_category_links
  `);

  const raw = results[0];

  const models = raw?.models
    ? JSON.parse(raw.models).map((m: Record<string, unknown>) => ({
        ...m,
        deleted_at: null as string | null,
        deleted_by: null as number | null,
      }))
    : [];

  const categories = raw?.categories
    ? JSON.parse(raw.categories).map((c: Record<string, unknown>) => ({
        ...c,
        deleted_at: null as string | null,
        deleted_by: null as number | null,
      }))
    : [];

  const brands = raw?.brands
    ? JSON.parse(raw.brands).map((b: Record<string, unknown>) => ({
        ...b,
        deleted_at: null as string | null,
        deleted_by: null as number | null,
      }))
    : [];

  const subCategories = raw?.sub_categories
    ? (JSON.parse(raw.sub_categories) as { sub_category_id: number; name: string }[])
    : [];

  return {
    models,
    categories,
    brands,
    categoryBrandLinks: raw?.category_brand_links ? JSON.parse(raw.category_brand_links) : [],
    subCategories,
    categorySubCategoryLinks: raw?.category_sub_category_links
      ? (JSON.parse(raw.category_sub_category_links) as {
          category_id: number;
          sub_category_id: number;
        }[])
      : [],
  };
}

// ─── Consolidated Attachment Categories Page Query ───────────────────────────

interface AttachmentCategoryRow {
  category_id: number;
  name: string;
  image_url: string | null;
  display_order: string;
  created_by: number | null;
  created_at: string;
  sub_category_ids: string;
  attachment_model_count: number;
  brand_count: number;
}

interface AttachmentCategoriesPageRaw {
  categories: string;
  sub_categories: string;
}

/** Fetch all data for the Attachment Categories page in a single D1 query */
export async function getAttachmentCategoriesPageData() {
  const { results } = await d1.query<AttachmentCategoriesPageRaw>(`
    SELECT
      (SELECT json_group_array(json_object(
        'category_id', ac.category_id, 'name', ac.name,
        'image_url', ac.image_url, 'display_order', ac.display_order,
        'created_by', ac.created_by, 'created_at', ac.created_at,
        'sub_category_ids', COALESCE(
          (SELECT json_group_array(acsc.sub_category_id)
           FROM attachment_category_sub_category acsc
           WHERE acsc.attachment_category_id = ac.category_id), '[]'),
        'attachment_model_count',
          (SELECT COUNT(*) FROM attachment_model am WHERE am.category_id = ac.category_id AND am.deleted_at IS NULL),
        'brand_count',
          (SELECT COUNT(*) FROM attachment_category_brand acb WHERE acb.category_id = ac.category_id)
      )) FROM (SELECT * FROM attachment_category WHERE deleted_at IS NULL ORDER BY display_order) ac
      ) AS categories,

      (SELECT json_group_array(json_object(
        'sub_category_id', sc.sub_category_id, 'category_id', sc.category_id,
        'name', sc.name, 'image_url', sc.image_url,
        'display_order', sc.display_order, 'created_by', sc.created_by,
        'created_at', sc.created_at
      )) FROM (SELECT * FROM equipment_sub_category WHERE deleted_at IS NULL ORDER BY display_order) sc
      ) AS sub_categories
  `);

  const raw = results[0];
  const catRows: AttachmentCategoryRow[] = raw?.categories
    ? JSON.parse(raw.categories)
    : [];

  const categories = catRows.map((c) => ({
    category_id: c.category_id,
    name: c.name,
    image_url: c.image_url,
    display_order: c.display_order,
    created_by: c.created_by,
    created_at: c.created_at,
    deleted_at: null as string | null,
    deleted_by: null as number | null,
    subCategoryIds:
      typeof c.sub_category_ids === "string"
        ? (JSON.parse(c.sub_category_ids) as number[])
        : c.sub_category_ids,
  }));

  const linkedInfo: Record<number, { total: number; summary: string }> = {};
  for (const c of catRows) {
    const counts: AttachmentCategoryLinkedCounts = {
      attachmentModels: c.attachment_model_count,
      brands: c.brand_count,
      total: c.attachment_model_count + c.brand_count,
    };
    linkedInfo[c.category_id] = {
      total: counts.total,
      summary:
        counts.total > 0
          ? await formatAttachmentCategoryLinkedSummary(counts)
          : "",
    };
  }

  const subCategories = raw?.sub_categories
    ? JSON.parse(raw.sub_categories).map((sc: Record<string, unknown>) => ({
        ...sc,
        deleted_at: null as string | null,
        deleted_by: null as number | null,
      }))
    : [];

  return { categories, subCategories, linkedInfo };
}

