"use server";

import { attachmentCategoryService } from "@/lib/services/attachment";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { getNextDisplayOrder } from "@/lib/actions/reorder";
import { processFileField, cleanupOldFile } from "@/lib/actions/upload-helpers";
import { saveTrashMetadata } from "@/lib/actions/trash";

// ─── Attachment Category Actions ─────────────────────────────────────────────

export async function createAttachmentCategory(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    const image_url = await processFileField(
      formData, "image_url", "categories/attachments/", name.trim(),
    );
    const [created_by, display_order] = await Promise.all([
      requirePermission("attachment_categories", "create"),
      getNextDisplayOrder("attachment_category"),
    ]);
    const focal_x = parseFloat(formData.get("focal_x") as string) || 0.5;
    const focal_y = parseFloat(formData.get("focal_y") as string) || 0.5;
    await attachmentCategoryService.create({
      name: name.trim(),
      image_url,
      focal_x,
      focal_y,
      created_by,
      display_order,
    });
    invalidateTag(CACHE_TAGS.ATTACHMENT_CATEGORIES);
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

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    await requirePermission("attachment_categories", "edit");
    const existing = await attachmentCategoryService.getById(id);
    const image_url = await processFileField(
      formData, "image_url", "categories/attachments/", name.trim(), existing?.image_url,
    );
    const focal_x = parseFloat(formData.get("focal_x") as string) || 0.5;
    const focal_y = parseFloat(formData.get("focal_y") as string) || 0.5;
    await attachmentCategoryService.update(id, {
      name: name.trim(),
      image_url,
      focal_x,
      focal_y,
    });
    await cleanupOldFile(existing?.image_url, image_url);
    invalidateTag(CACHE_TAGS.ATTACHMENT_CATEGORIES);
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
    saveTrashMetadata("attachment_category", id, deletedBy).catch(() => {});
    invalidateTag(CACHE_TAGS.ATTACHMENT_CATEGORIES);
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
      saveTrashMetadata("attachment_category", id, deletedBy).catch(() => {});
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

      (SELECT json_group_array(json_object(
        'brand_id', b.brand_id, 'name', b.name,
        'created_by', b.created_by, 'created_at', b.created_at,
        'updated_at', b.updated_at
      )) FROM (SELECT * FROM product_brand WHERE deleted_at IS NULL ORDER BY name) b
      ) AS brands,

      (SELECT json_group_array(json_object(
        'category_id', acb.category_id, 'brand_id', acb.brand_id
      )) FROM attachment_category_brand acb
      ) AS category_brand_links
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

  return {
    models,
    categories,
    brands,
    categoryBrandLinks: raw?.category_brand_links ? JSON.parse(raw.category_brand_links) : [],
  };
}

