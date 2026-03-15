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
      au.username AS user_username,
      au.email AS user_email,
      au.phone AS user_phone,
      au.company_name AS user_company,
      au.address AS user_address,
      au.is_verified AS user_is_verified,
      bt.name AS user_business_type,
      au.created_at AS user_joined,
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
    LEFT JOIN business_type bt ON bt.business_type_id = au.business_type_id
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

  // Fetch attachments for all message IDs (batch to avoid D1's SQL variable limit)
  const messageIds = messages.map((m) => m.id);
  const BATCH_SIZE = 50;
  const allAttachments: ChatAttachment[] = [];
  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => "?").join(",");
    const batchResult = await d1.query<ChatAttachment>(
      `SELECT * FROM chat_attachment WHERE chat_message_id IN (${placeholders}) ORDER BY id ASC`,
      batch,
    );
    allAttachments.push(...batchResult.results);
  }

  // Group attachments by message ID
  const attachmentsByMessage = Map.groupBy(
    allAttachments,
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
  listingRef?: { saleListingId?: number; rentListingId?: number },
) {
  try {
    const adminId = await requirePermission("chat", "edit");

    // Validate: at least message, attachments, or listing ref
    const hasMessage = message && message.trim().length > 0;
    const hasAttachments = attachmentData && attachmentData.length > 0;
    const hasListing = listingRef?.saleListingId || listingRef?.rentListingId;
    if (!hasMessage && !hasAttachments && !hasListing) {
      return { success: false, error: "Message or attachments required" };
    }

    // Insert message (with optional listing reference)
    const saleId = listingRef?.saleListingId ?? null;
    const rentId = listingRef?.rentListingId ?? null;
    await d1.query(
      `INSERT INTO chat_message (chat_session_id, sender_type, sender_id, message, sale_listing_id, rent_listing_id)
       VALUES (?, 'admin', ?, ?, ?, ?)`,
      [sessionId, adminId, hasMessage ? message!.trim() : null, saleId, rentId],
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
    let preview: string;
    if (hasMessage) {
      preview = message!.trim().slice(0, 100);
    } else if (hasListing) {
      preview = "Shared a listing";
    } else {
      const type = attachmentData![0].fileType;
      preview = type === "application/pdf" ? "Sent a file" : "Sent a photo";
    }
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

    // Look up product details if a listing reference is included
    let productPayload: Record<string, unknown> = {};
    if (saleId || rentId) {
      const table = saleId ? "sale_listing" : "rent_listing";
      const id = saleId ?? rentId;
      const prodResult = await d1.query<{
        product_list_id: number;
        product_name: string | null;
        product_thumbnail: string | null;
        brand_name: string | null;
        custom_id: string | null;
        mmk_price: number | null;
        usd_price: number | null;
        display_currency: string | null;
      }>(
        `SELECT pl.id AS product_list_id,
                COALESCE(em.name, am.name) AS product_name,
                pl.thumbnail_url AS product_thumbnail,
                pb.name AS brand_name,
                lst.custom_id,
                lst.mmk_price, lst.usd_price, lst.display_currency
         FROM ${table} lst
         JOIN product_list pl ON pl.id = lst.product_list_id
         LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
         LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
         LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
         WHERE lst.id = ?`,
        [id],
      );
      const prod = prodResult.results[0];
      if (prod) {
        productPayload = {
          saleListingId: saleId,
          rentListingId: rentId,
          productListId: prod.product_list_id,
          productName: prod.product_name,
          productThumbnail: prod.product_thumbnail,
          productCode: prod.custom_id,
          listingType: saleId ? "sale" : "rent",
          brandName: prod.brand_name,
          mmkPrice: prod.mmk_price,
          usdPrice: prod.usd_price,
          displayCurrency: prod.display_currency,
        };
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
      ...productPayload,
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

    const readAt = new Date().toISOString();

    await d1.query(
      "UPDATE chat_session SET unread_admin_count = 0, admin_last_read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [sessionId],
    );

    // Notify mobile app that admin has read messages (for seen ticks)
    triggerChatEvent(sessionId, "messages-read", {
      reader_type: "admin",
      read_at: readAt,
    }).catch(() => {});

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
      COALESCE(sl.mmk_price, rl.mmk_price) AS mmk_price,
      COALESCE(sl.usd_price, rl.usd_price) AS usd_price,
      COALESCE(sl.display_currency, rl.display_currency) AS display_currency
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

/** Fetch all approved, visible listings for the product picker modal */
export async function getPickableListings(): Promise<
  {
    id: number;
    type: "sale" | "rent";
    name: string | null;
    brandName: string | null;
    thumbnail: string | null;
    price: number | null;
    displayCurrency: string | null;
  }[]
> {
  await requirePermission("chat", "read");

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
      sl.mmk_price, sl.usd_price, sl.display_currency
    FROM sale_listing sl
    JOIN product_list pl ON sl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
    JOIN approval_status_type ast ON sl.approve_status_id = ast.id
    WHERE sl.deleted_at IS NULL
      AND sl.is_hidden = 0
      AND pl.deleted_at IS NULL
      AND pl.is_draft = 0
      AND ast.status_name = 'Approved'
    UNION ALL
    SELECT
      rl.id AS listing_id, 'rent' AS listing_type,
      COALESCE(em.name, am.name) AS product_name,
      pb.name AS brand_name,
      pl.thumbnail_url,
      rl.mmk_price, rl.usd_price, rl.display_currency
    FROM rent_listing rl
    JOIN product_list pl ON rl.product_list_id = pl.id
    LEFT JOIN equipment_model em ON em.model_id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.model_id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.brand_id = COALESCE(em.brand_id, am.brand_id)
    JOIN approval_status_type ast ON rl.approve_status_id = ast.id
    WHERE rl.deleted_at IS NULL
      AND rl.is_hidden = 0
      AND pl.deleted_at IS NULL
      AND pl.is_draft = 0
      AND ast.status_name = 'Approved'
    ORDER BY listing_id DESC
    LIMIT 200`,
  );

  return result.results.map((row) => ({
    id: row.listing_id,
    type: row.listing_type,
    name: row.product_name,
    brandName: row.brand_name,
    thumbnail: row.thumbnail_url,
    price: row.display_currency === "USD" ? row.usd_price : row.mmk_price,
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
