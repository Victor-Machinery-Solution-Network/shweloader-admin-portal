"use server";

import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { triggerChatEvent, triggerAdminChatEvent } from "@/lib/pusher";
import type {
  ChatSessionWithDetails,
  ChatMessageWithDetails,
  ChatAttachment,
} from "@/types/chat";

// ─── Data Fetching ──────────────────────────────────────────────────────────

/** Get all chat sessions with user and product details */
export async function getChatSessionsWithDetails(): Promise<
  ChatSessionWithDetails[]
> {
  const result = await d1.query<ChatSessionWithDetails>(
    `SELECT
      cs.id, cs.app_user_id, cs.enquiry_id, cs.status,
      cs.created_at, cs.updated_at, cs.closed_at,
      cs.last_message_at, cs.last_message_preview,
      cs.unread_admin_count, cs.unread_user_count,
      au.full_name AS user_name,
      au.email AS user_email,
      au.phone AS user_phone,
      au.company_name AS user_company,
      COALESCE(em.name, am.name) AS product_name,
      pl.thumbnail_url AS product_thumbnail,
      CASE
        WHEN e.sale_listing_id IS NOT NULL THEN 'sale'
        WHEN e.rent_listing_id IS NOT NULL THEN 'rent'
        ELSE NULL
      END AS listing_type,
      COALESCE(e.sale_listing_id, e.rent_listing_id) AS listing_id,
      pb.name AS brand_name,
      COALESCE(sl.mmk_price, rl.mmk_price) AS mmk_price,
      COALESCE(sl.usd_price, rl.usd_price) AS usd_price,
      COALESCE(sl.display_currency, rl.display_currency) AS display_currency,
      pau.company_name AS partner_name
    FROM chat_session cs
    JOIN app_user au ON au.app_user_id = cs.app_user_id
    LEFT JOIN enquiry e ON e.id = cs.enquiry_id AND e.deleted_at IS NULL
    LEFT JOIN sale_listing sl ON sl.id = e.sale_listing_id
    LEFT JOIN rent_listing rl ON rl.id = e.rent_listing_id
    LEFT JOIN product_list pl ON pl.id = COALESCE(sl.product_list_id, rl.product_list_id)
    LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
    LEFT JOIN partner p ON p.id = pl.partner_id
    LEFT JOIN app_user pau ON pau.app_user_id = p.app_user_id
    ORDER BY cs.last_message_at DESC`,
  );
  return result.results;
}

/** Get messages for a chat session with attachments */
export async function getChatMessages(
  sessionId: number,
): Promise<ChatMessageWithDetails[]> {
  await requirePermission("chat", "read");

  // Fetch messages
  const messagesResult = await d1.query<
    ChatMessageWithDetails & { sender_name: string }
  >(
    `SELECT
      cm.id, cm.chat_session_id, cm.sender_type, cm.sender_id, cm.message, cm.created_at,
      CASE
        WHEN cm.sender_type = 'user' THEN au.full_name
        WHEN cm.sender_type = 'admin' THEN ad.username
        ELSE 'Unknown'
      END AS sender_name
    FROM chat_message cm
    LEFT JOIN app_user au ON cm.sender_type = 'user' AND au.app_user_id = cm.sender_id
    LEFT JOIN admin_user ad ON cm.sender_type = 'admin' AND ad.user_id = cm.sender_id
    WHERE cm.chat_session_id = ?
    ORDER BY cm.created_at ASC`,
    [sessionId],
  );

  const messages = messagesResult.results;
  if (messages.length === 0) return [];

  // Fetch attachments for all message IDs
  const messageIds = messages.map((m) => m.id);
  const placeholders = messageIds.map(() => "?").join(",");
  const attachmentsResult = await d1.query<ChatAttachment>(
    `SELECT * FROM chat_attachment WHERE chat_message_id IN (${placeholders}) ORDER BY id ASC`,
    messageIds,
  );

  // Group attachments by message ID
  const attachmentsByMessage = Map.groupBy(
    attachmentsResult.results,
    (a) => a.chat_message_id,
  );

  // Merge
  return messages.map((m) => ({
    ...m,
    attachments: attachmentsByMessage.get(m.id) ?? [],
  }));
}

