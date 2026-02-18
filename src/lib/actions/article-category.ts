"use server";

import { articleCategoryService } from "@/lib/services/article";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";

// ─── Article Category Actions ────────────────────────────────────────────────

export async function createArticleCategory(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    const created_by = await getCurrentUserId();
    await articleCategoryService.create({
      name: name.trim(),
      created_by,
    });
    invalidateTag(CACHE_TAGS.ARTICLE_CATEGORIES);
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
    await articleCategoryService.update(id, { name: name.trim() });
    invalidateTag(CACHE_TAGS.ARTICLE_CATEGORIES);
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
    await articleCategoryService.delete(id);
    invalidateTag(CACHE_TAGS.ARTICLE_CATEGORIES);
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
    `SELECT category_id, COUNT(*) as count FROM article WHERE category_id IN (${placeholders}) GROUP BY category_id`,
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
  const results = await Promise.allSettled(
    ids.map((id) => articleCategoryService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete category ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.ARTICLE_CATEGORIES);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
