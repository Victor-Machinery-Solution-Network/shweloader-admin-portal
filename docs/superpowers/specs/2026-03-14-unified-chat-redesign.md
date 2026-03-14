# Unified Chat Redesign — Merging Enquiries into Chat

**Date:** 2026-03-14
**Status:** Approved

## Problem

The current system has two separate but tightly coupled features:

1. **Enquiry** — a table storing a user's product inquiry with its own status tracking (Pending/Replied/Resolved)
2. **Chat Session** — a conversation thread that gets created when an admin replies to an enquiry

This leads to:
- **Redundant status tracking** — enquiry status mirrors chat session status, kept in sync via auto-transitions
- **Split first message** — the enquiry text lives on the `enquiry` table, all replies live in `chat_message`
- **Unnecessary intermediary step** — admin must "Reply" to create a session before chatting
- **Two separate pages** (`/enquiries` and `/chat`) for what is one workflow
- **One product per session** — user enquires about multiple products, gets multiple disconnected sessions

## Solution

Merge the enquiry concept into chat. A chat session is the single unit of conversation. Products are referenced at the **message level**, not the session level.

### Core Principles

1. **One session per user** (not per product) — the conversation is continuous
2. **Products are message-level references** — like sharing a link in WhatsApp
3. **Both sides can share products** — user enquires, admin recommends
4. **Single source of truth for status** — one status field on `chat_session`
5. **Delete the `/enquiries` page** — everything lives under `/chat`

---

## Data Model

### Tables to DROP

- `enquiry`
- `enquiry_status_type`

### Updated `chat_session`

```sql
CREATE TABLE IF NOT EXISTS chat_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_user_id INTEGER NOT NULL,
    -- No listing columns — products are on messages
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'active', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_preview TEXT,
    unread_admin_count INTEGER NOT NULL DEFAULT 0,
    unread_user_count INTEGER NOT NULL DEFAULT 0,
    -- Read cursors for sent/seen status (WhatsApp-style)
    admin_last_read_at TIMESTAMP,
    user_last_read_at TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id)
);

-- One active session per user (prevents duplicates)
CREATE UNIQUE INDEX idx_session_active_per_user
ON chat_session(app_user_id)
WHERE status != 'resolved' AND deleted_at IS NULL;
```

### Updated `chat_message`

```sql
CREATE TABLE IF NOT EXISTS chat_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_session_id INTEGER NOT NULL,
    sender_type TEXT NOT NULL CHECK(sender_type IN ('user', 'admin')),
    sender_id INTEGER NOT NULL,
    message TEXT,
    -- Product reference (optional — makes this a "product message")
    sale_listing_id INTEGER,
    rent_listing_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_session_id) REFERENCES chat_session(id),
    FOREIGN KEY (sale_listing_id) REFERENCES sale_listing(id),
    FOREIGN KEY (rent_listing_id) REFERENCES rent_listing(id),
    CHECK (
        (sale_listing_id IS NULL AND rent_listing_id IS NULL)
        OR (sale_listing_id IS NOT NULL AND rent_listing_id IS NULL)
        OR (sale_listing_id IS NULL AND rent_listing_id IS NOT NULL)
    )
);
```

### `chat_attachment` — Unchanged

```sql
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
```

---

## Message Types

Every `chat_message` row is one of three types, determined by its content:

| Type | `message` | `sale/rent_listing_id` | `chat_attachment` rows | Rendered as |
|---|---|---|---|---|
| **Text** | present | NULL | none | Text bubble |
| **Media** | optional | NULL | 1+ attachments | Text bubble + image/file previews |
| **Product** | optional | set | none | Text bubble + product card |

A message can have text + product ref, or text + attachments, but not product ref + attachments (a product card IS the rich content). This is an **application-level invariant** enforced in the `sendMessage` action and worker API — not a DB constraint, since the CHECK would be complex and fragile across two FKs + attachment table.

---

## Message Delivery Status (Sent / Seen)

WhatsApp-style read receipts using **session-level read cursors** — no per-message status column needed.

### Schema

Two timestamp columns on `chat_session`:

- `admin_last_read_at` — updated when admin opens/views a session
- `user_last_read_at` — updated when user opens/views a session on mobile

### How It Works

