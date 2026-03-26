"use server";

import { d1 } from "@/lib/api/d1-client";
import { auth } from "@/lib/auth";
import { triggerNotification, triggerNotificationBatch } from "@/lib/pusher";
import type { Notification, NotificationType } from "@/types/notification";

// ─── Query Helpers ──────────────────────────────────────────────────────────

/** Get all active admin user IDs that have a specific permission */
async function getAdminIdsWithPermission(
  feature: string,
  permission: string,
): Promise<number[]> {
  const result = await d1.query<{ user_id: number }>(
    `SELECT DISTINCT a.user_id
     FROM admin_user a
     JOIN role_permission rp ON a.role_id = rp.role_id
     JOIN feature_permission fp ON rp.feature_permission_id = fp.feature_permission_id
     JOIN feature f ON fp.feature_id = f.feature_id
     JOIN permission p ON fp.permission_id = p.permission_id
     WHERE f.name = ? AND p.name = ? AND a.active = 1`,
    [feature, permission],
  );
  return result.results.map((r) => r.user_id);
}

// ─── Core Notification CRUD ─────────────────────────────────────────────────

interface CreateNotificationParams {
  recipientId: number;
  type: NotificationType;
  title: string;
  message?: string;
  referenceType?: string;
  referenceId?: number;
  actionUrl?: string;
}

