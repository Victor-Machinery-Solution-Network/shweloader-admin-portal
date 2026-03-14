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
  ProductDiscussed,
} from "@/types/chat";

interface SearchListingResult {
  listingId: number;
  listingType: "sale" | "rent";
  productName: string | null;
  brandName: string | null;
  thumbnailUrl: string | null;
  mmkPrice: number | null;
  usdPrice: number | null;
  displayCurrency: string | null;
}

// ─── Data Fetching ──────────────────────────────────────────────────────────

/** Get all chat sessions with user and product details */
export async function getChatSessionsWithDetails(): Promise<
  ChatSessionWithDetails[]
> {
  const result = await d1.query<ChatSessionWithDetails>(
    `SELECT
      cs.id, cs.app_user_id, cs.status,
      cs.created_at, cs.updated_at, cs.resolved_at,
      cs.last_message_at, cs.last_message_preview,
      cs.unread_admin_count, cs.unread_user_count,
      cs.admin_last_read_at, cs.user_last_read_at,
      cs.deleted_at, cs.deleted_by,
      au.full_name AS user_name,
      au.email AS user_email,
      au.phone AS user_phone,
      au.company_name AS user_company,
      COALESCE(em.name, am.name) AS product_name,
      pl.thumbnail_url AS product_thumbnail,
      CASE
        WHEN cm_ref.sale_listing_id IS NOT NULL THEN 'sale'
        WHEN cm_ref.rent_listing_id IS NOT NULL THEN 'rent'
        ELSE NULL
      END AS listing_type,
      COALESCE(cm_ref.sale_listing_id, cm_ref.rent_listing_id) AS listing_id,
      pb.name AS brand_name,
      COALESCE(sl.mmk_price, rl.mmk_price) AS mmk_price,
      COALESCE(sl.usd_price, rl.usd_price) AS usd_price,
      COALESCE(sl.display_currency, rl.display_currency) AS display_currency,
      pau.company_name AS partner_name
    FROM chat_session cs
    JOIN app_user au ON au.app_user_id = cs.app_user_id
    -- Latest product reference message in the session
    LEFT JOIN chat_message cm_ref ON cm_ref.id = (
      SELECT id FROM chat_message
      WHERE chat_session_id = cs.id
        AND (sale_listing_id IS NOT NULL OR rent_listing_id IS NOT NULL)
      ORDER BY created_at DESC
      LIMIT 1
    )
    LEFT JOIN sale_listing sl ON sl.id = cm_ref.sale_listing_id
    LEFT JOIN rent_listing rl ON rl.id = cm_ref.rent_listing_id
    LEFT JOIN product_list pl ON pl.id = COALESCE(sl.product_list_id, rl.product_list_id)
    LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
    LEFT JOIN partner p ON p.id = pl.partner_id
    LEFT JOIN app_user pau ON pau.app_user_id = p.app_user_id
    WHERE cs.deleted_at IS NULL
    ORDER BY cs.last_message_at DESC`,
  );
  return result.results;
}

