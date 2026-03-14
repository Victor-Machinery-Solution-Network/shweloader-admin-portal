# Unified Chat Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the enquiry system into chat — products become message-level references, one session per user, three-panel admin UI with sent/seen and typing indicators.

**Architecture:** Drop enquiry/enquiry_status_type tables. Extend chat_session with read cursors and soft-delete. Extend chat_message with listing FKs. Redesign admin chat page as three-panel layout (session list | conversation | context sidebar). Update Cloudflare Worker API to match.

**Tech Stack:** Next.js 16 + React 19, Cloudflare D1 (REST API), Pusher (real-time), shadcn/ui + Tailwind CSS 4, TypeScript 5

**Spec:** `docs/superpowers/specs/2026-03-14-unified-chat-redesign.md`

---

## File Structure

### Files to Create
| File | Responsibility |
|---|---|
| `src/components/features/chat/context-panel.tsx` | Right sidebar: user info, products discussed, session metadata |
| `src/components/features/chat/product-picker.tsx` | Popover for admin to search & share product listings |
| `src/components/features/chat/product-message-card.tsx` | Inline product card rendered inside message bubbles |
| `src/components/features/chat/typing-indicator.tsx` | Animated "User is typing..." component |

### Files to Modify
| File | What Changes |
|---|---|
| `shweloader_d1_schema_final.sql` | Drop enquiry tables, update chat_session/chat_message schemas |
| `src/types/chat.ts` | Update ChatSession, ChatMessage types with new fields |
| `src/types/trash.ts` | Remove `"enquiry"` from TrashEntityType |
| `src/types/blacklist.ts` | Remove `enquiry_count` from BlacklistImpactPreview |
| `src/lib/constants.ts` | Remove ENQUIRIES from ROUTES and CACHE_TAGS |
| `src/lib/cache.ts` | Remove enquiry-related cache functions |
| `src/lib/auth.ts` | Remove enquiry route-permission mappings |
| `src/lib/trash/entity-registry.ts` | Remove enquiry entity registry entry |
| `src/lib/actions/chat.ts` | Rewrite queries, add product message support, read cursors, typing |
| `src/lib/actions/blacklist.ts` | Remove enquiry references, replace with chat session equivalents |
| `src/components/layout/app-sidebar.tsx` | Remove Enquiries nav item |
| `src/components/features/chat/chat-inbox.tsx` | Three-panel layout |
| `src/components/features/chat/session-list.tsx` | New tabs (All/Unread/Active/Resolved) |
| `src/components/features/chat/session-card.tsx` | Simpler card, NEW badge for pending |
| `src/components/features/chat/conversation-panel.tsx` | Integrate context panel, typing indicator, resolve/reopen |
| `src/components/features/chat/message-bubble.tsx` | Product card rendering, sent/seen ticks |
| `src/components/features/chat/chat-input-bar.tsx` | Product share button, typing emission |
| `src/hooks/use-chat.ts` | New Pusher events (session-resolved, messages-read, typing) |
| `src/app/(dashboard)/chat/page.tsx` | Update data fetching for new schema |
| Worker: `src/routes/chat.ts` | Deduplication, product messages, read cursors, status changes |

### Files to Delete
| File | Reason |
|---|---|
| `src/types/enquiry.ts` | Enquiry types no longer needed |
| `src/lib/services/enquiry.ts` | Enquiry service no longer needed |
| `src/lib/actions/enquiry.ts` | Enquiry actions no longer needed |
| `src/app/(dashboard)/enquiries/` | Entire enquiries route |
| `src/components/features/enquiries/` | Entire enquiries components |
| `src/components/features/chat/product-ref-card.tsx` | Replaced by product-message-card.tsx |
| Worker: `src/routes/enquiries.ts` | Enquiry endpoints replaced by chat |

---

## Chunk 1: Schema & Data Layer

### Task 1: Update Database Schema File

**Files:**
- Modify: `shweloader_d1_schema_final.sql`

- [ ] **Step 1: Remove enquiry tables from schema file**

Delete the `enquiry_status_type` table definition and its seed data references.
Delete the `enquiry` table definition, its CHECK constraint, and all its indexes.

- [ ] **Step 2: Update chat_session table definition**

Replace the existing `chat_session` CREATE TABLE with:

```sql
CREATE TABLE IF NOT EXISTS chat_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'active', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_preview TEXT,
    unread_admin_count INTEGER NOT NULL DEFAULT 0,
    unread_user_count INTEGER NOT NULL DEFAULT 0,
    admin_last_read_at TIMESTAMP,
    user_last_read_at TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    deleted_by INTEGER,
    FOREIGN KEY (app_user_id) REFERENCES app_user(app_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_active_per_user
ON chat_session(app_user_id)
WHERE status != 'resolved' AND deleted_at IS NULL;
```

