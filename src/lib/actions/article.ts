"use server";

import { articleService } from "@/lib/services/article";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { calculateReadTime } from "@/lib/utils";
import { processFileField, cleanupOldFile } from "@/lib/actions/upload-helpers";
import { saveTrashMetadata } from "@/lib/actions/trash";
import {
  notifyArticleSubmitted,
  notifyArticleApproved,
  notifyArticleRework,
} from "@/lib/actions/notification";
import { auditLog } from "@/lib/actions/audit";
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

  if (!title?.trim()) {
    return { success: false, error: "Title is required" };
  }

  try {
    const cover_image_url = await processFileField(
      formData, "cover_image_url", "articles/covers/", title.trim(),
    );
    const created_by = await requirePermission("articles", "create");
    const estimated_read_time = calculateReadTime(content);

    const statusId = article_status_type_id
      ? Number(article_status_type_id)
      : null;

    // Prevent non-approvers from directly publishing
    if (statusId) {
      const statusCheck = await d1.query<{ status_name: string }>(
        `SELECT status_name FROM article_status_type WHERE id = ? LIMIT 1`,
        [statusId],
      );
      if (statusCheck.results[0]?.status_name === "Published") {
        await requirePermission("articles", "approve");
      }
    }

    const focal_x = parseFloat(formData.get("cover_focal_x") as string) || 0.5;
    const focal_y = parseFloat(formData.get("cover_focal_y") as string) || 0.5;
    await articleService.create({
      title: title.trim(),
      content: content?.trim() || null,
      category_id: category_id ? Number(category_id) : null,
      article_status_type_id: statusId,
      created_by,
      publish_date: publish_date || null,
      author_name: author_name?.trim() || null,
      cover_image_url,
      focal_x,
      focal_y,
      estimated_read_time,
    });
    invalidateTag(CACHE_TAGS.ARTICLES);
    auditLog(created_by, "created article | title=" + title.trim());
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

  if (!title?.trim()) {
    return { success: false, error: "Title is required" };
  }

  try {
    const userId = await requirePermission("articles", "edit");

    // Prevent non-approvers from changing status to Published
    const newStatusId = article_status_type_id ? Number(article_status_type_id) : null;
    if (newStatusId) {
      const statusCheck = await d1.query<{ status_name: string }>(
        `SELECT status_name FROM article_status_type WHERE id = ? LIMIT 1`,
        [newStatusId],
      );
      if (statusCheck.results[0]?.status_name === "Published") {
        await requirePermission("articles", "approve");
      }
    }

    const existing = await articleService.getById(id);
    const cover_image_url = await processFileField(
      formData, "cover_image_url", "articles/covers/", title.trim(), existing?.cover_image_url,
    );
    const estimated_read_time = calculateReadTime(content);

    const focal_x = parseFloat(formData.get("cover_focal_x") as string) || 0.5;
    const focal_y = parseFloat(formData.get("cover_focal_y") as string) || 0.5;
    await articleService.update(id, {
      title: title.trim(),
      content: content?.trim() || null,
      category_id: category_id ? Number(category_id) : null,
      article_status_type_id: article_status_type_id
        ? Number(article_status_type_id)
        : null,
      publish_date: publish_date || null,
      author_name: author_name?.trim() || null,
      cover_image_url,
      focal_x,
      focal_y,
      estimated_read_time,
    });
    await cleanupOldFile(existing?.cover_image_url, cover_image_url);
    invalidateTag(CACHE_TAGS.ARTICLES);
    auditLog(userId, "updated article | id=" + id);
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
    const deletedBy = await requirePermission("articles", "delete");
    await articleService.softDelete(id, deletedBy);
    saveTrashMetadata("article", id, deletedBy).catch(() => {});
    invalidateTag(CACHE_TAGS.ARTICLES);
    auditLog(deletedBy, "deleted article | id=" + id);
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
    const userId = await requirePermission("articles", "edit");

    // Get existing article to check previous status and author
    const existing = await getArticleById(id);

    // Look up target status name to determine transition behavior
    const statusResult = await d1.query<{ status_name: string }>(
      `SELECT status_name FROM article_status_type WHERE id = ? LIMIT 1`,
      [statusId],
    );
    const statusName = statusResult.results[0]?.status_name;

    if (statusName === "Published") {
      // Publishing a pending article requires approve permission
      if (existing?.status_name === "Pending Review") {
        await requirePermission("articles", "approve");
      }

      // Publishing: set approved_by, approved_at, and publish_date if not already set
      await d1.query(
        `UPDATE article
         SET article_status_type_id = ?,
             approved_by = ?,
             approved_at = CURRENT_TIMESTAMP,
             publish_date = COALESCE(publish_date, DATE('now')),
             updated_at = CURRENT_TIMESTAMP
         WHERE article_id = ?`,
        [statusId, userId, id],
      );

      // Non-blocking notification to author when approving a pending article
      if (existing?.status_name === "Pending Review" && existing.created_by) {
        notifyArticleApproved(id, existing.title, existing.created_by, userId).catch(() => {});
      }
    } else {
      // Draft/Hidden/other: clear approval fields
      await d1.query(
        `UPDATE article
         SET article_status_type_id = ?,
             approved_by = NULL,
             approved_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE article_id = ?`,
        [statusId, id],
      );
    }

    invalidateTag(CACHE_TAGS.ARTICLES);
    auditLog(userId, "updated article status | id=" + id + " | status=" + (statusName ?? "unknown"));
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update article status"),
    };
  }
}

