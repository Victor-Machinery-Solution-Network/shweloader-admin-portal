/**
 * Read-only chat queries that are consumed by the cached page pipeline
 * (cache.ts → ChatContent with "use cache").
 *
 * INTENTIONALLY NOT a "use server" file:
 *   - Inside a Next.js "use cache" block we cannot call `auth()` or any
 *     request-scoped API, so we cannot run `requirePermission()` here.
 *   - Making this a Server Action would also expose it via the RPC layer,
 *     which would let any authenticated admin pull the full session list
 *     regardless of their chat:read permission.
 *
 * Auth is enforced one layer up:
 *   - middleware (proxy.ts) requires a session for the /chat route
 *   - the page wraps its content in <PermissionGate feature="chat">
 * so by the time these queries run, the caller is already authorized.
 *
 * Mutating chat actions live in src/lib/actions/chat.ts ("use server",
 * with requirePermission). Per-row reads called from client hooks (e.g.
 * getChatMessages, getChatSessionById, getTotalUnreadCount) also stay
 * there — they DO need RPC exposure + auth because the browser calls
 * them directly.
 */

import { d1 } from "@/lib/api/d1-client";
import type { ChatSessionWithDetails } from "@/types/chat";

/** Get all chat sessions with user and product details */
export async function getChatSessionsWithDetails(): Promise<
  ChatSessionWithDetails[]
> {
  const result = await d1.query<ChatSessionWithDetails>(
    `SELECT
      cs.id, cs.app_user_id, cs.status,
      cs.created_at, cs.updated_at, cs.resolved_at,
      cs.last_message_at,
      -- Preview the last NON-system message: the system auto-reply ("Thanks for
      -- your message…") overwrites cs.last_message_preview, but we don't want it
      -- shown in the rail — surface the user's/admin's actual last message.
      -- Mirrors the card's marker formatting ([Product Reference]/[Attachment]).
      (SELECT CASE
                WHEN m.message IS NOT NULL AND TRIM(m.message) != '' THEN m.message
                WHEN m.sale_listing_id IS NOT NULL OR m.rent_listing_id IS NOT NULL
                  THEN '[Product Reference]'
                ELSE '[Attachment]'
              END
       FROM chat_message m
       WHERE m.chat_session_id = cs.id AND m.sender_type != 'system'
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 1) AS last_message_preview,
      (SELECT sender_type FROM chat_message
         WHERE chat_session_id = cs.id AND sender_type != 'system'
         ORDER BY created_at DESC, id DESC
         LIMIT 1) AS last_message_sender_type,
      -- unread_admin_count column is GONE (per-admin model, see
      -- admin_session_read). This shared cache can't know which admin is
      -- looking (no auth() inside "use cache"), so approximate with the
      -- any-admin watermark; ChatInbox overlays the true per-admin counts
      -- via getMyUnreadCounts() after mount.
      (SELECT COUNT(*) FROM chat_message um
       WHERE um.chat_session_id = cs.id AND um.sender_type = 'user'
         AND um.created_at > COALESCE(cs.admin_last_read_at, '0')) AS unread_admin_count,
      cs.unread_user_count,
      cs.admin_last_read_at, cs.user_last_read_at,
      cs.deleted_at, cs.deleted_by,
      au.full_name AS user_name,
      au.username AS user_username,
      au.email AS user_email,
      au.phone AS user_phone,
      au.company_name AS user_company,
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

/** Get recent chat sessions (read and unread) for the notifications page */
export async function getRecentChatSessions(): Promise<
  {
    id: number;
    user_name: string;
    preview: string;
    last_message_at: string;
    unread_count: number;
  }[]
> {
  const result = await d1.query<{
    id: number;
    user_name: string;
    preview: string;
    last_message_at: string;
    unread_count: number;
  }>(
    `SELECT cs.id, au.full_name AS user_name,
            cs.last_message_preview AS preview,
            cs.last_message_at,
            (SELECT COUNT(*) FROM chat_message um
             WHERE um.chat_session_id = cs.id AND um.sender_type = 'user'
               AND um.created_at > COALESCE(cs.admin_last_read_at, '0')) AS unread_count
     FROM chat_session cs
     JOIN app_user au ON au.app_user_id = cs.app_user_id
     WHERE cs.last_message_at IS NOT NULL
       AND cs.status IN ('pending', 'active')
       AND cs.deleted_at IS NULL
     ORDER BY cs.last_message_at DESC
     LIMIT 20`,
  );
  return result.results;
}