Remove the old `idx_chat_session_enquiry` unique index.

- [ ] **Step 3: Update chat_message table definition**

Replace the existing `chat_message` CREATE TABLE with:

```sql
CREATE TABLE IF NOT EXISTS chat_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_session_id INTEGER NOT NULL,
    sender_type TEXT NOT NULL CHECK(sender_type IN ('user', 'admin')),
    sender_id INTEGER NOT NULL,
    message TEXT,
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

- [ ] **Step 4: Verify schema file is internally consistent**

Read through the full schema file to ensure no remaining references to `enquiry` or `enquiry_status_type` tables exist (apart from comments if any).

- [ ] **Step 5: Commit**

```bash
git add shweloader_d1_schema_final.sql
git commit -m "schema: update chat tables for unified chat redesign

Drop enquiry and enquiry_status_type tables. Add product reference
columns to chat_message. Add read cursors, soft-delete, and new
status values to chat_session."
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/chat.ts`
- Modify: `src/types/trash.ts`
- Modify: `src/types/blacklist.ts`
- Delete: `src/types/enquiry.ts`

- [ ] **Step 1: Update ChatSession interface in `src/types/chat.ts`**

Update the `ChatSession` interface:
- Remove `enquiry_id` field
- Change `status` type from `"active" | "closed"` to `"pending" | "active" | "resolved"`
- Rename `closed_at` to `resolved_at`
- Add `admin_last_read_at: string | null`
- Add `user_last_read_at: string | null`
- Add `deleted_at: string | null`
- Add `deleted_by: number | null`

- [ ] **Step 2: Update ChatSessionWithDetails interface**

Final shape of `ChatSessionWithDetails` (extends updated `ChatSession`):
```typescript
interface ChatSessionWithDetails extends ChatSession {
  // From app_user JOIN
  user_name: string;
  user_email: string | null;
  user_phone: string;
  user_company: string | null;
  // From latest product message JOIN (all nullable — session may have no product messages)
  product_name: string | null;
  product_thumbnail: string | null;
  listing_type: "sale" | "rent" | null;
  listing_id: number | null;
  brand_name: string | null;
  mmk_price: number | null;
  usd_price: number | null;
  display_currency: string | null;
  partner_name: string | null;
}
```

Remove any fields that referenced `enquiry_id` or enquiry-specific JOINs.

- [ ] **Step 2b: Add ProductDiscussed type to `src/types/chat.ts`**

```typescript
interface ProductDiscussed {
  listingId: number;
  listingType: "sale" | "rent";
  productName: string | null;
  productThumbnail: string | null;
  brandName: string | null;
  mmkPrice: number | null;
  usdPrice: number | null;
  displayCurrency: string | null;
}
```

This type is used by `getSessionProducts()` action and `ContextPanel` component.

- [ ] **Step 3: Update ChatMessage interface**

Add to `ChatMessage`:
```typescript
sale_listing_id: number | null;
rent_listing_id: number | null;
```

- [ ] **Step 4: Update ChatMessageWithDetails interface**

Add product reference fields to `ChatMessageWithDetails`:
```typescript
product_name: string | null;
product_thumbnail: string | null;
listing_type: "sale" | "rent" | null;
brand_name: string | null;
mmk_price: number | null;
usd_price: number | null;
display_currency: string | null;
partner_name: string | null;
```

- [ ] **Step 5: Remove enquiry from TrashEntityType in `src/types/trash.ts`**

Remove `| "enquiry"` from the `TrashEntityType` union type.

- [ ] **Step 6: Remove enquiry_count from BlacklistImpactPreview in `src/types/blacklist.ts`**

Remove `enquiry_count: number` from the `BlacklistImpactPreview` interface.

- [ ] **Step 7: Delete `src/types/enquiry.ts`**

Remove the entire file.

- [ ] **Step 8: Commit**

```bash
git add src/types/chat.ts src/types/trash.ts src/types/blacklist.ts
git rm src/types/enquiry.ts
git commit -m "types: update chat types and remove enquiry types