/** Get messages for a chat session with attachments */
export async function getChatMessages(
  sessionId: number,
): Promise<ChatMessageWithDetails[]> {
  await requirePermission("chat", "read");

  // Fetch messages with product ref JOINs
  const messagesResult = await d1.query<ChatMessageWithDetails>(
    `SELECT
      cm.id, cm.chat_session_id, cm.sender_type, cm.sender_id, cm.message,
      cm.sale_listing_id, cm.rent_listing_id, cm.created_at,
      CASE
        WHEN cm.sender_type = 'user' THEN au.full_name
        WHEN cm.sender_type = 'admin' THEN ad.username
        ELSE 'Unknown'
      END AS sender_name,
      COALESCE(em.name, am.name) AS product_name,
      pl.thumbnail_url AS product_thumbnail,
      CASE
        WHEN cm.sale_listing_id IS NOT NULL THEN 'sale'
        WHEN cm.rent_listing_id IS NOT NULL THEN 'rent'
        ELSE NULL
      END AS listing_type,
      pb.name AS brand_name,
      COALESCE(sl.mmk_price, rl.mmk_price) AS mmk_price,
      COALESCE(sl.usd_price, rl.usd_price) AS usd_price,
      COALESCE(sl.display_currency, rl.display_currency) AS display_currency,
      pau.company_name AS partner_name
    FROM chat_message cm
    LEFT JOIN app_user au ON cm.sender_type = 'user' AND au.app_user_id = cm.sender_id
    LEFT JOIN admin_user ad ON cm.sender_type = 'admin' AND ad.user_id = cm.sender_id
    LEFT JOIN sale_listing sl ON sl.id = cm.sale_listing_id
    LEFT JOIN rent_listing rl ON rl.id = cm.rent_listing_id
    LEFT JOIN product_list pl ON pl.id = COALESCE(sl.product_list_id, rl.product_list_id)
    LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
    LEFT JOIN partner p ON p.id = pl.partner_id
    LEFT JOIN app_user pau ON pau.app_user_id = p.app_user_id
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

/** Get total unread count across all active/pending sessions (for sidebar badge) */
export async function getTotalUnreadCount(): Promise<number> {
  const result = await d1.query<{ total: number }>(
    "SELECT COALESCE(SUM(unread_admin_count), 0) AS total FROM chat_session WHERE status IN ('pending', 'active') AND deleted_at IS NULL",
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

    // Update session metadata — also transition pending → active on first admin reply
    const preview = hasMessage
      ? message!.trim().slice(0, 100)
      : `[Attachment] ${attachmentData![0].fileName}`;
    await d1.query(
      `UPDATE chat_session
       SET last_message_at = CURRENT_TIMESTAMP,
           last_message_preview = ?,
           unread_user_count = unread_user_count + 1,
           status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [preview, sessionId],
    );

    // Fetch admin name for Pusher payload
    const adminResult = await d1.query<{ username: string }>(
      "SELECT username FROM admin_user WHERE user_id = ?",
      [adminId],
    );
    const senderName = adminResult.results[0]?.username ?? "Admin";

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

/** Resolve a chat session */
export async function resolveSession(sessionId: number) {
  try {
    await requirePermission("chat", "edit");

    await d1.query(
      `UPDATE chat_session
       SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sessionId],
    );

    // Trigger Pusher event
    triggerChatEvent(sessionId, "session-resolved", {
      sessionId,
      resolvedAt: new Date().toISOString(),
    }).catch(() => {});

    invalidateTag(CACHE_TAGS.CHAT_SESSIONS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to resolve session"),
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
      "UPDATE chat_session SET unread_admin_count = 0, admin_last_read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
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

/** Reopen a resolved chat session */
export async function reopenSession(sessionId: number) {
  try {
    await requirePermission("chat", "edit");

    await d1.query(
      `UPDATE chat_session
       SET status = 'active', resolved_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [sessionId],
    );

    triggerChatEvent(sessionId, "session-reopened", { sessionId }).catch(
      () => {},
    );

    invalidateTag(CACHE_TAGS.CHAT_SESSIONS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reopen session"),
    };
  }
}

/** Get all distinct products discussed in a session */
export async function getSessionProducts(
  sessionId: number,
): Promise<ProductDiscussed[]> {
  await requirePermission("chat", "read");

  const result = await d1.query<{
    sale_id: number;
    rent_id: number;
    product_name: string | null;
    product_thumbnail: string | null;
    brand_name: string | null;
    mmk_price: number | null;
    usd_price: number | null;
    display_currency: string | null;
  }>(
    `SELECT DISTINCT
      COALESCE(cm.sale_listing_id, 0) AS sale_id,
      COALESCE(cm.rent_listing_id, 0) AS rent_id,
      COALESCE(em.name, am.name) AS product_name,
      pl.thumbnail_url AS product_thumbnail,
      pb.name AS brand_name,
      pl.mmk_price,
      pl.usd_price,
      pl.display_currency
    FROM chat_message cm
    LEFT JOIN sale_listing sl ON sl.id = cm.sale_listing_id
    LEFT JOIN rent_listing rl ON rl.id = cm.rent_listing_id
    LEFT JOIN product_list pl ON pl.id = COALESCE(sl.product_list_id, rl.product_list_id)
    LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
    WHERE cm.chat_session_id = ?
      AND (cm.sale_listing_id IS NOT NULL OR cm.rent_listing_id IS NOT NULL)`,
    [sessionId],
  );

  return result.results.map((row) => ({
    listingId: row.sale_id || row.rent_id,
    listingType: row.sale_id ? "sale" : "rent",
    productName: row.product_name,
    productThumbnail: row.product_thumbnail,
    brandName: row.brand_name,
    mmkPrice: row.mmk_price,
    usdPrice: row.usd_price,
    displayCurrency: row.display_currency,
  }));
}

/** Search listings by model or brand name for admin product picker */
export async function searchListings(
  query: string,
): Promise<SearchListingResult[]> {
  await requirePermission("chat", "read");

  const searchTerm = `%${query.trim()}%`;

  const result = await d1.query<{
    listing_id: number;
    listing_type: "sale" | "rent";
    product_name: string | null;
    brand_name: string | null;
    thumbnail_url: string | null;
    mmk_price: number | null;
    usd_price: number | null;
    display_currency: string | null;
  }>(
    `SELECT
      sl.id AS listing_id, 'sale' AS listing_type,
      COALESCE(em.name, am.name) AS product_name,
      pb.name AS brand_name,
      pl.thumbnail_url,
      pl.mmk_price, pl.usd_price, pl.display_currency
    FROM sale_listing sl
    JOIN product_list pl ON pl.sale_listing_id = sl.id
    LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
    WHERE sl.deleted_at IS NULL
      AND (em.name LIKE ? OR am.name LIKE ? OR pb.name LIKE ?)
    UNION ALL
    SELECT
      rl.id AS listing_id, 'rent' AS listing_type,
      COALESCE(em.name, am.name) AS product_name,
      pb.name AS brand_name,
      pl.thumbnail_url,
      pl.mmk_price, pl.usd_price, pl.display_currency
    FROM rent_listing rl
    JOIN product_list pl ON pl.rent_listing_id = rl.id
    LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
    WHERE rl.deleted_at IS NULL
      AND (em.name LIKE ? OR am.name LIKE ? OR pb.name LIKE ?)
    LIMIT 10`,
    [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
  );

  return result.results.map((row) => ({
    listingId: row.listing_id,
    listingType: row.listing_type,
    productName: row.product_name,
    brandName: row.brand_name,
    thumbnailUrl: row.thumbnail_url,
    mmkPrice: row.mmk_price,
    usdPrice: row.usd_price,
    displayCurrency: row.display_currency,
  }));
}

/** Fire a typing indicator event to the chat session */
export async function sendTypingEvent(sessionId: number) {
  triggerChatEvent(sessionId, "typing-start", {
    sender_type: "admin",
    sender_name: "Admin",
  }).catch(() => {});

  return { success: true };
}
