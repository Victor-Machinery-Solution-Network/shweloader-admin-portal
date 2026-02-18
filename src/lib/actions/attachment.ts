"use server";

import { attachmentCategoryService } from "@/lib/services/attachment";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { getNextDisplayOrder } from "@/lib/actions/reorder";

// ─── Attachment Category Actions ─────────────────────────────────────────────

export async function createAttachmentCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const image_url = (formData.get("image_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    const [created_by, display_order] = await Promise.all([
      getCurrentUserId(),
      getNextDisplayOrder("attachment_category"),
    ]);
    await attachmentCategoryService.create({
      name: name.trim(),
      image_url,
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
  const image_url = (formData.get("image_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    await attachmentCategoryService.update(id, {
      name: name.trim(),
      image_url,
    });
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
    await attachmentCategoryService.delete(id);
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
  const results = await Promise.allSettled(
    ids.map((id) => attachmentCategoryService.delete(id)),
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
      `SELECT category_id, COUNT(*) as count FROM attachment_model WHERE category_id IN (${placeholders}) GROUP BY category_id`,
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