Update ChatSession with new status values, read cursors, and
soft-delete. Add product reference fields to ChatMessage. Remove
enquiry type definitions."
```

---

### Task 3: Remove Enquiry Infrastructure

**Files:**
- Delete: `src/lib/services/enquiry.ts`
- Delete: `src/lib/actions/enquiry.ts`
- Modify: `src/lib/constants.ts`
- Modify: `src/lib/cache.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/trash/entity-registry.ts`
- Modify: `src/lib/actions/blacklist.ts`

- [ ] **Step 1: Delete enquiry service and actions**

```bash
git rm src/lib/services/enquiry.ts
git rm src/lib/actions/enquiry.ts
```

- [ ] **Step 2: Remove ENQUIRIES from constants in `src/lib/constants.ts`**

Remove `ENQUIRIES` from the `ROUTES` object and `CACHE_TAGS` object.

- [ ] **Step 3: Remove enquiry cache functions from `src/lib/cache.ts`**

Remove `getEnquiries()` and `getEnquiryStatusTypes()` imports and function definitions. Remove any `CACHE_TAGS.ENQUIRIES` references.

- [ ] **Step 4: Remove enquiry route-permission mappings from `src/lib/auth.ts`**

Remove the `/enquiries` entry from the route-feature map and the permission map.

- [ ] **Step 5: Remove enquiry from trash entity registry in `src/lib/trash/entity-registry.ts`**

Remove the `enquiry` entry from `ENTITY_REGISTRY` object. Remove the `"enquiry"` case from `getNameColumn()` function.

- [ ] **Step 6: Update blacklist actions in `src/lib/actions/blacklist.ts`**

In `getBlacklistImpactPreview()`:
- Remove the enquiry count query
- Remove `enquiry_count` from the return object

In the blacklist action:
- Remove enquiry soft-delete logic
- Replace with: resolve active/pending chat sessions for the blacklisted user:
  ```sql
  UPDATE chat_session SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
  WHERE app_user_id = ? AND status IN ('pending', 'active') AND deleted_at IS NULL
  ```
  Invalidate `CACHE_TAGS.CHAT_SESSIONS` after this update.

In the unblacklist action:
- Remove enquiry restore logic

Remove `CACHE_TAGS.ENQUIRIES` from `invalidateBlacklistCaches()`.

- [ ] **Step 7: Handle notification display for orphaned enquiry references**

Search for notification rendering code that handles `reference_type = 'enquiry'`. If it links to `/enquiries/...`, update it to either:
- Skip rendering the link (show notification text only), or
- Remove the enquiry case entirely (notifications are historical, won't break if link is missing)

```bash
grep -r "reference_type.*enquir" src/ --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 8: Verify RBAC permissions cover chat access for former enquiry users**

Check that admins who had `enquiries:view`/`enquiries:delete` permissions also have `chat:view`/`chat:edit`. If permissions are seeded in the DB via `seed-admin.ts`, update the seed to ensure all roles with enquiry permissions now have chat permissions. If permissions are role-based and already include chat, no action needed — just verify.

- [ ] **Step 9: Verify no remaining enquiry imports**

Search the codebase for any remaining imports from deleted files:
```bash
grep -r "enquiry" src/lib/ --include="*.ts" --include="*.tsx" -l
```

Fix any remaining references.

- [ ] **Step 10: Commit**

```bash
git add src/lib/constants.ts src/lib/cache.ts src/lib/auth.ts src/lib/trash/entity-registry.ts src/lib/actions/blacklist.ts
git commit -m "refactor: remove enquiry infrastructure

Delete enquiry service, actions, cache functions, auth mappings,
trash registry entry. Update blacklist actions to use chat sessions
instead of enquiries."
```

Note: If Step 7 (notifications) or Step 9 (remaining references) required file changes, add those files to the `git add` command above.

---

### Task 4: Update Chat Server Actions

**Files:**
- Modify: `src/lib/actions/chat.ts`

- [ ] **Step 1: Update `getChatSessionsWithDetails()` query**

Rewrite the SQL query:
- Remove all JOINs to `enquiry` table
- LEFT JOIN to `app_user` for user details (keep existing)
- Use a correlated subquery to get the latest product message per session (LIMIT 1 per session, not globally):
  ```sql
  LEFT JOIN chat_message lpm ON lpm.id = (
    SELECT cm2.id FROM chat_message cm2
    WHERE cm2.chat_session_id = cs.id
      AND (cm2.sale_listing_id IS NOT NULL OR cm2.rent_listing_id IS NOT NULL)
    ORDER BY cm2.created_at DESC
    LIMIT 1
  )
  ```
- LEFT JOIN to `sale_listing`/`rent_listing` and then to `product_list`/`equipment_model`/`attachment_model`/`brand` for product details using the subquery results
- Add `WHERE cs.deleted_at IS NULL` filter
- Update column aliases to match `ChatSessionWithDetails` type