async function createNotification(
  params: CreateNotificationParams,
): Promise<void> {
  await d1.query(
    `INSERT INTO notification (recipient_id, type, title, message, reference_type, reference_id, action_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.recipientId,
      params.type,
      params.title,
      params.message ?? null,
      params.referenceType ?? null,
      params.referenceId ?? null,
      params.actionUrl ?? null,
    ],
  );
}

async function createAndPushNotification(
  params: CreateNotificationParams,
): Promise<void> {
  await createNotification(params);
  await triggerNotification(params.recipientId, "new-notification", {
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    referenceType: params.referenceType ?? null,
    referenceId: params.referenceId ?? null,
    actionUrl: params.actionUrl ?? null,
  });
}

// ─── Article Notification Helpers ───────────────────────────────────────────

/** Notify all admins with articles:approve about a new submission */
export async function notifyArticleSubmitted(
  articleId: number,
  articleTitle: string,
  submitterId: number,
): Promise<void> {
  const approverIds = await getAdminIdsWithPermission("articles", "approve");
  // Exclude the submitter from notifications
  const recipientIds = approverIds.filter((id) => id !== submitterId);
  if (recipientIds.length === 0) return;

  const title = "Article submitted for review";
  const message = `"${articleTitle}" needs your review.`;
  const actionUrl = `/articles/posts/${articleId}/edit`;

  // Insert notification rows for all recipients
  await Promise.all(
    recipientIds.map((recipientId) =>
      createNotification({
        recipientId,
        type: "article_submitted",
        title,
        message,
        referenceType: "article",
        referenceId: articleId,
        actionUrl,
      }),
    ),
  );

  // Push real-time events in batch
  await triggerNotificationBatch(recipientIds, "new-notification", {
    type: "article_submitted",
    title,
    message,
    referenceType: "article",
    referenceId: articleId,
    actionUrl,
  });
}

/** Notify the author that their article was approved */
export async function notifyArticleApproved(
  articleId: number,
  articleTitle: string,
  authorId: number,
  approverId: number,
): Promise<void> {
  // Don't notify if the approver is the author
  if (authorId === approverId) return;

  await createAndPushNotification({
    recipientId: authorId,
    type: "article_approved",
    title: "Article approved",
    message: `"${articleTitle}" has been published.`,
    referenceType: "article",
    referenceId: articleId,
    actionUrl: `/articles/posts/${articleId}/edit`,
  });
}

/** Notify the author that their article needs rework */
export async function notifyArticleRework(
  articleId: number,
  articleTitle: string,
  authorId: number,
  requesterId: number,
  reason?: string,
): Promise<void> {
  if (authorId === requesterId) return;

  const message = reason
    ? `"${articleTitle}" needs rework: ${reason}`
    : `"${articleTitle}" was sent back for rework.`;

  await createAndPushNotification({
    recipientId: authorId,
    type: "article_rework",
    title: "Article sent for rework",
    message,
    referenceType: "article",
    referenceId: articleId,
    actionUrl: `/articles/posts/${articleId}/edit`,
  });
}

// ─── Listing Notification Helpers ─────────────────────────────────────────────

/** Notify all admins with {feature}:approve about a new listing submission */
export async function notifyListingSubmitted(
  listingId: number,
  listingType: "sale" | "rent",
  modelName: string,
  submitterId: number,
): Promise<void> {
  const feature = listingType === "sale" ? "sale_listings" : "rent_listings";
  const approverIds = await getAdminIdsWithPermission(feature, "approve");
  const recipientIds = approverIds.filter((id) => id !== submitterId);
  if (recipientIds.length === 0) return;

  const title = "Listing submitted for review";
  const message = `"${modelName}" (for ${listingType}) needs your review.`;
  const actionUrl = `/listings/for-${listingType}/${listingId}/edit`;

  await Promise.all(
    recipientIds.map((recipientId) =>
      createNotification({
        recipientId,
        type: "listing_submitted",
        title,
        message,
        referenceType: "listing",
        referenceId: listingId,
        actionUrl,
      }),
    ),
  );

  await triggerNotificationBatch(recipientIds, "new-notification", {
    type: "listing_submitted",
    title,
    message,
    referenceType: "listing",
    referenceId: listingId,
    actionUrl,
  });
}

/** Notify the creator that their listing was approved */
export async function notifyListingApproved(
  listingId: number,
  listingType: "sale" | "rent",
  modelName: string,
  creatorId: number,
  approverId: number,
): Promise<void> {
  if (creatorId === approverId) return;

  await createAndPushNotification({
    recipientId: creatorId,
    type: "listing_approved",
    title: "Listing approved",
    message: `"${modelName}" (for ${listingType}) has been approved.`,
    referenceType: "listing",
    referenceId: listingId,
    actionUrl: `/listings/for-${listingType}/${listingId}/edit`,
  });
}

/** Notify the creator that their listing needs rework */
export async function notifyListingRework(
  listingId: number,
  listingType: "sale" | "rent",
  modelName: string,
  creatorId: number,
  requesterId: number,
  reason?: string,
): Promise<void> {
  if (creatorId === requesterId) return;

  const message = reason
    ? `"${modelName}" (for ${listingType}) needs rework: ${reason}`
    : `"${modelName}" (for ${listingType}) was sent back for rework.`;

  await createAndPushNotification({
    recipientId: creatorId,
    type: "listing_rework",
    title: "Listing sent for rework",
    message,
    referenceType: "listing",
    referenceId: listingId,
    actionUrl: `/listings/for-${listingType}/${listingId}/edit`,
  });
}

// ─── Notification Data Actions (for UI) ─────────────────────────────────────

/** Get notifications for the current user */
export async function getMyNotifications(): Promise<Notification[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const result = await d1.query<Notification>(
    `SELECT * FROM notification
     WHERE recipient_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [session.user.id],
  );
  return result.results;
}

