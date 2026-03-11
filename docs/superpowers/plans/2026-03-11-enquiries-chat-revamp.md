# Enquiries & Chat System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time chat system and enquiry reply threads to the admin portal, aligning with the React Native mobile app.

**Architecture:** Three new D1 tables (`chat_session`, `chat_message`, `chat_attachment`) share a unified message model. Enquiry threads are chat sessions linked via `enquiry_id` FK. Pusher extended from single-channel to multi-channel for real-time delivery. New `/chat` inbox page with two-panel layout. Enquiries page rewritten from DataTable to card-based layout with thread navigation.

**Tech Stack:** Next.js 16 + React 19, D1 via REST, Pusher (server + client), R2 for attachments, Auth.js v5, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-11-enquiries-chat-revamp-design.md`

---

## Chunk 1: Foundation (Schema, Types, Services, Seed, Config)

### Task 1: Add D1 Schema for Chat Tables

**Files:**
- Modify: `shweloader_d1_schema_final.sql`

- [ ] **Step 1: Add chat_session table to schema**

Add after the enquiry table section (after line ~327):

```sql
-- ─── Chat System ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_user_id INTEGER NOT NULL,
  enquiry_id INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_preview TEXT,
  unread_admin_count INTEGER NOT NULL DEFAULT 0,
  unread_user_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id),
  FOREIGN KEY (enquiry_id) REFERENCES enquiry(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_session_enquiry ON chat_session(enquiry_id) WHERE enquiry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_session_app_user ON chat_session(app_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_status ON chat_session(status);
CREATE INDEX IF NOT EXISTS idx_chat_session_last_message ON chat_session(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_session_created ON chat_session(created_at DESC);

CREATE TABLE IF NOT EXISTS chat_message (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_session_id INTEGER NOT NULL,
  sender_type TEXT NOT NULL CHECK(sender_type IN ('user', 'admin')),
  sender_id INTEGER NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_session_id) REFERENCES chat_session(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_session ON chat_message(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_created ON chat_message(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_message_session_created ON chat_message(chat_session_id, created_at);

CREATE TABLE IF NOT EXISTS chat_attachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_message_id INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_message_id) REFERENCES chat_message(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_attachment_message ON chat_attachment(chat_message_id);
```

- [ ] **Step 2: Run the CREATE TABLE statements against D1**

```bash
# Execute each CREATE TABLE/INDEX via the seed script pattern or directly via the Worker API
pnpm tsx --env-file=.env.local scripts/seed-admin.ts
```

Verify tables exist by querying: `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'chat_%'`

- [ ] **Step 3: Commit**

```bash
git add shweloader_d1_schema_final.sql
git commit -m "feat: add chat_session, chat_message, chat_attachment tables to D1 schema"
```

---

### Task 2: Create Chat Types

**Files:**
- Create: `src/types/chat.ts`

- [ ] **Step 1: Create the chat types file**

```typescript
/** Matches the chat_session table in D1 */
export interface ChatSession {
  id: number;
  app_user_id: number;
  enquiry_id: number | null;
  status: "active" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  last_message_at: string;
  last_message_preview: string;
  unread_admin_count: number;
  unread_user_count: number;
}

/** Chat session with JOINed details for display */
export interface ChatSessionWithDetails extends ChatSession {
  user_name: string;
  user_email: string | null;
  user_phone: string;
  user_company: string | null;
  /** Enquiry-linked fields (null for general support sessions) */
  product_name: string | null;
  product_thumbnail: string | null;
  /** "sale" or "rent" — use with listing_id to build URL */
  listing_type: "sale" | "rent" | null;
  listing_id: number | null;
  brand_name: string | null;
  mmk_price: number | null;
  usd_price: number | null;
  display_currency: string | null;
  partner_name: string | null;
}

/** Matches the chat_message table in D1 */
export interface ChatMessage {
  id: number;
  chat_session_id: number;
  sender_type: "user" | "admin";
  sender_id: number;
  message: string | null;
  created_at: string;
}

/** Chat message with sender name and attachments */
export interface ChatMessageWithDetails extends ChatMessage {
  sender_name: string;
  attachments: ChatAttachment[];
}

/** Matches the chat_attachment table in D1 */
export interface ChatAttachment {
  id: number;
  chat_message_id: number;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
}
```

- [ ] **Step 2: Update enquiry types**

Modify: `src/types/enquiry.ts`

Add these fields to `EnquiryWithDetails`:

```typescript
/** Linked chat session (null if no reply thread yet) */
session_id: number | null;
/** Total messages in conversation thread */
message_count: number;
/** Timestamp of most recent reply in thread */
last_reply_at: string | null;
/** Product thumbnail from product_list */
thumbnail_url: string | null;
```

- [ ] **Step 3: Commit**

```bash
git add src/types/chat.ts src/types/enquiry.ts
git commit -m "feat: add chat types and extend enquiry types with thread fields"
```

---

### Task 3: Update Constants, Cache Tags, and Route Config

**Files:**
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/cache-invalidation.ts`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add ROUTES.CHAT and CACHE_TAGS.CHAT_SESSIONS to constants**

In `src/lib/constants.ts`:

Add `CHAT: "/chat",` to `ROUTES` after the `ENQUIRIES` entry (line 44):

```typescript
ENQUIRIES: "/enquiries",
CHAT: "/chat",
```

Add `CHAT_SESSIONS: "chat-sessions",` to `CACHE_TAGS` after `ENQUIRIES` (line 110):

```typescript
ENQUIRIES: "enquiries",
CHAT_SESSIONS: "chat-sessions",
```

- [ ] **Step 2: Add /chat to ROUTE_FEATURE_MAP and LANDING_PRIORITY**

In `src/lib/auth.ts`:

Add to `ROUTE_FEATURE_MAP` array after the `enquiries` entry (line 76):

```typescript
["/chat", "chat"],
```

Add to `LANDING_PRIORITY` array after the `enquiries` entry (line 106):

```typescript
["/chat", "chat:read"],
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts src/lib/auth.ts
git commit -m "feat: add chat route, cache tag, and permission mapping"
```

---

### Task 4: Create Chat Services

**Files:**
- Create: `src/lib/services/chat.ts`

- [ ] **Step 1: Create chat service file**

```typescript
import { createService } from "@/lib/api/create-service";
import type { ChatSession, ChatMessage, ChatAttachment } from "@/types/chat";

export const chatSessionService = createService<ChatSession>("chat_session", {
  primaryKey: "id",
});

export const chatMessageService = createService<ChatMessage>("chat_message", {
  primaryKey: "id",
});

export const chatAttachmentService = createService<ChatAttachment>(
  "chat_attachment",
  { primaryKey: "id" },
);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/chat.ts
git commit -m "feat: add chat D1 services via createService"
```

---

### Task 5: Update Seed Script

**Files:**
- Modify: `scripts/seed-admin.ts`

- [ ] **Step 1: Add "Replied" to ENQUIRY_STATUS_TYPES**

Change line 72 from:

```typescript
const ENQUIRY_STATUS_TYPES = ["Pending", "Resolved"];
```

To:

```typescript
const ENQUIRY_STATUS_TYPES = ["Pending", "Resolved", "Replied"];
```

The seed script is idempotent — it will INSERT "Replied" if it doesn't exist and skip "Pending"/"Resolved" which already do. This gives Replied `id=3`.

- [ ] **Step 2: Add chat feature to FEATURES array**

Add after the `enquiries` entry (line 273, display_order 13). Shift subsequent display_order values up by 1:

In the `FEATURES` array, add after the `enquiries` entry (display_order 13):

```typescript
{ name: "chat", group_name: "Marketplace", display_order: 14 },
```

Then shift ALL subsequent entries by +1:
- `listing_templates`: 14 → 15
- `condition_types`: 15 → 16
- `users`: 16 → 17
- `partners`: 17 → 18
- `business_types`: 18 → 19
- `blacklist`: 19 → 20
- `articles`: 20 → 21
- `article_categories`: 21 → 22
- `announcements`: 22 → 23
- `carousels`: 23 → 24
- `admin_users`: 24 → 25
- `roles`: 25 → 26
- `app_settings`: 26 → 27
- `trash`: 27 → 28

Also update the group comments to reflect new ranges: `// Marketplace (10–16)`, `// Users (17–20)`, `// Content (21–24)`, `// Administration (25–28)`.

- [ ] **Step 3: Add chat to FEATURE_PERMISSION_MAP**

Add after `enquiries` entry (line 300):

```typescript
chat: ["read", "edit"],
```

- [ ] **Step 4: Run the seed script to apply changes**

```bash
pnpm tsx --env-file=.env.local scripts/seed-admin.ts
```

Verify: Check that "Replied" status exists and "chat" feature with read/edit permissions is created. The Super Admin role auto-gets all new permissions.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-admin.ts
git commit -m "feat: seed 'Replied' enquiry status and 'chat' feature with permissions"
```

---

### Task 6: Create Chat Server Actions

**Files:**
- Create: `src/lib/actions/chat.ts`

- [ ] **Step 1: Create the chat actions file with data fetching**

```typescript
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
  await requirePermission("chat", "read");

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
      p.company_name AS partner_name
    FROM chat_session cs
    JOIN app_user au ON au.app_user_id = cs.app_user_id
    LEFT JOIN enquiry e ON e.id = cs.enquiry_id AND e.deleted_at IS NULL
    LEFT JOIN sale_listing sl ON sl.id = e.sale_listing_id
    LEFT JOIN rent_listing rl ON rl.id = e.rent_listing_id
    LEFT JOIN product_list pl ON pl.id = COALESCE(sl.product_list_id, rl.product_list_id)
    LEFT JOIN equipment_model em ON em.id = pl.equipment_model_id
    LEFT JOIN attachment_model am ON am.id = pl.attachment_model_id
    LEFT JOIN product_brand pb ON pb.id = COALESCE(em.brand_id, am.brand_id)
    LEFT JOIN partner p ON p.id = pl.partner_id
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/chat.ts
git commit -m "feat: add chat server actions (sessions, messages, send, close)"
```

---

### Task 7: Update Enquiry Server Actions

**Files:**
- Modify: `src/lib/actions/enquiry.ts`

- [ ] **Step 1: Update getEnquiriesWithDetails query**

Replace the existing `getEnquiriesWithDetails` function body (lines 13-61) with a new query that adds LEFT JOINs for `chat_session` and message count subquery. Also adds `pl.thumbnail_url`:

```typescript
export async function getEnquiriesWithDetails(): Promise<
  EnquiryWithDetails[]
> {
  const result = await d1.query<EnquiryWithDetails>(
    `SELECT
       e.id,
       e.sale_listing_id,
       e.rent_listing_id,
       e.app_user_id,
       e.message,
       e.enquiry_status_id,
       e.created_at,
       e.updated_at,
       e.updated_by,
       est.status_name,
       c.full_name AS user_name,
       c.email AS user_email,
       c.phone AS user_phone,
       c.company_name AS user_company,
       CASE
         WHEN e.sale_listing_id IS NOT NULL THEN
           (SELECT COALESCE(em.name, am.name) FROM sale_listing sl
            JOIN product_list pl ON sl.product_list_id = pl.id
            LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
            LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
            WHERE sl.id = e.sale_listing_id
            LIMIT 1)
         WHEN e.rent_listing_id IS NOT NULL THEN
           (SELECT COALESCE(em.name, am.name) FROM rent_listing rl
            JOIN product_list pl ON rl.product_list_id = pl.id
            LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
            LEFT JOIN attachment_model am ON pl.attachment_model_id = am.model_id
            WHERE rl.id = e.rent_listing_id
            LIMIT 1)
         ELSE NULL
       END AS model_name,
       CASE
         WHEN e.sale_listing_id IS NOT NULL THEN 'sale'
         WHEN e.rent_listing_id IS NOT NULL THEN 'rent'
         ELSE NULL
       END AS listing_type,
       CASE
         WHEN e.sale_listing_id IS NOT NULL THEN
           (SELECT pl.thumbnail_url FROM sale_listing sl
            JOIN product_list pl ON sl.product_list_id = pl.id
            WHERE sl.id = e.sale_listing_id LIMIT 1)
         WHEN e.rent_listing_id IS NOT NULL THEN
           (SELECT pl.thumbnail_url FROM rent_listing rl
            JOIN product_list pl ON rl.product_list_id = pl.id
            WHERE rl.id = e.rent_listing_id LIMIT 1)
         ELSE NULL
       END AS thumbnail_url,
       cs.id AS session_id,
       COALESCE(cm_agg.message_count, 0) AS message_count,
       cm_agg.last_reply_at
     FROM enquiry e
     LEFT JOIN enquiry_status_type est ON e.enquiry_status_id = est.id
     LEFT JOIN app_user c ON e.app_user_id = c.app_user_id
     LEFT JOIN chat_session cs ON cs.enquiry_id = e.id
     LEFT JOIN (
       SELECT chat_session_id, COUNT(*) AS message_count, MAX(created_at) AS last_reply_at
       FROM chat_message
       GROUP BY chat_session_id
     ) cm_agg ON cm_agg.chat_session_id = cs.id
     WHERE e.deleted_at IS NULL
     ORDER BY e.created_at DESC`,
  );
  return result.results;
}
```

- [ ] **Step 2: Remove updateEnquiryStatus function**

Delete the `updateEnquiryStatus` function (lines 73-96). Status is now action-driven via chat actions.

- [ ] **Step 3: Update deleteEnquiry to close linked chat session**

After the soft-delete query in `deleteEnquiry`, add:

```typescript
// Close linked chat session (preserve message history)
await d1.query(
  `UPDATE chat_session SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
   WHERE enquiry_id = ?`,
  [enquiryId],
).catch(() => {}); // Non-critical — don't fail the delete
```

Add `CACHE_TAGS.CHAT_SESSIONS` to the invalidateTag call.

- [ ] **Step 4: Update deleteEnquiries (bulk) similarly**

After the bulk soft-delete query, add:

```typescript
// Close linked chat sessions
await d1.query(
  `UPDATE chat_session SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
   WHERE enquiry_id IN (${placeholders})`,
  [...ids],
).catch(() => {});
```

Add `CACHE_TAGS.CHAT_SESSIONS` to the invalidateTag call.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/enquiry.ts
git commit -m "feat: update enquiry actions with chat session joins and cascade close"
```

---

### Task 8: Add Cache Layer Functions

**Files:**
- Modify: `src/lib/cache.ts`

- [ ] **Step 1: Add chat imports and cache functions**

Add imports at the top of `src/lib/cache.ts`:

```typescript
import {
  getChatSessionsWithDetails as fetchChatSessions,
  getTotalUnreadCount as fetchTotalUnread,
} from "@/lib/actions/chat";
```

Note: `getChatMessages` is intentionally NOT added to `cache.ts` — messages are fetched fresh on session open and updated in real-time via Pusher. Import directly from `@/lib/actions/chat` where needed.

Add at the bottom before the permissions section:

```typescript
// Chat

export function getChatSessions() {
  return fetchChatSessions();
}

export function getChatUnreadCount() {
  return fetchTotalUnread();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cache.ts
git commit -m "feat: add chat cache layer functions"
```

---

### Task 9: Extend Pusher Server Helpers

**Files:**
- Modify: `src/lib/pusher.ts`

- [ ] **Step 1: Add triggerChatEvent and triggerAdminChatEvent functions**

Add after the existing `triggerNotificationBatch` function:

```typescript
/**
 * Trigger a chat event on a session's private channel.
 * Channel name: `private-chat-{sessionId}`
 */
export async function triggerChatEvent(
  sessionId: number,
  eventName: string,
  data: Record<string, unknown>,
): Promise<void> {
  const pusher = getPusher();
  await pusher.trigger(`private-chat-${sessionId}`, eventName, data);
}

/**
 * Trigger an event on the admin chat inbox channel.
 * Channel name: `private-admin-chat`
 */
export async function triggerAdminChatEvent(
  eventName: string,
  data: Record<string, unknown>,
): Promise<void> {
  const pusher = getPusher();
  await pusher.trigger("private-admin-chat", eventName, data);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pusher.ts
git commit -m "feat: add Pusher trigger helpers for chat channels"
```

---

### Task 10: Extend Pusher Auth Endpoint

**Files:**
- Modify: `src/app/api/pusher/auth/route.ts`

- [ ] **Step 1: Replace single-channel check with multi-channel authorization**

Replace lines 24-28 (the strict channel check) with:

```typescript
  // Authorize based on channel pattern
  if (channelName === `private-user-${session.user.id}`) {
    // Existing: user's notification channel
  } else if (channelName.startsWith("private-chat-")) {
    // Chat session channel — any admin with chat:read
    if (!session.user.permissions?.includes("chat:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (channelName === "private-admin-chat") {
    // Admin chat inbox channel
    if (!session.user.permissions?.includes("chat:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/pusher/auth/route.ts
git commit -m "feat: extend Pusher auth for chat channel authorization"
```

---

### Task 11: Extend PusherProvider for Multi-Channel

**Files:**
- Modify: `src/components/providers/pusher-provider.tsx`

- [ ] **Step 1: Add subscribeToChannel to context and provider**

Replace the entire file content with:

```typescript
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useSession, signOut } from "next-auth/react";
import PusherClient from "pusher-js";
import type { Channel } from "pusher-js";

type Listener = { event: string; callback: (data: unknown) => void };

interface ChannelHandle {
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
  unsubscribe: () => void;
}

interface PusherContextValue {
  /** Subscribe to an event on the user's private channel (existing API) */
  subscribe: (event: string, callback: (data: unknown) => void) => () => void;
  /** Subscribe to an arbitrary private channel. Returns a handle with subscribe/unsubscribe. */
  subscribeToChannel: (channelName: string) => ChannelHandle;
}

const PusherContext = createContext<PusherContextValue>({
  subscribe: () => () => {},
  subscribeToChannel: () => ({
    subscribe: () => () => {},
    unsubscribe: () => {},
  }),
});

export function PusherProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pusherRef = useRef<PusherClient | null>(null);
  const userChannelRef = useRef<Channel | null>(null);
  const channelsRef = useRef<Map<string, { channel: Channel; refCount: number }>>(new Map());
  const listenersRef = useRef<Set<Listener>>(new Set());

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (status !== "authenticated" || !session?.user?.id || !key || !cluster) {
      return;
    }

    const pusher = new PusherClient(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
    });
    pusherRef.current = pusher;

    // Subscribe to the user's private channel (existing behavior)
    const userChannel = pusher.subscribe(`private-user-${session.user.id}`);
    userChannelRef.current = userChannel;

    // Listen for session revocation
    userChannel.bind("session-revoked", async () => {
      await signOut({ redirect: false });
      window.location.href = "/login";
    });

    // Bind any listeners that were registered before the channel was ready
    for (const listener of listenersRef.current) {
      userChannel.bind(listener.event, listener.callback);
    }

    return () => {
      // Cleanup all channels
      for (const [name, entry] of channelsRef.current) {
        entry.channel.unbind_all();
        pusher.unsubscribe(name);
      }
      channelsRef.current.clear();

      userChannel.unbind_all();
      pusher.unsubscribe(`private-user-${session.user.id}`);
      pusher.disconnect();
      pusherRef.current = null;
      userChannelRef.current = null;
    };
  }, [status, session?.user?.id]);

  // Existing subscribe for user channel
  const subscribe = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      const listener: Listener = { event, callback };
      listenersRef.current.add(listener);

      const channel = userChannelRef.current;
      if (channel) {
        channel.bind(event, callback);
      }

      return () => {
        listenersRef.current.delete(listener);
        const ch = userChannelRef.current;
        if (ch) {
          ch.unbind(event, callback);
        }
      };
    },
    [],
  );

  // New: subscribe to an arbitrary channel
  const subscribeToChannel = useCallback(
    (channelName: string): ChannelHandle => {
      const pusher = pusherRef.current;

      // Get or create channel subscription
      let entry = channelsRef.current.get(channelName);
      if (!entry && pusher) {
        const channel = pusher.subscribe(channelName);
        entry = { channel, refCount: 0 };
        channelsRef.current.set(channelName, entry);
      }

      entry = channelsRef.current.get(channelName);
      if (entry) entry.refCount++;

      return {
        subscribe: (event: string, callback: (data: unknown) => void) => {
          const ch = channelsRef.current.get(channelName)?.channel;
          if (ch) {
            ch.bind(event, callback);
          }
          return () => {
            const c = channelsRef.current.get(channelName)?.channel;
            if (c) {
              c.unbind(event, callback);
            }
          };
        },
        unsubscribe: () => {
          const e = channelsRef.current.get(channelName);
          if (e) {
            e.refCount--;
            if (e.refCount <= 0) {
              e.channel.unbind_all();
              pusherRef.current?.unsubscribe(channelName);
              channelsRef.current.delete(channelName);
            }
          }
        },
      };
    },
    [],
  );

  return (
    <PusherContext value={{ subscribe, subscribeToChannel }}>
      {children}
    </PusherContext>
  );
}

export function usePusher() {
  return useContext(PusherContext);
}
```

- [ ] **Step 2: Verify existing notification hook still works**

Check `src/hooks/use-notifications.ts` — it uses `subscribe` from `usePusher()` which is preserved. No changes needed.

- [ ] **Step 3: Commit**

```bash
git add src/components/providers/pusher-provider.tsx
git commit -m "feat: extend PusherProvider with multi-channel subscription support"
```

---

## Chunk 2: Chat UI Components

### Task 12: Create Chat Hook

**Files:**
- Create: `src/hooks/use-chat.ts`

- [ ] **Step 1: Create the chat Pusher hooks**

```typescript
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePusher } from "@/components/providers/pusher-provider";
import {
  getChatMessages,
  markSessionRead,
  getTotalUnreadCount,
} from "@/lib/actions/chat";
import type { ChatMessageWithDetails } from "@/types/chat";

/** Hook for real-time messages in an active chat session */
export function useChatMessages(sessionId: number | null, initialUnreadCount = 0) {
  const [messages, setMessages] = useState<ChatMessageWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);
  const { subscribeToChannel } = usePusher();
  const mountedRef = useRef(true);

  // Fetch messages on session change
  useEffect(() => {
    mountedRef.current = true;
    if (!sessionId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    getChatMessages(sessionId).then((msgs) => {
      if (!mountedRef.current) return;
      setMessages(msgs);
      setIsLoading(false);
    });

    // Mark as read only if there are unread messages
    if (initialUnreadCount > 0) {
      markSessionRead(sessionId).catch(() => {});
    }

    return () => {
      mountedRef.current = false;
    };
  }, [sessionId, initialUnreadCount]);

  // Pusher subscription for new messages
  useEffect(() => {
    if (!sessionId) return;

    const handle = subscribeToChannel(`private-chat-${sessionId}`);

    const unsubMessage = handle.subscribe("new-message", (data: unknown) => {
      const msg = data as ChatMessageWithDetails & { attachments?: unknown[] };
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          attachments: (msg.attachments ?? []) as ChatMessageWithDetails["attachments"],
        },
      ]);
    });

    // Listen for session-closed to update UI in real-time
    const unsubClosed = handle.subscribe("session-closed", () => {
      setSessionClosed(true);
    });

    return () => {
      unsubMessage();
      unsubClosed();
      handle.unsubscribe();
    };
  }, [sessionId, subscribeToChannel]);

  return { messages, isLoading, setMessages, sessionClosed };
}

/** Hook for inbox-level real-time updates */
export function useChatInbox() {
  const [totalUnread, setTotalUnread] = useState(0);
  const router = useRouter();
  const { subscribeToChannel } = usePusher();
  const mountedRef = useRef(true);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    getTotalUnreadCount().then((count) => {
      if (mountedRef.current) setTotalUnread(count);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Pusher subscription for inbox updates
  useEffect(() => {
    const handle = subscribeToChannel("private-admin-chat");

    const unsubSession = handle.subscribe("new-chat-session", () => {
      // Refetch unread count and refresh server components
      getTotalUnreadCount().then((count) => {
        if (mountedRef.current) setTotalUnread(count);
      });
      router.refresh();
    });

    // Listen for messages on existing sessions to update inbox (unread counts, preview)
    const unsubMessage = handle.subscribe("new-message", () => {
      getTotalUnreadCount().then((count) => {
        if (mountedRef.current) setTotalUnread(count);
      });
      router.refresh();
    });

    return () => {
      unsubSession();
      unsubMessage();
      handle.unsubscribe();
    };
  }, [subscribeToChannel, router]);

  const refreshUnread = useCallback(() => {
    getTotalUnreadCount().then((count) => {
      if (mountedRef.current) setTotalUnread(count);
    });
  }, []);

  return { totalUnread, refreshUnread };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-chat.ts
git commit -m "feat: add useChatMessages and useChatInbox hooks with Pusher"
```

---

### Task 13: Create Chat UI Components

**Files:**
- Create: `src/components/features/chat/chat-inbox.tsx`
- Create: `src/components/features/chat/session-list.tsx`
- Create: `src/components/features/chat/session-card.tsx`
- Create: `src/components/features/chat/conversation-panel.tsx`
- Create: `src/components/features/chat/message-bubble.tsx`
- Create: `src/components/features/chat/chat-input-bar.tsx`
- Create: `src/components/features/chat/product-ref-card.tsx`

This is the largest task. Each component follows the mockup from the design spec (Section 4.1). The implementer should:

- [ ] **Step 1: Create `product-ref-card.tsx`**

A simple display card showing product thumbnail, model name, brand, listing type, price, and partner. Includes a "View Listing" link that navigates to `/listings/for-sale/{id}/edit` or `/listings/for-rent/{id}/edit` based on `listing_type` and `listing_id`.

Props: `{ productName, productThumbnail, listingType, listingId, brandName, mmkPrice, usdPrice, displayCurrency, partnerName }` — all from `ChatSessionWithDetails`.

- [ ] **Step 2: Create `message-bubble.tsx`**

Renders a single chat message. User messages left-aligned with gray bg, admin messages right-aligned with primary bg. Shows sender initials avatar, message text, timestamp. Renders image attachments inline (clickable for full-size), and PDF attachments as file icon + name link.

Props: `{ message: ChatMessageWithDetails, isAdmin: boolean }`

- [ ] **Step 3: Create `chat-input-bar.tsx`**

Input bar with: (1) attachment button opening file picker (accept: image/jpeg,image/png,image/webp,image/gif,application/pdf, max 5 files), (2) multiline textarea (placeholder: "Type a message..."), (3) send button. Shows attachment preview bar above input when files are selected. Calls `onSend(message, files)` on submit. Send on Enter, Shift+Enter for newline.

Props: `{ onSend: (message: string, files: File[]) => void, disabled?: boolean }`

Note: The spec lists a separate `chat-image-upload.tsx` file. That responsibility is subsumed into this component — the attachment picker, preview bar, and file validation all live in `chat-input-bar.tsx`. No separate upload UI component is needed.

- [ ] **Step 4: Create `session-card.tsx`**

A sidebar list item for a chat session. Shows user name, relative time, session type label ("Enquiry · {productName}" with amber dot, or "General Support"), last message preview, unread badge. Highlights when selected (blue left border). Dimmed when closed.

Props: `{ session: ChatSessionWithDetails, isSelected: boolean, onClick: () => void }`

- [ ] **Step 5: Create `session-list.tsx`**

Left panel containing filter tabs (All, Unread, Enquiries, Closed with counts), search input, and scrollable list of `SessionCard` components. Handles filtering and search logic. Sorted by `last_message_at DESC`.

Props: `{ sessions: ChatSessionWithDetails[], selectedId: number | null, onSelect: (id: number) => void }`

- [ ] **Step 6: Create `conversation-panel.tsx`**

Right panel containing: header (user info + close button), product ref card (if enquiry-linked), scrollable messages area, and input bar. Uses `useChatMessages` hook for real-time updates. Handles `sendMessage` server action and R2 upload for attachments. Auto-scrolls to bottom on new messages.

Props: `{ session: ChatSessionWithDetails | null, onSessionClosed: () => void }`

Note: Implement text-only sending first. Attachment upload via `uploadChatAttachments` (Chunk 4, Task 19) will be wired in after that action is created. For now, the `onSend` handler should call `sendMessage(sessionId, message, null)` and the files parameter can be accepted but not uploaded yet.

- [ ] **Step 7: Create `chat-inbox.tsx`**

The main client component that composes `SessionList` + `ConversationPanel` in a two-panel flex layout. Manages selected session state. Passes `sessions` from server and wires up selection.

Props: `{ sessions: ChatSessionWithDetails[] }`

- [ ] **Step 8: Run type check**

```bash
pnpm tsc --noEmit 2>&1 | tail -20
```

Fix any type errors before committing.

- [ ] **Step 9: Commit**

```bash
git add src/components/features/chat/
git commit -m "feat: add chat inbox UI components (session list, conversation, input bar)"
```

---

### Task 14: Create Chat Page

**Files:**
- Create: `src/app/(dashboard)/chat/page.tsx`

- [ ] **Step 1: Create the chat page**

```typescript
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getChatSessions } from "@/lib/cache";
import { ChatInbox } from "@/components/features/chat/chat-inbox";

export const metadata = {
  title: "Chat",
  description: "Real-time chat with users",
};

export default function ChatPage() {
  return (
    <>
      <PageHeader
        title="Chat"
        description="Real-time conversations with users"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="chat">
          <ChatContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function ChatContent() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  cacheTag(CACHE_TAGS.CHAT_SESSIONS);

  const sessions = await getChatSessions();
  return <ChatInbox sessions={sessions} />;
}
```

Note: Shorter cache TTL than other pages (30s stale) since chat is more time-sensitive. Real-time updates come via Pusher; the cache is just for initial load.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/chat/page.tsx
git commit -m "feat: add /chat page with PPR caching"
```

---

## Chunk 3: Enquiries Page Revamp & Sidebar

### Task 15: Create Enquiry Card Component

**Files:**
- Create: `src/components/features/enquiries/enquiry-card.tsx`

- [ ] **Step 1: Create the enquiry card**

A card component showing: product thumbnail, user name + company, product model + listing type badge, message preview, status indicator (Pending=amber, Replied=green, Resolved=purple), relative timestamp, thread preview ("{N} messages · Last reply {time}"), action button (Reply/View Thread), and overflow menu with delete option.

This is a `"use client"` component. It needs `useRouter` from `next/navigation` and `useTransition` for the async server action call.

Props: `{ enquiry: EnquiryWithDetails, canDelete: boolean, canChat: boolean }`

Imports: `createSessionForEnquiry` from `@/lib/actions/chat`, `deleteEnquiry` from `@/lib/actions/enquiry`.

The "Reply" button wraps `createSessionForEnquiry(enquiryId)` in a transition, awaits the result to get `sessionId`, then calls `router.push(\`/chat?session=${sessionId}\`)`. The "View Thread" button navigates directly to `/chat?session={session_id}` using the existing `session_id` from `EnquiryWithDetails`.

- [ ] **Step 2: Commit**

```bash
git add src/components/features/enquiries/enquiry-card.tsx
git commit -m "feat: add enquiry card component with thread navigation"
```

---

### Task 16: Rewrite Enquiries Client

**Files:**
- Modify: `src/components/features/enquiries/enquiries-client.tsx`

- [ ] **Step 1: Rewrite from DataTable to card layout**

Replace the existing DataTable-based implementation with:
- Filter tabs (All, Pending, Replied, Resolved) with counts
- Search bar filtering across user_name, user_company, model_name, message
- Dropdown filter for listing type (All / For Sale / For Rent) — from existing filter config
- Date range filter (date picker) on `enquiry.created_at` — from existing filter config
- List of `EnquiryCard` components
- Empty state when no enquiries

The component receives `enquiries: EnquiryWithDetails[]` and `statusTypes: EnquiryStatusType[]` (same props as before). Derives `canDelete` from `useHasPermission("enquiries", "delete")` and `canChat` from `useHasPermission("chat", "edit")`, then passes both to each `EnquiryCard` component.

- [ ] **Step 2: Commit**

```bash
git add src/components/features/enquiries/enquiries-client.tsx
git commit -m "feat: rewrite enquiries client to card-based layout with status tabs"
```

---

### Task 17: Delete Old Enquiry Components

**Files:**
- Delete: `src/components/features/enquiries/columns.tsx`
- Delete: `src/components/features/enquiries/row-actions.tsx`
- Delete: `src/components/features/enquiries/enquiry-detail-dialog.tsx`

- [ ] **Step 1: Delete the old files**

```bash
rm src/components/features/enquiries/columns.tsx
rm src/components/features/enquiries/row-actions.tsx
rm src/components/features/enquiries/enquiry-detail-dialog.tsx
```

- [ ] **Step 2: Verify enquiries page still compiles**

```bash
pnpm build 2>&1 | head -50
```

- [ ] **Step 3: Commit**

```bash
git add -u src/components/features/enquiries/
git commit -m "refactor: remove old enquiry DataTable components (columns, row-actions, detail-dialog)"
```

---

### Task 18: Update Sidebar with Chat Nav Item

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Add Headset import**

Add `Headset` to the lucide-react import (line 31):

```typescript
import { Headset } from "lucide-react";
```

- [ ] **Step 2: Update showMarketplace condition**

Change line 112 from:

```typescript
const showMarketplace = showListings || canRead("enquiries");
```

To:

```typescript
const showMarketplace = showListings || canRead("enquiries") || canRead("chat");
```

- [ ] **Step 3: Add Chat nav item after Enquiries**

After the Enquiries `SidebarMenuItem` block (line 386), add:

```tsx
{canRead("chat") && (
<SidebarMenuItem>
  <SidebarMenuButton asChild isActive={pathname === ROUTES.CHAT}>
    <Link href={ROUTES.CHAT}><Headset aria-hidden="true" /><span>Chat</span></Link>
  </SidebarMenuButton>
</SidebarMenuItem>
)}
```

Note: The unread badge can be added in a follow-up after the `useChatInbox` hook is integrated. For now, just the nav link.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: add Chat nav item to sidebar with Headset icon"
```

---

## Chunk 4: R2 Upload & Integration

### Task 19: Create Chat Attachment Upload Action

**Files:**
- Create: `src/lib/actions/chat-upload.ts`

- [ ] **Step 1: Create the upload action**

Follow the existing R2 upload pattern from `src/lib/api/r2-client.ts` and `src/lib/actions/upload-helpers.ts`:

```typescript
"use server";

import { requirePermission } from "@/lib/actions/utils";
import { uploadToR2 } from "@/lib/api/r2-client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export async function uploadChatAttachments(
  sessionId: number,
  formData: FormData,
) {
  await requirePermission("chat", "edit");

  const files = formData.getAll("files") as File[];
  if (files.length === 0) return { success: true, attachments: [] };
  if (files.length > MAX_FILES) {
    return { success: false, error: `Maximum ${MAX_FILES} files per message` };
  }

  const results: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return { success: false, error: `File type not allowed: ${file.type}` };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: `File too large: ${file.name} (max 10MB)` };
    }

    // Generate unique filename per spec: chat/{sessionId}/{timestamp}-{randomId}.{ext}
    const ext = file.name.split(".").pop() ?? "bin";
    const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const r2Path = `chat/${sessionId}/`;
    const result = await uploadToR2(file, r2Path, uniqueName);
    results.push({
      fileUrl: result.url,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  }

  return { success: true, attachments: results };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/chat-upload.ts
git commit -m "feat: add R2 upload action for chat attachments"
```

---

### Task 20: Final Build Verification

- [ ] **Step 1: Run type check**

```bash
pnpm tsc --noEmit 2>&1 | tail -20
```

Fix any type errors.

- [ ] **Step 2: Run build**

```bash
pnpm build 2>&1 | tail -30
```

Fix any build errors.

- [ ] **Step 3: Run dev server and test manually**

```bash
pnpm dev
```

Verify:
- `/chat` page loads with empty state
- `/enquiries` page loads with card layout
- Sidebar shows Chat nav item
- Permissions work (non-chat-permission admin can't access /chat)

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
# Stage only the specific files that were fixed
git add <fixed-files>
git commit -m "fix: resolve build issues from chat system implementation"
```