- [ ] **Step 2: Update `getChatMessages()` to include product data**

For each message with a `sale_listing_id` or `rent_listing_id`, LEFT JOIN to get:
- Product name (from equipment_model or attachment_model via product_list)
- Brand name
- Thumbnail URL
- Price (mmk_price, usd_price, display_currency)
- Partner name
- Listing type ('sale' or 'rent')

Return these fields in `ChatMessageWithDetails`.

- [ ] **Step 3: Update `getTotalUnreadCount()` query**

Change WHERE clause from:
```sql
WHERE status = 'active'
```
to:
```sql
WHERE status IN ('active', 'pending') AND deleted_at IS NULL
```

- [ ] **Step 4: Update `sendMessage()` action**

Add support for product message:
- Accept optional `saleListingId` and `rentListingId` parameters
- Validate invariant: cannot have both product ref AND attachments
- Validate: at most one of saleListingId/rentListingId is set
- Include listing IDs in the chat_message INSERT

Update status transition logic:
- If session is `pending` and sender is admin → transition to `active`
- Remove old enquiry status update code

Update `session-closed` Pusher event references to `session-resolved`.

- [ ] **Step 5: Replace `createSessionForEnquiry()` with `getOrCreateSession()`**

Replace the old function with a new one that:
- Takes `appUserId` and optional listing IDs
- Checks for an existing non-resolved, non-deleted session for this user
- If found: returns existing session (and adds product message if listing provided)
- If not found: creates new session with `status: 'pending'`
- If listing provided: creates the first chat_message with the product ref
- Triggers Pusher `new-session` event on `private-admin-chat`

- [ ] **Step 6: Rewrite `closeSession()` → `resolveSession()`**

Rename function and update:
- Change status from `'closed'` to `'resolved'`
- Change column from `closed_at` to `resolved_at`
- Remove enquiry status update logic
- Change Pusher event from `session-closed` to `session-resolved`
- Invalidate only `CACHE_TAGS.CHAT_SESSIONS`

- [ ] **Step 7: Add `reopenSession()` action**

New server action:
- Sets `status = 'active'`, `resolved_at = NULL`
- Fires Pusher event `session-reopened` on `private-chat-{sessionId}`
- Invalidates `CACHE_TAGS.CHAT_SESSIONS`

- [ ] **Step 8: Extend `markSessionRead()` with read cursor**

Update to also:
- Set `admin_last_read_at = CURRENT_TIMESTAMP`
- Fire Pusher event `messages-read` on `private-chat-{sessionId}` with payload `{ reader_type: 'admin', read_at: timestamp }`

- [ ] **Step 9: Add `getSessionProducts()` action**

New server action that queries all distinct products referenced in messages for a given session:
```sql
SELECT DISTINCT cm.sale_listing_id, cm.rent_listing_id, ...product fields...
FROM chat_message cm
LEFT JOIN sale_listing sl ON cm.sale_listing_id = sl.id
LEFT JOIN rent_listing rl ON cm.rent_listing_id = rl.id
LEFT JOIN product_list pl ON ...
WHERE cm.chat_session_id = ?
  AND (cm.sale_listing_id IS NOT NULL OR cm.rent_listing_id IS NOT NULL)
```

- [ ] **Step 10: Add `searchListings()` action for product picker**

New server action for the admin product picker:
- Takes a search query string
- Searches `product_list` JOIN `equipment_model`/`attachment_model`/`brand` by name
- Returns listing ID, type (sale/rent), product name, brand name, thumbnail, price
- Limit to 10 results

- [ ] **Step 11: Commit**

```bash
git add src/lib/actions/chat.ts
git commit -m "feat: rewrite chat actions for unified chat model

Update queries to remove enquiry JOINs, add product message support,
read cursors, session deduplication, resolve/reopen actions, and
product search for admin picker."
```

---

### Task 5: Update Chat Hooks

**Files:**
- Modify: `src/hooks/use-chat.ts`

- [ ] **Step 1: Update Pusher event names in `useChatMessages()` hook**

- Change listener for `session-closed` to `session-resolved`
- Add listener for `session-reopened` — sets `sessionClosed` back to false
- Add listener for `messages-read` — store `user_last_read_at` timestamp in state for tick updates

- [ ] **Step 2: Add `useTypingIndicator()` hook**

New custom hook:
```typescript
function useTypingIndicator(sessionId: number | null) {
  // Returns: { isTyping: boolean, typingUser: string | null }
  // Listens on private-chat-{sessionId} for 'typing-start' events
  // Sets isTyping=true with sender_name
  // Auto-clears after 3 seconds of no events (useRef for timeout)
  // Returns { isTyping: false } when a new-message arrives from the typer
}
```