/** Get total unread count across all active sessions (for sidebar badge) */
export async function getTotalUnreadCount(): Promise<number> {
  const result = await d1.query<{ total: number }>(
    "SELECT COALESCE(SUM(unread_admin_count), 0) AS total FROM chat_session WHERE status = 'active'",
  );
  return result.results[0]?.total ?? 0;
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Send a message in a chat session */
export async function sendMessage(
  sessionId: number,
  message: string | null,
  attachmentData?: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[],
) {
  try {
    const adminId = await requirePermission("chat", "edit");

    // Validate: at least message or attachments
    const hasMessage = message && message.trim().length > 0;
    const hasAttachments = attachmentData && attachmentData.length > 0;
    if (!hasMessage && !hasAttachments) {
      return { success: false, error: "Message or attachments required" };
    }

    // Insert message
    await d1.query(
      `INSERT INTO chat_message (chat_session_id, sender_type, sender_id, message)
       VALUES (?, 'admin', ?, ?)`,
      [sessionId, adminId, hasMessage ? message!.trim() : null],
    );

    // Get the inserted message ID
    const msgResult = await d1.query<{ id: number }>(
      "SELECT last_insert_rowid() AS id",
    );
    const messageId = msgResult.results[0]?.id;

    // Insert attachments
    if (hasAttachments && messageId) {
      for (const att of attachmentData!) {
        await d1.query(
          `INSERT INTO chat_attachment (chat_message_id, file_url, file_name, file_size, file_type)
           VALUES (?, ?, ?, ?, ?)`,
          [messageId, att.fileUrl, att.fileName, att.fileSize, att.fileType],
        );
      }
    }

    // Update session metadata
    const preview = hasMessage
      ? message!.trim().slice(0, 100)
      : `[Attachment] ${attachmentData![0].fileName}`;
    await d1.query(
      `UPDATE chat_session
       SET last_message_at = CURRENT_TIMESTAMP,
           last_message_preview = ?,
           unread_user_count = unread_user_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [preview, sessionId],
    );

    // Fetch admin name for Pusher payload + session's enquiry_id
    const [adminResult, sessionResult] = await Promise.all([
      d1.query<{ username: string }>(
        "SELECT username FROM admin_user WHERE user_id = ?",
        [adminId],
      ),
      d1.query<{ enquiry_id: number | null }>(
        "SELECT enquiry_id FROM chat_session WHERE id = ?",
        [sessionId],
      ),
    ]);
    const senderName = adminResult.results[0]?.username ?? "Admin";

    // Auto-transition enquiry status to "Replied" if this is first admin reply
    const session = sessionResult;
    const enquiryId = session.results[0]?.enquiry_id;
    if (enquiryId) {
      // Look up the "Replied" status by name (not hardcoded ID)
      const statusResult = await d1.query<{ id: number }>(
        "SELECT id FROM enquiry_status_type WHERE status_name = 'Replied'",
      );
      const repliedStatusId = statusResult.results[0]?.id;
      if (repliedStatusId) {
        // Only update if currently "Pending"
        const pendingResult = await d1.query<{ id: number }>(
          "SELECT id FROM enquiry_status_type WHERE status_name = 'Pending'",
        );
        const pendingStatusId = pendingResult.results[0]?.id;
        if (pendingStatusId) {
          await d1.query(
            `UPDATE enquiry SET enquiry_status_id = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND enquiry_status_id = ?`,
            [repliedStatusId, adminId, enquiryId, pendingStatusId],
          );
        }
      }
    }

    // Trigger Pusher events
    const now = new Date().toISOString();
    triggerChatEvent(sessionId, "new-message", {
      messageId,
      senderType: "admin",
      senderId: adminId,
      senderName,
      message: hasMessage ? message!.trim() : null,
      attachments: attachmentData ?? [],
      createdAt: now,
    }).catch(() => {}); // Fire and forget

    // Notify other admins' inboxes about the new message
    triggerAdminChatEvent("new-message", {
      sessionId,
      lastMessagePreview: preview,
      lastMessageAt: now,
    }).catch(() => {});

    invalidateTag(CACHE_TAGS.CHAT_SESSIONS);
    return { success: true, messageId };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to send message"),
    };
  }
}

/** Create or get existing chat session for an enquiry (idempotent) */
export async function createSessionForEnquiry(enquiryId: number) {
  try {
    await requirePermission("chat", "edit");

    // Check for existing session
    const existing = await d1.query<{ id: number }>(
      "SELECT id FROM chat_session WHERE enquiry_id = ?",
      [enquiryId],
    );
    if (existing.results.length > 0) {
      return { success: true, sessionId: existing.results[0].id };
    }

    // Get enquiry's app_user_id
    const enquiry = await d1.query<{ app_user_id: number }>(
      "SELECT app_user_id FROM enquiry WHERE id = ? AND deleted_at IS NULL",
      [enquiryId],
    );
    if (enquiry.results.length === 0) {
      return { success: false, error: "Enquiry not found" };
    }

    // Create session
    await d1.query(
      `INSERT INTO chat_session (app_user_id, enquiry_id, status, last_message_preview)
       VALUES (?, ?, 'active', '')`,
      [enquiry.results[0].app_user_id, enquiryId],
    );

    const inserted = await d1.query<{ id: number }>(
      "SELECT last_insert_rowid() AS id",
    );
    const sessionId = inserted.results[0]?.id;

    // Notify all admins about the new session
    triggerAdminChatEvent("new-chat-session", {
      sessionId,
      appUserId: enquiry.results[0].app_user_id,
      enquiryId,
    }).catch(() => {});

    invalidateTag(CACHE_TAGS.CHAT_SESSIONS);
    return { success: true, sessionId };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create session"),
    };
  }
}

/** Close a chat session */
export async function closeSession(sessionId: number) {
  try {
    const adminId = await requirePermission("chat", "edit");

    await d1.query(
      `UPDATE chat_session
       SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sessionId],
    );

    // If enquiry-linked, update enquiry status to "Resolved"
    const session = await d1.query<{ enquiry_id: number | null }>(
      "SELECT enquiry_id FROM chat_session WHERE id = ?",
      [sessionId],
    );
    const enquiryId = session.results[0]?.enquiry_id;
    if (enquiryId) {
      const statusResult = await d1.query<{ id: number }>(
        "SELECT id FROM enquiry_status_type WHERE status_name = 'Resolved'",
      );
      const resolvedStatusId = statusResult.results[0]?.id;
      if (resolvedStatusId) {
        await d1.query(
          `UPDATE enquiry SET enquiry_status_id = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [resolvedStatusId, adminId, enquiryId],
        );
      }
    }

    // Trigger Pusher event
    triggerChatEvent(sessionId, "session-closed", {
      sessionId,
      closedAt: new Date().toISOString(),
    }).catch(() => {});

    invalidateTag(CACHE_TAGS.CHAT_SESSIONS, CACHE_TAGS.ENQUIRIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to close session"),
    };
  }
}

/** Mark session as read by admin (only if unread count > 0) */
export async function markSessionRead(sessionId: number) {
  try {
    await requirePermission("chat", "read");

    // Only update if there are unread messages (avoids unnecessary cache invalidation)
    const result = await d1.query<{ unread_admin_count: number }>(
      "SELECT unread_admin_count FROM chat_session WHERE id = ?",
      [sessionId],
    );
    if (result.results[0]?.unread_admin_count === 0) {
      return { success: true };
    }

    await d1.query(
      "UPDATE chat_session SET unread_admin_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [sessionId],
    );

    invalidateTag(CACHE_TAGS.CHAT_SESSIONS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to mark session as read"),
    };
  }
}