**For admin messages** (shown in admin UI):
- `message.created_at <= user_last_read_at` → **Seen** (double blue tick ✓✓)
- `message.created_at > user_last_read_at` (or `user_last_read_at` is NULL) → **Sent** (single gray tick ✓)

**For user messages** (shown in mobile app):
- `message.created_at <= admin_last_read_at` → **Seen**
- `message.created_at > admin_last_read_at` → **Sent**

### Update Triggers

| Action | Update | Side Effect |
|---|---|---|
| Admin opens/views a session | `admin_last_read_at = NOW()`, `unread_admin_count = 0` | Pusher event `messages-read` on `private-chat-{sessionId}` so mobile app updates ticks in real-time |
| User opens/views a session | `user_last_read_at = NOW()`, `unread_user_count = 0` | Pusher event `messages-read` on `private-chat-{sessionId}` so admin UI updates ticks in real-time |

The existing `markSessionRead` action is extended to also set the read cursor and fire the Pusher event. The mobile app needs a corresponding endpoint/action.

### UI Display

On the admin's message bubbles (right-aligned, sent by admin):
- Below the timestamp: single gray ✓ (sent) or double blue ✓✓ (seen)
- Only shown on the **last message** in a consecutive admin group (to avoid visual noise)

---

## Typing Indicator

Real-time only — no database persistence.

### Pusher Events

Channel: `private-chat-{sessionId}`

| Event | Payload | Trigger |
|---|---|---|
| `typing-start` | `{ sender_type, sender_name }` | User or admin starts typing (debounced, fires once per ~2s while typing continues) |

### Client Behavior