- [ ] **Step 3: Add `useSendTypingEvent()` hook**

New custom hook that sends typing events via a lightweight server action (not Pusher client events, to avoid needing Pusher client-event configuration):

```typescript
function useSendTypingEvent(sessionId: number | null) {
  // Returns: sendTyping() function
  // Debounced — calls server action at most once per 2 seconds
  // Server action triggers Pusher 'typing-start' on private-chat-{sessionId}
  // Uses useRef for debounce timer
}
```

The server action is a simple `sendTypingEvent(sessionId: number)` that fires the Pusher event. No DB write needed.

- [ ] **Step 4: Update `useChatInbox()` hook**

- Update `new-chat-session` handler to expect sessions with `status: 'pending'`
- Handle `session-reopened` event on `private-admin-chat` channel — move session from resolved back to active in the list

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-chat.ts
git commit -m "feat: update chat hooks for unified model

Add typing indicator and read cursor hooks. Update Pusher event
names for resolved/reopened sessions."
```

---

## Chunk 2: UI Components

### Task 6: Create Product Message Card Component

**Files:**
- Create: `src/components/features/chat/product-message-card.tsx`

- [ ] **Step 1: Create the component**

```typescript
// Props:
interface ProductMessageCardProps {
  productName: string | null;
  productThumbnail: string | null;
  listingType: "sale" | "rent" | null;
  listingId: number | null;
  brandName: string | null;
  mmkPrice: number | null;
  usdPrice: number | null;
  displayCurrency: string | null;
}
```

Renders a card with:
- Thumbnail (48x48, rounded, fallback placeholder)
- Brand name (small, uppercase, muted)
- Product name (semibold)
- Price (formatted, blue)
- Listing type badge ("For Sale" / "For Rent")
- "View Listing →" link that opens `/listings/for-${type}/${id}/edit` in new tab
- Returns null if no productName and no listingId
- If listing data missing (deleted listing): show "Listing unavailable" text

Style: `bg-muted/30 border rounded-xl`, compact layout similar to the mockup.

- [ ] **Step 2: Commit**

```bash
git add src/components/features/chat/product-message-card.tsx
git commit -m "feat: add product message card component for inline chat display"
```

---

### Task 7: Create Typing Indicator Component

**Files:**
- Create: `src/components/features/chat/typing-indicator.tsx`

- [ ] **Step 1: Create the component**

```typescript
interface TypingIndicatorProps {
  userName: string;
}
```

Renders "{userName} is typing..." with a pulsing dot animation. Uses CSS animation (3 dots with staggered animation-delay). Compact, subtle styling — small text, muted color. Positioned at the bottom of the messages area.

- [ ] **Step 2: Commit**

```bash
git add src/components/features/chat/typing-indicator.tsx
git commit -m "feat: add typing indicator component"
```

---

### Task 8: Update Message Bubble

**Files:**
- Modify: `src/components/features/chat/message-bubble.tsx`

- [ ] **Step 1: Add product card rendering**

When `message.sale_listing_id || message.rent_listing_id` is set, render `<ProductMessageCard>` below the text bubble (if text exists) or as the standalone content.

The product card should be rendered within the message alignment (left for user, right for admin) and constrained to the same max-width as text bubbles.

- [ ] **Step 2: Add sent/seen tick indicators**

Add tick indicators below admin messages (right-aligned):
- Accept `userLastReadAt: string | null` prop (passed from conversation panel)
- For admin messages only (`sender_type === 'admin'`):
  - If `message.created_at <= userLastReadAt` → double blue tick (✓✓)
  - Else → single gray tick (✓)
- Only show on the last message in a consecutive admin group (when `showTimestamp` is true) to avoid visual noise
- Use a small `Check` or `CheckCheck` icon from lucide-react

- [ ] **Step 3: Commit**

```bash
git add src/components/features/chat/message-bubble.tsx
git commit -m "feat: add product cards and sent/seen ticks to message bubbles"
```

---

### Task 9: Create Context Panel

**Files:**
- Create: `src/components/features/chat/context-panel.tsx`

- [ ] **Step 1: Create the component**

```typescript
import type { ChatSessionWithDetails, ProductDiscussed } from "@/types/chat";