export async function publishArticle(id: number) {
  try {
    const userId = await requirePermission("articles", "approve");

    // Get existing article to check previous status and author for notification
    const existing = await getArticleById(id);

    const statusResult = await d1.query<{ id: number }>(
      `SELECT id FROM article_status_type WHERE status_name = 'Published' LIMIT 1`,
    );
    const publishedStatusId = statusResult.results[0]?.id;
    if (!publishedStatusId) {
      return { success: false, error: "Published status not found" };
    }

    // Inline the status update to avoid requiring "edit" permission
    await d1.query(
      `UPDATE article
       SET article_status_type_id = ?,
           approved_by = ?,
           approved_at = CURRENT_TIMESTAMP,
           publish_date = COALESCE(publish_date, DATE('now')),
           updated_at = CURRENT_TIMESTAMP
       WHERE article_id = ?`,
      [publishedStatusId, userId, id],
    );
    invalidateTag(CACHE_TAGS.ARTICLES);

    // Non-blocking notification to author when approving a pending article
    if (existing?.status_name === "Pending Review" && existing.created_by) {
      notifyArticleApproved(id, existing.title, existing.created_by, userId).catch(() => {});
    }

    auditLog(userId, "published article | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to publish article"),
    };
  }
}

export async function requestArticleRework(id: number, reason?: string) {
  try {
    const userId = await requirePermission("articles", "approve");

    // Get article info for notification
    const existing = await getArticleById(id);

    const statusResult = await d1.query<{ id: number }>(
      `SELECT id FROM article_status_type WHERE status_name = 'Rework' LIMIT 1`,
    );
    const reworkStatusId = statusResult.results[0]?.id;
    if (!reworkStatusId) {
      return { success: false, error: "Rework status not found" };
    }
    await d1.query(
      `UPDATE article
       SET article_status_type_id = ?,
           rejection_reason = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE article_id = ?`,
      [reworkStatusId, reason || null, id],
    );
    invalidateTag(CACHE_TAGS.ARTICLES);

    // Non-blocking notification to author
    if (existing?.created_by) {
      notifyArticleRework(id, existing.title, existing.created_by, userId, reason).catch(() => {});
    }

    auditLog(userId, "requested article rework | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to request rework"),
    };
  }
}

// ─── Submit for Review ──────────────────────────────────────────────────────