**Sending side (admin UI):**
- On `input` event in ChatInputBar, debounce and send `typing-start` via Pusher
- Debounce interval: 2 seconds (don't spam events on every keystroke)

**Receiving side (admin UI):**
- Listen for `typing-start` events where `sender_type = 'user'`
- Show "{user_name} is typing..." below the last message
- Auto-clear after 3 seconds of no `typing-start` events (use a timeout reset pattern)

**Mobile app:**
- Same pattern in reverse — listen for `sender_type = 'admin'` events

### UI Display

- Typing indicator appears at the bottom of the messages area, just above the input bar
- Shows as a subtle animated indicator: "{Name} is typing..." with a pulsing dot animation
- Disappears when: a new message arrives from the typer, or 3 seconds of inactivity

---

## Status Lifecycle

```
pending ──→ active ──→ resolved
  │                       ↑ ↓
  └──────→ resolved    active (reopen)
```

### Valid Transitions

| From | To | Trigger |
|---|---|---|
| `pending` → `active` | Admin sends first reply |
| `pending` → `resolved` | Admin resolves without replying (spam, junk) |
| `active` → `resolved` | Admin clicks "Resolve" |
| `resolved` → `active` | User sends new message OR admin clicks "Reopen" |

### Transition Details

- **`pending → active`**: Automatic when admin sends first reply. `updated_at` set.
- **`pending → resolved`**: Admin explicitly resolves without replying (e.g., spam). `resolved_at` set.
- **`active → resolved`**: Admin clicks "Resolve". `resolved_at` set.
- **`resolved → active`**: When a user sends a message to a resolved session, the session reopens. `resolved_at` cleared to NULL. `unread_admin_count` incremented. Session appears in "Unread" tab. Also triggered by admin clicking "Reopen".

---

## Duplicate Prevention

**Rule: One active conversation per user.**

| Scenario | Behavior |
|---|---|
| User has no active session → sends message or enquires | New session created (`pending`) |
| User has `pending` session → enquires about a product | Product message added to existing session |
| User has `active` session → enquires about another product | Product message added to existing session |
| User has `resolved` session → sends message | Session reopens (`resolved → active`) |

Enforced by partial unique index: `idx_session_active_per_user` on `app_user_id WHERE status != 'resolved' AND deleted_at IS NULL`.

---

## Edge Cases

### User-Initiated Flows

| # | Scenario | Behavior |
|---|---|---|
| 1 | User starts general support | New session (`pending`), first message as `chat_message` |
| 2 | User enquires about Product A | New/existing session, product message sent |
| 3 | User enquires about Product A, already has pending/active session | Product message added to existing session (no duplicate session) |
| 4 | User enquires about Product A after resolved session | Session reopens (`resolved → active`), product message sent |
| 5 | User enquires about Products A and B | Same session, two product messages |
| 6 | User has general chat, then enquires about a product | Same session, product message added |
| 7 | User sends message to resolved session | Session reopens, message delivered, admin sees in "Unread" |

### Listing-Related

| # | Scenario | Behavior |
|---|---|---|
| 8 | Product deleted while referenced in messages | Product card shows "Listing unavailable." Conversation continues. Query uses LEFT JOIN. |
| 9 | Listing price/details change | Product cards show live data (JOIN). Original message text preserves what user asked. |

### Admin-Side

| # | Scenario | Behavior |
|---|---|---|
| 10 | Admin resolves → user sends new message | Session reopens (`resolved → active`). Appears in "Unread." |
| 11 | Admin soft-deletes a session | Hidden from admin view. User's mobile app shows session as ended. Soft-delete is admin-only visibility (not added to trash entity system — no restore from trash page). |
| 12 | Admin wants to reopen resolved session | "Reopen" button. `resolved → active`, `resolved_at` cleared. |
| 13 | Two admins open same pending session | Pusher presence: "Admin X is viewing this" indicator. No blocking. First reply transitions `pending → active`. |

---

## UI Design

### Page Structure

**Single page: `/chat`** — replaces both `/enquiries` and `/chat`.

Three-panel layout (Intercom-style):

```
┌──────────────┬─────────────────────────┬──────────────┐
│ Session List  │    Conversation          │ Context Panel│
│ (260px)       │    (flex-1)              │ (260px)      │
│               │                         │              │
│ [Search]      │ [Header: name, status]  │ [User Info]  │
│ [Tabs]        │                         │  Phone       │
│               │ [Messages with inline   │  Email       │
│ [Session      │  product cards]         │  Company     │
│  cards]       │                         │              │
│               │                         │ [Products    │
│               │                         │  Discussed]  │
│               │                         │  Card 1      │
│               │                         │  Card 2      │
│               │ [Input bar]             │              │
│               │  📎 📦 [text] [send]    │ [Session     │
│               │                         │  Info]       │
└──────────────┴─────────────────────────┴──────────────┘
```

### Left Panel — Session List

- **Search bar**: Filters by user name, company, last message preview
- **Tabs**: All | Unread | Active | Resolved (with counts)
  - All: every session
  - Unread: `unread_admin_count > 0`
  - Active: `status = 'active'`
  - Resolved: `status = 'resolved'`
- **Session cards**: User name, time ago, last message preview
  - **Pending + unread**: Amber left border + "NEW" badge (visual distinction for unanswered sessions)
  - **Selected**: Blue left border + light blue background
  - **Unread count**: Red circle badge
  - **Resolved**: Reduced opacity + green "Resolved" badge
- **Sorting**: By `last_message_at` DESC

### Center Panel — Conversation

- **Header**: User avatar, name, status badge, "Resolve" button (or "Reopen" for resolved sessions)
- **Messages area**: ScrollArea with date separators and message grouping
  - **Text messages**: Bubble style (user = left/gray, admin = right/blue)
  - **Media messages**: Image thumbnails + file links below text bubble
  - **Product messages**: Rich product card below text bubble — thumbnail, brand, model, price, listing type, "View Listing →" link
  - Same grouping logic: consecutive messages from same sender collapse avatars/timestamps
- **Input bar**:
  - 📎 button — attach images/PDFs (existing functionality)
  - 📦 button — search and share a product listing (NEW)
  - Text input with Shift+Enter for newlines
  - Send button
- **Resolved state**: Input replaced with "This session has been resolved" + "Reopen" option

### Right Panel — Context Sidebar

- **User Info**: Avatar, name, join date, phone, email, company
- **Products Discussed**: Aggregated from all `chat_message` rows in the session that have a `sale_listing_id` or `rent_listing_id`. Each shows: thumbnail, brand, model, price, listing type. Clickable → opens listing edit page.
- **Session Info**: Status badge, start date, message count

### Product Sharing (Admin)

When admin clicks 📦 in the input bar:
1. A popover/dialog appears with a search input
2. Admin searches for a listing by model name, brand, etc.
3. Selects a listing from results
4. Product card preview appears in the input area (like an attachment preview)
5. Admin can add optional text message
6. On send: creates a `chat_message` with the `sale_listing_id` or `rent_listing_id` set

### Responsive Behavior

- Context panel can be toggled/collapsed on smaller screens
- On mobile-width: session list and conversation are separate views (tap to navigate)

---

## Sidebar Navigation Changes

- **Remove**: "Enquiries" sidebar item
- **Update**: "Chat" sidebar item shows badge with total unread count (sum of `unread_admin_count` across all active/pending sessions)
- **Permissions**: Merge `enquiries:view`/`enquiries:delete` into `chat:view`/`chat:delete`. Chat permissions: `chat:view`, `chat:edit` (send messages, resolve), `chat:delete` (soft-delete sessions)

---

## Real-Time (Pusher)

Existing Pusher channels remain, with adjustments:

- `private-chat-{sessionId}` — conversation-level events:
  - `new-message` — new message (text, media, or product)
  - `session-resolved` — session was resolved (replaces `session-closed`)
  - `session-reopened` — session was reopened (NEW)
  - `messages-read` — read cursor updated, with `{ reader_type: 'admin' | 'user', read_at }` (NEW — for live sent/seen tick updates)
  - `typing-start` — someone is typing, with `{ sender_type, sender_name }` (NEW)
  - `admin-viewing` — presence indicator (DEFERRED — implement in a separate iteration to keep scope tight)
- `private-admin-chat` — inbox-level events:
  - `new-message` — for updating session list previews
  - `new-session` — new session created

---

## API Changes (Cloudflare Worker)

The mobile app's Cloudflare Worker API needs corresponding changes:

### Endpoints to Remove
- `POST /enquiries` — replaced by chat session creation
- `GET /enquiries` — replaced by chat session listing with product message data

### Endpoints to Update
- `POST /chat/sessions` — now handles both general support and product enquiries
  - If `sale_listing_id` or `rent_listing_id` provided: checks for existing active session, creates product message
  - If neither provided: general support session
  - Deduplication: if active session exists, returns existing session and adds product message to it
  - **Status change**: new user-initiated sessions created as `'pending'` (not `'active'` as before). `'active'` only after admin replies.
- `POST /chat/sessions/:id/messages` — add support for `sale_listing_id`/`rent_listing_id` on message body
  - **Behavioral change for resolved sessions**: Previously rejected messages to `'closed'` sessions with 400. Now, user messages to `'resolved'` sessions **reopen** them (`resolved → active`, `resolved_at` cleared, `unread_admin_count` incremented).
- `GET /chat/sessions` — include product message data for session previews
- `GET /chat/sessions/:id/messages` — include product reference data (JOIN to listings) in message responses

### New Endpoint
- `GET /chat/sessions/:id/products` — returns all products discussed in a session (aggregated from messages)

---

## Migration Strategy

### Database
1. Add `sale_listing_id` and `rent_listing_id` columns to `chat_message`
2. Add `deleted_at`, `deleted_by`, `admin_last_read_at`, and `user_last_read_at` columns to `chat_session`
3. Change `chat_session.status` CHECK constraint: `('pending', 'active', 'resolved')` replacing `('active', 'closed')`
4. Rename `closed_at` to `resolved_at` on `chat_session`
5. Remove `enquiry_id` column from `chat_session`
6. Drop `idx_chat_session_enquiry` unique index (references removed `enquiry_id` column)
7. Migrate existing enquiry data:
   - **Note:** All existing enquiries have exactly one listing ref (enforced by CHECK constraint on `enquiry` table). No null-listing-ref enquiries exist.
   - For enquiries WITH a chat session: create a `chat_message` (sender_type='user') from `enquiry.message` with the listing ref, backdated to `enquiry.created_at`. Insert as the first message (lowest `id`) in the session.
   - For enquiries WITHOUT a chat session: create a `chat_session` (status='pending') + first `chat_message` with listing ref
   - Map enquiry statuses: Pending/Sent → pending, Replied → active, Resolved → resolved
   - Handle existing `trash_metadata` rows where `entity_type = 'enquiry'`: delete these rows (the enquiry data is being migrated, not trashed)
8. Create partial unique index `idx_session_active_per_user`
9. Drop `enquiry` and `enquiry_status_type` tables

### Admin Portal
1. Update TypeScript types (`src/types/chat.ts`, remove `src/types/enquiry.ts`)
2. Update services (`src/lib/services/chat.ts`, remove `src/lib/services/enquiry.ts`)
3. Update server actions (`src/lib/actions/chat.ts`, remove `src/lib/actions/enquiry.ts`)
4. Update `getTotalUnreadCount()` query: change `WHERE status = 'active'` to `WHERE status IN ('active', 'pending')` — pending sessions with unread messages must be counted for the sidebar badge
5. Redesign chat components:
   - Update `session-list.tsx` — new tabs (All | Unread | Active | Resolved), remove enquiry-specific logic
   - Update `session-card.tsx` — simpler card (no enquiry indicator needed)
   - Update `conversation-panel.tsx` — remove ProductRefCard from header, add context panel
   - Update `message-bubble.tsx` — add product card rendering for product messages, add sent/seen tick indicators on admin messages
   - New: `context-panel.tsx` — right sidebar with user info + products discussed
   - New: `product-picker.tsx` — popover for admin to search and share products
   - Update `chat-inbox.tsx` — three-panel layout
   - Update `chat-input-bar.tsx` — add product share button, add typing indicator emission (debounced Pusher event)
   - Update `conversation-panel.tsx` — add typing indicator display ("User is typing...") and listen for `messages-read` events to update sent/seen ticks
   - Extend `markSessionRead` action — also set `admin_last_read_at` and fire `messages-read` Pusher event
6. Delete `/enquiries` page and components
7. Update sidebar navigation:
   - Remove Enquiries link from `app-sidebar.tsx`
   - Remove `canRead("enquiries")` from `showMarketplace` conditional
8. Update permissions — merge enquiry permissions into chat permissions
9. Update auth config:
   - Remove `/enquiries` → `"enquiries"` feature mapping in `src/lib/auth.ts`
   - Remove `/enquiries` → `"enquiries:read"` permission mapping
10. Update trash system:
    - Remove `"enquiry"` from `TrashEntityType` in `src/types/trash.ts`
    - Remove `enquiry` entry from `ENTITY_REGISTRY` in `src/lib/trash/entity-registry.ts`
    - Remove `"enquiry"` case from `getNameColumn()` in the same file
11. Update blacklist actions in `src/lib/actions/blacklist.ts`:
    - Remove enquiry count query when blacklisting users
    - Remove enquiry soft-delete when blacklisting
    - Remove enquiry restore when unblacklisting
    - Replace with chat session equivalents if needed (e.g., resolve active sessions when blacklisting)
    - Remove `enquiry_count` field from `BlacklistImpactPreview` type in `src/types/blacklist.ts`
12. Update cache tags — remove `CACHE_TAGS.ENQUIRIES` from `src/lib/constants.ts`
13. Clean up any notification references: handle existing `notification` rows where `reference_type = 'enquiry'` (leave as-is, they're historical records — just ensure notification display code doesn't break on orphaned refs)

### Cloudflare Worker
1. Update chat routes to handle product references on messages
2. Update session creation to handle deduplication (one active session per user)
3. Change default session status from `'active'` to `'pending'` for user-initiated sessions
4. Change message-to-resolved-session behavior: reopen instead of reject
5. Add `markSessionRead` endpoint that sets `user_last_read_at` and fires `messages-read` Pusher event
6. Add typing event relay (client sends typing via Pusher client events or via API)
7. Remove enquiry routes
6. Add product data JOINs to message queries

---

## What This Removes

- `enquiry` table and `enquiry_status_type` table
- `src/types/enquiry.ts`
- `src/lib/services/enquiry.ts`
- `src/lib/actions/enquiry.ts`
- `src/app/(dashboard)/enquiries/` (entire route)
- `src/components/features/enquiries/` (entire directory)
- `src/components/features/chat/product-ref-card.tsx` (replaced by inline product cards in message-bubble)
- Sidebar "Enquiries" navigation item
- `CACHE_TAGS.ENQUIRIES`
- Enquiry-related permissions (`enquiries:view`, `enquiries:delete`)
- `"enquiry"` trash entity type and registry entries
- Enquiry references in blacklist actions (`src/lib/actions/blacklist.ts`)
- Enquiry route-permission mappings in `src/lib/auth.ts`
- `idx_chat_session_enquiry` unique index