interface ContextPanelProps {
  session: ChatSessionWithDetails | null;
  products: ProductDiscussed[];  // from getSessionProducts()
  messageCount: number;
}
```

(`ProductDiscussed` type is defined in `src/types/chat.ts` — see Task 2 Step 2b)

Three sections:
1. **User Info** — centered avatar (initials), name, join date, phone/email/company with icons
2. **Products Discussed** — list of compact product cards (thumbnail, brand, name, price, type badge). Each clickable → opens listing. Header shows count.
3. **Session Info** — status badge, started date, message count

Style: `w-[260px] bg-muted/20 border-l`, scrollable, collapsible via a toggle button.

- [ ] **Step 2: Commit**

```bash
git add src/components/features/chat/context-panel.tsx
git commit -m "feat: add context panel with user info and products discussed"
```

---

### Task 10: Create Product Picker

**Files:**
- Create: `src/components/features/chat/product-picker.tsx`

- [ ] **Step 1: Create the component**

```typescript
interface ProductPickerProps {
  onSelect: (listing: { id: number; type: "sale" | "rent" }) => void;
  onCancel: () => void;
}
```

Renders as a Popover (from shadcn/ui) anchored to the product share button:
- Search input at top (debounced, 300ms)
- Calls `searchListings(query)` server action
- Shows results as compact listing cards (thumbnail, brand, name, price, type)
- Clicking a result calls `onSelect` with the listing ID and type
- Shows empty state for no results
- Loading spinner while searching

- [ ] **Step 2: Commit**

```bash
git add src/components/features/chat/product-picker.tsx
git commit -m "feat: add product picker popover for admin product sharing"
```

---

### Task 11: Update Chat Input Bar

**Files:**
- Modify: `src/components/features/chat/chat-input-bar.tsx`

- [ ] **Step 1: Add product share button and typing emission**

Add a product share button (Package icon from lucide-react) between the attach button and text input.

When clicked, open the `<ProductPicker>` popover. When a product is selected:
- Store selected product in state
- Show a product preview above the input (like attachment previews)
- Allow the admin to add optional text
- On send: pass the listing ID along with the message

Add typing indicator emission:
- Import and use `useSendTypingEvent(sessionId)` hook
- Call `sendTyping()` on textarea `onChange` event

Update `onSend` callback signature:
```typescript
onSend: (message: string, files: File[], listing?: { id: number; type: "sale" | "rent" }) => void;
```

Enforce invariant: disable attachment button when product is selected, disable product button when attachments are added.

- [ ] **Step 2: Commit**

```bash
git add src/components/features/chat/chat-input-bar.tsx
git commit -m "feat: add product sharing and typing emission to chat input"
```

---

### Task 12: Update Session Card

**Files:**
- Modify: `src/components/features/chat/session-card.tsx`

- [ ] **Step 1: Simplify session card**

Remove enquiry-specific indicators (amber dot, enquiry type text).

Update to show:
- User name + time ago (keep existing)
- Last message preview (keep existing)
- **Pending sessions**: amber left border + "NEW" badge (background: amber)
- **Selected**: blue left border + light blue background (keep existing)
- **Unread count**: red circle badge (keep existing)
- **Resolved**: reduced opacity (0.6) + green "Resolved" badge

Remove references to `enquiry_id` and enquiry-related conditional rendering.

- [ ] **Step 2: Commit**

```bash
git add src/components/features/chat/session-card.tsx
git commit -m "feat: simplify session card with status-based indicators"
```

---

### Task 13: Update Session List

**Files:**
- Modify: `src/components/features/chat/session-list.tsx`

- [ ] **Step 1: Update tab filters**

Change tabs from `All | Unread | Enquiries | Closed` to `All | Unread | Active | Resolved`:

```typescript
type FilterTab = "all" | "unread" | "active" | "resolved";
```

Update filter logic:
- `all`: all sessions
- `unread`: `session.unread_admin_count > 0`
- `active`: `session.status === 'active'`
- `resolved`: `session.status === 'resolved'`

Update tab counts accordingly.

- [ ] **Step 2: Update empty state messages**

Update empty state titles for new tab names:
- `unread` → "No unread messages"
- `active` → "No active conversations"
- `resolved` → "No resolved conversations"
- `all` → "No conversations yet"

- [ ] **Step 3: Commit**

```bash
git add src/components/features/chat/session-list.tsx
git commit -m "feat: update session list tabs to All/Unread/Active/Resolved"
```

---

### Task 14: Update Conversation Panel

**Files:**
- Modify: `src/components/features/chat/conversation-panel.tsx`

- [ ] **Step 1: Update header**

Replace "Close Session" button:
- If `session.status !== 'resolved'`: show "Resolve" button
- If `session.status === 'resolved'`: show "Reopen" button
- Call `resolveSession()` or `reopenSession()` respectively

Update status badge text: `active` → "Active" (blue), `pending` → "Pending" (amber), `resolved` → "Resolved" (green).

- [ ] **Step 2: Remove inline ProductRefCard**

Remove the `<ProductRefCard>` that currently renders below the header for enquiry sessions. This is replaced by:
- Inline product cards in message bubbles
- Products discussed section in context panel

- [ ] **Step 3: Add typing indicator**

Import and use `useTypingIndicator(sessionId)` hook.

When `isTyping` is true, render `<TypingIndicator userName={typingUser} />` at the bottom of the messages area, just above the input bar.

- [ ] **Step 4: Pass `userLastReadAt` to message bubbles**

Get `user_last_read_at` from session data and pass it to each `<MessageBubble>` as `userLastReadAt` prop for sent/seen tick rendering.

Listen for `messages-read` Pusher events (from `useChatMessages` hook) to update this value in real-time.

- [ ] **Step 5: Update resolved state UI**

When session is resolved:
- Replace input bar with "This session has been resolved" message + "Reopen" button
- Keep messages visible and scrollable

- [ ] **Step 6: Update `handleSend` to support product messages**

Update the send handler to accept optional listing data from ChatInputBar. Pass `saleListingId`/`rentListingId` to `sendMessage()` action.

- [ ] **Step 7: Commit**

```bash
git add src/components/features/chat/conversation-panel.tsx
git commit -m "feat: update conversation panel with resolve/reopen, typing, and product support"
```

---

### Task 15: Update Chat Inbox (Three-Panel Layout)

**Files:**
- Modify: `src/components/features/chat/chat-inbox.tsx`
- Delete: `src/components/features/chat/product-ref-card.tsx`

- [ ] **Step 1: Implement three-panel layout**

Update the layout from two-panel to three-panel:

```tsx
<div className="flex h-full rounded-xl border bg-background">
  {/* Left: Session List */}
  <div className="w-[260px] shrink-0 border-r">
    <SessionList ... />
  </div>

  {/* Center: Conversation */}
  <div className="flex-1 min-w-0">
    <ConversationPanel ... />
  </div>

  {/* Right: Context Panel */}
  <ContextPanel
    session={selectedSession}
    products={sessionProducts}
    messageCount={messageCount}
  />