export async function submitForReview(id: number) {
  try {
    const userId = await requirePermission("articles", "edit");
    const statusResult = await d1.query<{ id: number }>(
      `SELECT id FROM article_status_type WHERE status_name = 'Pending Review' LIMIT 1`,
    );
    const pendingStatusId = statusResult.results[0]?.id;
    if (!pendingStatusId) {
      return { success: false, error: "Pending Review status not found" };
    }
    await d1.query(
      `UPDATE article
       SET article_status_type_id = ?,
           rejection_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE article_id = ?`,
      [pendingStatusId, id],
    );
    invalidateTag(CACHE_TAGS.ARTICLES);

    // Non-blocking notification to approvers
    const article = await articleService.getById(id);
    if (article) {
      notifyArticleSubmitted(id, (article as ArticleWithDetails).title, userId).catch(() => {});
    }

    auditLog(userId, "submitted article for review | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to submit for review"),
    };
  }
}

export async function createAndSubmitForReview(formData: FormData) {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const category_id = formData.get("category_id") as string;
  const publish_date = formData.get("publish_date") as string;
  const author_name = formData.get("author_name") as string;

  if (!title?.trim()) {
    return { success: false, error: "Title is required" };
  }

  try {
    const cover_image_url = await processFileField(
      formData, "cover_image_url", "articles/covers/", title.trim(),
    );
    const created_by = await requirePermission("articles", "create");
    const estimated_read_time = calculateReadTime(content);

    // Resolve the "Pending Review" status ID
    const statusResult = await d1.query<{ id: number }>(
      `SELECT id FROM article_status_type WHERE status_name = 'Pending Review' LIMIT 1`,
    );
    const pendingStatusId = statusResult.results[0]?.id;
    if (!pendingStatusId) {
      return { success: false, error: "Pending Review status not found" };
    }

    const focal_x = parseFloat(formData.get("cover_focal_x") as string) || 0.5;
    const focal_y = parseFloat(formData.get("cover_focal_y") as string) || 0.5;
    const created = await articleService.create({
      title: title.trim(),
      content: content?.trim() || null,
      category_id: category_id ? Number(category_id) : null,
      article_status_type_id: pendingStatusId,
      created_by,
      publish_date: publish_date || null,
      author_name: author_name?.trim() || null,
      cover_image_url,
      focal_x,
      focal_y,
      estimated_read_time,
    });
    invalidateTag(CACHE_TAGS.ARTICLES);

    // Non-blocking notification to approvers
    let articleId = (created as ArticleWithDetails).article_id ?? null;
    if (!articleId) {
      const lastRow = await d1.query<{ article_id: number }>(
        "SELECT article_id FROM article ORDER BY article_id DESC LIMIT 1",
      );
      articleId = lastRow.results[0]?.article_id ?? null;
    }
    if (articleId) {
      notifyArticleSubmitted(articleId, title.trim(), created_by).catch(() => {});
    }

    auditLog(created_by, "created and submitted article for review | title=" + title.trim());
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to submit article for review"),
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
    WHERE a.deleted_at IS NULL
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
      ast.status_name AS status_name,
      approver.username AS approved_by_name
    FROM article a
    LEFT JOIN article_category ac ON a.category_id = ac.category_id
    LEFT JOIN article_status_type ast ON a.article_status_type_id = ast.id
    LEFT JOIN admin_user approver ON a.approved_by = approver.user_id
    WHERE a.article_id = ? AND a.deleted_at IS NULL
    LIMIT 1`,
    [id],
  );
  return result.results[0] ?? null;
}

// ─── Bulk Delete ─────────────────────────────────────────────────────────────

export async function deleteArticles(ids: number[]) {
  const deletedBy = await requirePermission("articles", "delete");
  assertBulkLimit(ids);

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await articleService.softDelete(id, deletedBy);
      saveTrashMetadata("article", id, deletedBy).catch(() => {});
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete article ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.ARTICLES);
  auditLog(deletedBy, "bulk deleted articles | count=" + deleted);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