/** Get unread notification count for the current user */
export async function getMyUnreadCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;

  const result = await d1.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM notification
     WHERE recipient_id = ? AND is_read = 0`,
    [session.user.id],
  );
  return result.results[0]?.count ?? 0;
}

/** Mark a single notification as read */
export async function markNotificationRead(notificationId: number) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  await d1.query(
    `UPDATE notification SET is_read = 1
     WHERE notification_id = ? AND recipient_id = ?`,
    [notificationId, session.user.id],
  );
  return { success: true };
}

/** Mark all notifications as read for the current user */
export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  await d1.query(
    `UPDATE notification SET is_read = 1
     WHERE recipient_id = ? AND is_read = 0`,
    [session.user.id],
  );
  return { success: true };
}

/** Delete a single notification */
export async function deleteNotification(notificationId: number) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  await d1.query(
    `DELETE FROM notification
     WHERE notification_id = ? AND recipient_id = ?`,
    [notificationId, session.user.id],
  );
  return { success: true };
}

/** Delete all notifications for the current user */
export async function deleteAllNotifications() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  await d1.query(
    `DELETE FROM notification WHERE recipient_id = ?`,
    [session.user.id],
  );
  return { success: true };
}

// ─── Status Check for Already-Handled Items ─────────────────────────────────

export interface ItemStatusResult {
  handled: boolean;
  status: string | null;
  actionBy: string | null;
  actionAt: string | null;
  reason: string | null;
}

/** Check if a notification's referenced item has already been handled by another admin */
export async function checkNotificationItemStatus(
  notificationId: number,
): Promise<ItemStatusResult> {
  const session = await auth();
  if (!session?.user?.id)
    return { handled: false, status: null, actionBy: null, actionAt: null, reason: null };

  // Get the notification to find reference type + id
  const notifResult = await d1.query<Notification>(
    `SELECT * FROM notification WHERE notification_id = ? AND recipient_id = ?`,
    [notificationId, session.user.id],
  );
  const notif = notifResult.results[0];
  if (!notif || !notif.reference_type || !notif.reference_id)
    return { handled: false, status: null, actionBy: null, actionAt: null, reason: null };

  // Only check "submitted" notifications — those are the ones that can be stale
  if (!notif.type.endsWith("_submitted"))
    return { handled: false, status: null, actionBy: null, actionAt: null, reason: null };

  if (notif.reference_type === "article") {
    const result = await d1.query<{
      status_name: string;
      approved_by_name: string | null;
      approved_at: string | null;
      rejection_reason: string | null;
    }>(
      `SELECT ast.status_name, au.username AS approved_by_name, a.approved_at, a.rejection_reason
       FROM article a
       LEFT JOIN article_status_type ast ON a.article_status_type_id = ast.id
       LEFT JOIN admin_user au ON a.approved_by = au.user_id
       WHERE a.article_id = ?`,
      [notif.reference_id],
    );
    const row = result.results[0];
    if (!row) return { handled: true, status: "Deleted", actionBy: null, actionAt: null, reason: null };

    const isPending = row.status_name === "Pending Review";
    if (isPending) return { handled: false, status: null, actionBy: null, actionAt: null, reason: null };

    return {
      handled: true,
      status: row.status_name,
      actionBy: row.approved_by_name,
      actionAt: row.approved_at,
      reason: row.rejection_reason,
    };
  }

  if (notif.reference_type === "listing") {
    // Try sale_listing first, then rent_listing
    for (const table of ["sale_listing", "rent_listing"]) {
      const result = await d1.query<{
        status_name: string;
        approved_by_name: string | null;
        approved_at: string | null;
        rejection_reason: string | null;
      }>(
        `SELECT ast.status_name, au.username AS approved_by_name, l.approved_at, l.rejection_reason
         FROM ${table} l
         LEFT JOIN approval_status_type ast ON l.approve_status_id = ast.id
         LEFT JOIN admin_user au ON l.approved_by = au.user_id
         WHERE l.id = ?`,
        [notif.reference_id],
      );
      const row = result.results[0];
      if (!row) continue;

      const isPending = row.status_name === "Pending";
      if (isPending) return { handled: false, status: null, actionBy: null, actionAt: null, reason: null };

      return {
        handled: true,
        status: row.status_name,
        actionBy: row.approved_by_name,
        actionAt: row.approved_at,
        reason: row.rejection_reason,
      };
    }
    return { handled: true, status: "Deleted", actionBy: null, actionAt: null, reason: null };
  }

  return { handled: false, status: null, actionBy: null, actionAt: null, reason: null };
}