</div>
```

- [ ] **Step 2: Fetch products discussed for selected session**

When `selectedId` changes, call `getSessionProducts(sessionId)` to get the products discussed. Pass to `<ContextPanel>`.

Use `useEffect` with the selected session ID as dependency. Store products in state.

- [ ] **Step 3: Delete `product-ref-card.tsx`**

```bash
git rm src/components/features/chat/product-ref-card.tsx
```

This component is replaced by `product-message-card.tsx` (inline in messages) and the products section in `context-panel.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/chat/chat-inbox.tsx
git rm src/components/features/chat/product-ref-card.tsx
git commit -m "feat: implement three-panel chat layout with context sidebar"
```

---

## Chunk 3: Page, Navigation & Cleanup

### Task 16: Update Chat Page Data Fetching

**Files:**
- Modify: `src/app/(dashboard)/chat/page.tsx`

- [ ] **Step 1: Update the async data function**

The `getChatSessionsWithDetails()` call should already work with the updated action (Task 4). Verify the data flows through correctly.

Remove any imports or references to enquiry-related functions.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/chat/page.tsx
git commit -m "chore: update chat page for unified model"
```

---

### Task 17: Delete Enquiries Page and Components

**Files:**
- Delete: `src/app/(dashboard)/enquiries/` (entire directory)
- Delete: `src/components/features/enquiries/` (entire directory)

- [ ] **Step 1: Delete enquiries page**

```bash
rm -rf src/app/\(dashboard\)/enquiries/
```

- [ ] **Step 2: Delete enquiries components**

```bash
rm -rf src/components/features/enquiries/
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete enquiries page and components

Replaced by unified chat page with product messages."
```

---

### Task 18: Update Sidebar Navigation

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Remove Enquiries nav item**

Delete the entire `{canRead("enquiries") && ...}` block that renders the Enquiries sidebar link.

- [ ] **Step 2: Update showMarketplace conditional**

Remove `canRead("enquiries")` from the `showMarketplace` conditional. Update to:
```typescript
const showMarketplace = showListings || canRead("chat");
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "chore: remove enquiries from sidebar navigation"
```

---

### Task 19: Verify and Fix Remaining References

**Files:**
- Various

- [ ] **Step 1: Search for remaining enquiry references**

