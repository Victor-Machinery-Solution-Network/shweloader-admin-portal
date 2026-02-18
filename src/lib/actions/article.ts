"use server";

import { articleService } from "@/lib/services/article";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { calculateReadTime } from "@/lib/utils";
import type { ArticleWithDetails } from "@/types/article";

// ─── Article Actions ─────────────────────────────────────────────────────────

export async function createArticle(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const category_id = formData.get("category_id") as string;
  const article_status_type_id = formData.get(
    "article_status_type_id",
  ) as string;
  const publish_date = formData.get("publish_date") as string;
  const author_name = formData.get("author_name") as string;
  const cover_image_url = formData.get("cover_image_url") as string;

  if (!title?.trim()) {
    return { success: false, error: "Title is required" };
  }

  try {
    const created_by = await getCurrentUserId();
    const estimated_read_time = calculateReadTime(content);

    // Default to "Published" status when none provided
    let statusId: number | null = article_status_type_id
      ? Number(article_status_type_id)
      : null;
    if (!statusId) {
      const statusResult = await d1.query<{ id: number }>(
        `SELECT id FROM article_status_type WHERE status_name = 'Published' LIMIT 1`,
      );
      statusId = statusResult.results[0]?.id ?? null;
    }

    await articleService.create({
      title: title.trim(),
      content: content?.trim() || null,
      category_id: category_id ? Number(category_id) : null,
      article_status_type_id: statusId,
      created_by,
      publish_date: publish_date || null,
      author_name: author_name?.trim() || null,
      cover_image_url: cover_image_url?.trim() || null,
      estimated_read_time,
    });
    invalidateTag(CACHE_TAGS.ARTICLES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create article"),
    };
  }
}

export async function updateArticle(id: number, formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const category_id = formData.get("category_id") as string;
  const article_status_type_id = formData.get(
    "article_status_type_id",
  ) as string;
  const publish_date = formData.get("publish_date") as string;
  const author_name = formData.get("author_name") as string;
  const cover_image_url = formData.get("cover_image_url") as string;

  if (!title?.trim()) {
    return { success: false, error: "Title is required" };
  }

  try {
    const estimated_read_time = calculateReadTime(content);

    await articleService.update(id, {
      title: title.trim(),
      content: content?.trim() || null,
      category_id: category_id ? Number(category_id) : null,
      article_status_type_id: article_status_type_id
        ? Number(article_status_type_id)
        : null,
      publish_date: publish_date || null,
      author_name: author_name?.trim() || null,
      cover_image_url: cover_image_url?.trim() || null,
      estimated_read_time,
    });
    invalidateTag(CACHE_TAGS.ARTICLES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update article"),
    };
  }
}

export async function deleteArticle(id: number) {
  try {
    await articleService.delete(id);
    invalidateTag(CACHE_TAGS.ARTICLES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete article"),
    };
  }
}

// ─── Status Actions ──────────────────────────────────────────────────────────

export async function updateArticleStatus(id: number, statusId: number) {
  try {
    const userId = await getCurrentUserId();

    // If status is "Published" (typically id=2), set approved_by and approved_at
    await d1.query(
      `UPDATE article SET article_status_type_id = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE article_id = ?`,
      [statusId, userId, id],
    );

    invalidateTag(CACHE_TAGS.ARTICLES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update article status"),
    };
  }
}

// ─── Fetch Articles With Details ─────────────────────────────────────────────

export async function getArticlesWithDetails(): Promise<ArticleWithDetails[]> {
  const result = await d1.query<ArticleWithDetails>(
    `SELECT
      a.*,
      ac.name AS category_name,
      ast.status_name AS status_name
    FROM article a
    LEFT JOIN article_category ac ON a.category_id = ac.category_id
    LEFT JOIN article_status_type ast ON a.article_status_type_id = ast.id
    ORDER BY a.created_at DESC`,
  );
  return result.results;
}

export async function getArticleById(
  id: number,
): Promise<ArticleWithDetails | null> {
  const result = await d1.query<ArticleWithDetails>(
    `SELECT
      a.*,
      ac.name AS category_name,
      ast.status_name AS status_name
    FROM article a
    LEFT JOIN article_category ac ON a.category_id = ac.category_id
    LEFT JOIN article_status_type ast ON a.article_status_type_id = ast.id
    WHERE a.article_id = ?
    LIMIT 1`,
    [id],
  );
  return result.results[0] ?? null;
}

// ─── Bulk Delete ─────────────────────────────────────────────────────────────

export async function deleteArticles(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map((id) => articleService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete article ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.ARTICLES);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
