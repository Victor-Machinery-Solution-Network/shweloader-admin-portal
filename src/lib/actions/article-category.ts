"use server";

import { articleCategoryService } from "@/lib/services/article";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";

// ─── Article Category Actions ────────────────────────────────────────────────

export async function createArticleCategory(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    const created_by = await requirePermission("article_categories", "create");
    await articleCategoryService.create({
      name: name.trim(),
      created_by,
    });
    invalidateTag(CACHE_TAGS.ARTICLE_CATEGORIES);
    auditLog(created_by, "created article category | name=" + name.trim());
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create category"),
    };
  }
}

export async function updateArticleCategory(id: number, formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    const userId = await requirePermission("article_categories", "edit");
    await articleCategoryService.update(id, { name: name.trim() });
    invalidateTag(CACHE_TAGS.ARTICLE_CATEGORIES);
    auditLog(userId, "updated article category | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update category"),
    };
  }
}

export async function deleteArticleCategory(id: number) {
  try {
    const deletedBy = await requirePermission("article_categories", "delete");
    await articleCategoryService.softDelete(id, deletedBy);
    await saveTrashMetadata("article_category", id, deletedBy);
    invalidateTag(CACHE_TAGS.ARTICLE_CATEGORIES);
    auditLog(deletedBy, "deleted article category | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete category"),
    };
  }
}

// ─── Linked Count Helpers ────────────────────────────────────────────────────

export async function getArticleCount(
  categoryIds: number[],
): Promise<Record<number, number>> {
  if (categoryIds.length === 0) return {};

  const placeholders = categoryIds.map(() => "?").join(",");
  const result = await d1.query<{ category_id: number; count: number }>(
    `SELECT category_id, COUNT(*) as count FROM article WHERE category_id IN (${placeholders}) AND deleted_at IS NULL GROUP BY category_id`,
    categoryIds,
  );

  const countMap = Object.fromEntries(
    result.results.map((r) => [r.category_id, r.count]),
  );
  return Object.fromEntries(
    categoryIds.map((id) => [id, countMap[id] ?? 0]),
  );
}

// ─── Bulk Delete ─────────────────────────────────────────────────────────────

export async function deleteArticleCategories(ids: number[]) {
  const deletedBy = await requirePermission("article_categories", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await articleCategoryService.softDelete(id, deletedBy);
      await saveTrashMetadata("article_category", id, deletedBy);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete category ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.ARTICLE_CATEGORIES);
  auditLog(deletedBy, "bulk deleted article categories | count=" + deleted);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