```bash
grep -r "enquir" src/ --include="*.ts" --include="*.tsx" -l
```

Fix any remaining imports, type references, or string literals that reference enquiries.

Common places to check:
- `src/types/index.ts` — remove enquiry re-exports
- Any component importing from deleted files
- Test files if any

- [ ] **Step 2: Build check**

```bash
npm run build
```

Fix any TypeScript compilation errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve remaining enquiry references after migration"
```

---

## Chunk 4: Cloudflare Worker API

### Task 20: Update Worker Chat Routes

**Files:**
- Modify: `/Users/peter/Desktop/cloudflare-worker-app-rest-api-dev/src/routes/chat.ts`
- Delete: `/Users/peter/Desktop/cloudflare-worker-app-rest-api-dev/src/routes/enquiries.ts`

- [ ] **Step 1: Update `POST /chat/sessions` for deduplication and product messages**

Rewrite session creation:
- Accept optional `sale_listing_id` / `rent_listing_id` in request body
- Check for existing non-resolved, non-deleted session for `app_user_id`
- If found: return existing session. If product ref provided, add a product message to it.
- If not found: create new session with `status: 'pending'`
- If product ref provided: create first `chat_message` with the listing ref and the request body `message`
- Fire Pusher event `new-session` on `private-admin-chat`

- [ ] **Step 2: Update `POST /chat/sessions/:id/messages` for product refs and reopening**

- Accept optional `sale_listing_id` / `rent_listing_id` in request body
- Validate invariant: cannot have both product ref AND attachments
- If session `status === 'resolved'`: reopen it (`status = 'active'`, `resolved_at = NULL`) instead of returning 400
- Insert message with listing IDs if provided
- Update session metadata (last_message_at, preview, unread counts)

- [ ] **Step 3: Update `GET /chat/sessions/:id/messages` with product data**

LEFT JOIN to listing tables for messages with product refs:
- Join `sale_listing` / `rent_listing` → `product_list` → `equipment_model` / `attachment_model` → `brand`
- Return product fields (product_name, brand_name, thumbnail, price, listing_type) in message response

- [ ] **Step 4: Add `PUT /chat/sessions/:id/read` endpoint**

New endpoint for marking session as read from the user's side:
- Set `user_last_read_at = CURRENT_TIMESTAMP`, `unread_user_count = 0`
- Fire Pusher event `messages-read` with `{ reader_type: 'user', read_at }`

- [ ] **Step 5: Add `GET /chat/sessions/:id/products` endpoint**

New endpoint that returns all distinct products discussed in a session (aggregated from product messages). This is the mobile app equivalent of the admin's `getSessionProducts()` server action.

Query: SELECT DISTINCT products from chat_message rows WHERE chat_session_id = :id AND (sale_listing_id IS NOT NULL OR rent_listing_id IS NOT NULL), JOINed to listing/product/brand tables for details.

- [ ] **Step 6: Update `GET /chat/sessions` with new fields**

Update session list response:
- Include `status` with new values (`pending`, `active`, `resolved`)
- Include `user_last_read_at` and `admin_last_read_at`
- Include latest product message data for preview

- [ ] **Step 7: Delete enquiry routes**

Remove the enquiry routes file. Remove its import/registration from the main router.

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
git rm src/routes/enquiries.ts
```

Update `src/index.ts` (or wherever routes are registered) to remove the enquiry route import.

- [ ] **Step 8: Commit**

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
git add -A
git commit -m "feat: update chat API for unified model, remove enquiry routes

Add product message support, session deduplication, read cursors,
resolved session reopening. Remove enquiry endpoints."
```

---

### Task 21: Final Integration Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Build the admin portal**

```bash
cd /Users/peter/Desktop/shweloader-admin-portal
npm run build
```

Verify no TypeScript errors and build succeeds.

- [ ] **Step 2: Run dev server and test manually**

```bash
npm run dev
```

Test the following flows:
- Navigate to `/chat` — three-panel layout renders
- Session list shows tabs (All / Unread / Active / Resolved)
- Click a session — conversation loads in center panel, context panel shows user info
- Product messages render inline with product cards
- "View Listing →" link opens listing page
- Resolve button works → session moves to Resolved tab
- Reopen button works on resolved sessions
- Product picker opens from input bar, search works, product card preview appears
- Sent/seen ticks display correctly on admin messages
- Typing indicator appears when simulated
- `/enquiries` returns 404 (page deleted)
- Sidebar shows Chat but not Enquiries

- [ ] **Step 3: Verify worker builds**

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
npm run build
```

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: integration fixes for unified chat redesign"
```
