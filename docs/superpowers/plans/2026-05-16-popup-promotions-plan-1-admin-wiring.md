# Popup Promotions — Plan 1: Schema + Admin Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing popup-promotions admin UI (currently rendering mock data) to D1 so admins can create / edit / list / delete real promotions end-to-end. After this plan ships, no mobile work has begun — but admins can fully author and manage promotions in staging.

**Architecture:** Adds 3 new D1 tables (`popup_promotion`, `popup_promotion_screen`, `popup_promotion_listing`) plus an `image_id` FK to the existing `image` table. Mirrors the carousel pattern for image upload + R2 storage. Reuses the existing `createService` factory, server-actions conventions (`requirePermission`, `invalidateTag`, `auditLog`, `saveTrashMetadata`), and the `<PermissionGate>` wrapper. No new framework patterns introduced.

**Tech Stack:** Next.js 16 App Router, TypeScript, Cloudflare D1 via REST (`d1-client`), R2 (`upload-helpers`), React Server Components + Server Actions, shadcn/ui, sonner toasts. **No unit-test framework in this repo** — verification is `npx tsc --noEmit` for types and the running dev server for behavior.

**Source spec:** [docs/superpowers/specs/2026-05-16-popup-promotions-design.md](../specs/2026-05-16-popup-promotions-design.md) (§5, §7, §11)

---

## File structure

**Create:**
- `src/lib/services/popup-promotion.ts` — service one-liner via `createService`
- `src/lib/actions/popup-promotion.ts` — server actions: CRUD + toggle + bulk delete
- `migrations/2026-05-16-popup-promotions.sql` — D1 migration (schema + feature seed)

**Modify:**
- `shweloader_d1_schema_final.sql` — append new tables (single source of truth for schema)
- `scripts/seed-admin.ts` — add `popup_promotions` to `FEATURES` + `FEATURE_PERMISSION_MAP`
- `src/lib/constants.ts` — add `CACHE_TAGS.POPUP_PROMOTIONS`
- `src/lib/cache.ts` — add `getPopupPromotions()` and `getPopupPromotion(id)`
- `src/types/popup-promotion.ts` — remove `ListingOption` (replace with real `Listing` import); make `cta_label` nullable
- `src/app/(dashboard)/popup-promotions/page.tsx` — replace `MOCK_PROMOTIONS` with `getPopupPromotions()`, wrap in `<PermissionGate feature="popup_promotions">`
- `src/app/(dashboard)/popup-promotions/new/page.tsx` — replace `MOCK_LISTINGS` with real listing fetch
- `src/app/(dashboard)/popup-promotions/[id]/edit/page.tsx` — replace mock with real fetch
- `src/components/features/popup-promotions/popup-promotions-client.tsx` — wire bulk delete to real action; respect permissions
- `src/components/features/popup-promotions/row-actions.tsx` — wire delete to real action
- `src/components/features/popup-promotions/columns.tsx` — wire `ActiveToggle` to real action
- `src/components/features/popup-promotions/popup-promotion-form.tsx` — wire submit to real create / update actions (image upload + linked products)
- `src/components/features/popup-promotions/linked-products-cell.tsx` — fetch real linked listings from props (no `MOCK_LISTINGS`)

**Delete:**
- `src/components/features/popup-promotions/mock-data.ts` (after every consumer is migrated)

---

## Task 1: D1 schema migration

This repo doesn't yet have a `migrations/` directory — schema is tracked as a single file (`shweloader_d1_schema_final.sql`). We'll introduce a dated migration file for reviewability and a stable record of what was applied to staging, alongside the schema-of-record file.

**Files:**
- Create: `migrations/2026-05-16-popup-promotions.sql` (new directory)
- Modify: `shweloader_d1_schema_final.sql` (append new tables; keep file as the single source of truth)

- [ ] **Step 0: Create the migrations directory**

```bash
mkdir -p migrations
```

- [ ] **Step 1: Write the migration SQL**

Create `migrations/2026-05-16-popup-promotions.sql`:

```sql
-- popup_promotion + junction tables for in-app popup ads
-- Spec: docs/superpowers/specs/2026-05-16-popup-promotions-design.md §5

CREATE TABLE IF NOT EXISTS popup_promotion (
    popup_promotion_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_id INTEGER NOT NULL,
    cta_label TEXT,
    trigger_type TEXT NOT NULL CHECK(trigger_type IN ('screen_entry', 'scroll')),
    trigger_delay_seconds INTEGER NOT NULL DEFAULT 0,
    trigger_scroll_percent INTEGER NOT NULL DEFAULT 50,
    start_at TIMESTAMP,
    end_at TIMESTAMP,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (image_id) REFERENCES image(image_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES admin_user(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_popup_promotion_active
    ON popup_promotion(active, deleted_at);
CREATE INDEX IF NOT EXISTS idx_popup_promotion_schedule
    ON popup_promotion(start_at, end_at);

CREATE TABLE IF NOT EXISTS popup_promotion_screen (
    popup_promotion_id INTEGER NOT NULL,
    screen TEXT NOT NULL CHECK(screen IN ('home', 'browse', 'subcategory')),
    PRIMARY KEY (popup_promotion_id, screen),
    FOREIGN KEY (popup_promotion_id)
        REFERENCES popup_promotion(popup_promotion_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_popup_promotion_screen_screen
    ON popup_promotion_screen(screen);

CREATE TABLE IF NOT EXISTS popup_promotion_listing (
    popup_promotion_id INTEGER NOT NULL,
    product_list_id INTEGER NOT NULL,
    display_order TEXT DEFAULT '0',
    PRIMARY KEY (popup_promotion_id, product_list_id),
    FOREIGN KEY (popup_promotion_id)
        REFERENCES popup_promotion(popup_promotion_id) ON DELETE CASCADE,
    FOREIGN KEY (product_list_id)
        REFERENCES product_list(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_popup_promotion_listing_promo
    ON popup_promotion_listing(popup_promotion_id);

-- RBAC feature row (display_order 26, right after `promotions`)
INSERT OR IGNORE INTO feature (name, group_name, display_order)
    VALUES ('popup_promotions', 'Content', 26);
```

- [ ] **Step 2: Append same SQL to the schema-of-record file**

Open `shweloader_d1_schema_final.sql` and append the three `CREATE TABLE` blocks above (NOT the `INSERT OR IGNORE` — seeds don't belong in the schema file). Place them between the existing `carousel_image` table and the `announcement_text` table to keep Content-related tables grouped.

- [ ] **Step 3: Apply migration to staging D1**

The admin portal talks to D1 via REST. Apply the migration through the Cloudflare dashboard:

1. Cloudflare dashboard → Workers & Pages → D1 → `shweloader-staging` (or current staging DB) → Console
2. Paste the contents of `migrations/2026-05-16-popup-promotions.sql`
3. Click "Execute"
4. Verify in the Tables panel: `popup_promotion`, `popup_promotion_screen`, `popup_promotion_listing` all listed

- [ ] **Step 4: Smoke-test the schema**

Run in the D1 console:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'popup_%';
-- Expected: 3 rows: popup_promotion, popup_promotion_screen, popup_promotion_listing

SELECT * FROM feature WHERE name = 'popup_promotions';
-- Expected: 1 row, group_name='Content', display_order=26
```

- [ ] **Step 5: Commit**

```bash
git add migrations/2026-05-16-popup-promotions.sql shweloader_d1_schema_final.sql
git commit -m "feat(db): add popup_promotion tables + feature row"
```

---

## Task 2: Update RBAC seed script

**Files:**
- Modify: `scripts/seed-admin.ts`

- [ ] **Step 1: Add `popup_promotions` to FEATURES array**

In `scripts/seed-admin.ts`, find the `FEATURES` array (Content section, currently ends with `promotions` at display_order 25). Add immediately after the `promotions` entry:

```ts
{ name: "popup_promotions", group_name: "Content", display_order: 26 },
```

- [ ] **Step 2: Add to FEATURE_PERMISSION_MAP**

Find `FEATURE_PERMISSION_MAP` in the same file. Add this entry (alphabetical or grouped with other Content features — match what's already there):

```ts
popup_promotions: ["create", "read", "edit", "delete"],
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS (zero errors).

- [ ] **Step 4: Run the seed script against staging**

```bash
pnpm tsx --env-file=.env.local scripts/seed-admin.ts
```

Expected output includes lines like `added feature_permission popup_promotions:create` (etc., × 4). Re-running should report 0 new rows (idempotent).

- [ ] **Step 5: Verify in admin UI**

Start dev server: `pnpm dev`. Log in as Superadmin. Navigate to `/roles` (or wherever role-permission management lives). Confirm `popup_promotions` appears under the Content group with all four permission checkboxes available.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-admin.ts
git commit -m "feat(rbac): seed popup_promotions feature + permissions"
```

---

## Task 3: Add `CACHE_TAGS.POPUP_PROMOTIONS` constant

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add the cache tag**

Open `src/lib/constants.ts`. Find the `CACHE_TAGS` const. Add a new entry alongside the other Content tags (alphabetical or grouped with `ANNOUNCEMENTS`, `CAROUSELS`, etc.):

```ts
POPUP_PROMOTIONS: "popup_promotions",
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add POPUP_PROMOTIONS cache tag"
```

---

## Task 4: Type adjustments (non-breaking)

The prototype's `PopupPromotion` type has `cta_label: string` (non-null) and is missing `image_id` and `deleted_at`. Add those without breaking the mock-data prototype.

**Files:**
- Modify: `src/types/popup-promotion.ts`

- [ ] **Step 1: Adjust `PopupPromotion`**

Open `src/types/popup-promotion.ts`. Apply these in-place edits:

- Change `cta_label: string;` → `cta_label: string | null;`
- Add after `image_thumb_url`: `image_id: number;`
- Add after `updated_at`: `deleted_at: string | null;`

`ListingOption` stays where it is for now — the mock prototype still uses it. It will be deleted in Task 14 along with `mock-data.ts`.

- [ ] **Step 2: Adjust the mock data to match**

Open `src/components/features/popup-promotions/mock-data.ts`. Every `MOCK_PROMOTIONS` entry must include:

```ts
image_id: 0,
deleted_at: null,
```

(Add these to all three mock entries.)

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS (zero errors).

- [ ] **Step 4: Commit**

```bash
git add src/types/popup-promotion.ts src/components/features/popup-promotions/mock-data.ts
git commit -m "feat: extend PopupPromotion type with image_id, deleted_at; cta nullable"
```

---

## Task 5: Create the service layer

**Files:**
- Create: `src/lib/services/popup-promotion.ts`

- [ ] **Step 1: Reference the announcement service**

```bash
cat src/lib/services/announcement.ts
```

Mirror the pattern exactly.

- [ ] **Step 2: Write the service**

Create `src/lib/services/popup-promotion.ts`:

```ts
import { createService } from "@/lib/api/create-service";
import type { PopupPromotion } from "@/types/popup-promotion";

export const popupPromotionService = createService<PopupPromotion, "popup_promotion_id">(
  "popup_promotion",
  { primaryKey: "popup_promotion_id", softDelete: true },
);
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/popup-promotion.ts
git commit -m "feat: add popupPromotion service"
```

---

## Task 6: Cache helpers for read paths

**Files:**
- Modify: `src/lib/cache.ts`

- [ ] **Step 1: Read the existing pattern**

```bash
grep -B 1 -A 8 "getAnnouncements\|getCarouselsWithImages" src/lib/cache.ts
```

Note: `src/lib/cache.ts` contains plain data-fetching functions (no `use cache` directive — that lives on the page). Each function does the JOIN/aggregation needed to return a fully-hydrated object for the UI.

- [ ] **Step 2: Add `getPopupPromotions()` and `getPopupPromotion(id)`**

Append to `src/lib/cache.ts`:

```ts
import type { PopupPromotion, PopupTargetScreen } from "@/types/popup-promotion";

interface PopupRow {
  popup_promotion_id: number;
  name: string;
  active: 0 | 1;
  image_id: number;
  image_url: string | null;
  image_thumb_url: string | null;
  cta_label: string | null;
  trigger_type: "screen_entry" | "scroll";
  trigger_delay_seconds: number;
  trigger_scroll_percent: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  screens: string | null;          // comma-joined
  listing_ids: string | null;      // comma-joined
}

function hydrate(row: PopupRow): PopupPromotion {
  return {
    popup_promotion_id: row.popup_promotion_id,
    name: row.name,
    active: row.active,
    image_id: row.image_id,
    image_url: row.image_url,
    image_thumb_url: row.image_thumb_url,
    cta_label: row.cta_label,
    target_screens: (row.screens ?? "")
      .split(",")
      .filter(Boolean) as PopupTargetScreen[],
    trigger_type: row.trigger_type,
    trigger_delay_seconds: row.trigger_delay_seconds,
    trigger_scroll_percent: row.trigger_scroll_percent,
    linked_listing_ids: (row.listing_ids ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number),
    start_at: row.start_at,
    end_at: row.end_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  };
}

export async function getPopupPromotions(): Promise<PopupPromotion[]> {
  const { results } = await d1.query<PopupRow>(
    `SELECT
       p.*,
       i.image_url, i.thumb_url AS image_thumb_url,
       (SELECT GROUP_CONCAT(s.screen) FROM popup_promotion_screen s
          WHERE s.popup_promotion_id = p.popup_promotion_id) AS screens,
       (SELECT GROUP_CONCAT(l.product_list_id) FROM popup_promotion_listing l
          WHERE l.popup_promotion_id = p.popup_promotion_id) AS listing_ids
     FROM popup_promotion p
     JOIN image i ON p.image_id = i.image_id
     WHERE p.deleted_at IS NULL
     ORDER BY p.created_at DESC`,
  );
  return results.map(hydrate);
}

export async function getPopupPromotion(
  id: number,
): Promise<PopupPromotion | null> {
  const { results } = await d1.query<PopupRow>(
    `SELECT
       p.*,
       i.image_url, i.thumb_url AS image_thumb_url,
       (SELECT GROUP_CONCAT(s.screen) FROM popup_promotion_screen s
          WHERE s.popup_promotion_id = p.popup_promotion_id) AS screens,
       (SELECT GROUP_CONCAT(l.product_list_id) FROM popup_promotion_listing l
          WHERE l.popup_promotion_id = p.popup_promotion_id) AS listing_ids
     FROM popup_promotion p
     JOIN image i ON p.image_id = i.image_id
     WHERE p.popup_promotion_id = ? AND p.deleted_at IS NULL
     LIMIT 1`,
    [id],
  );
  return results.length > 0 ? hydrate(results[0]) : null;
}
```

If `d1` isn't already imported at the top of `src/lib/cache.ts`, add `import { d1 } from "@/lib/api/d1-client";`.

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit src/lib/cache.ts
```

Expected: PASS in this file.

- [ ] **Step 4: Commit**

```bash
git add src/lib/cache.ts
git commit -m "feat: getPopupPromotions / getPopupPromotion fetchers"
```

---

## Task 7: Server action — `createPopupPromotion`

**Files:**
- Create: `src/lib/actions/popup-promotion.ts`

- [ ] **Step 1: Reference the carousel image upload pattern**

```bash
grep -A 60 "addCarouselImage" src/lib/actions/carousel.ts | head -70
```

Note: image upload uses `processImageFieldRich(formData, "image", "<r2-prefix>/", entityName)`, returns `{ key, thumbKey, blurhash }`, then INSERT into `image` table, then INSERT into the parent.

- [ ] **Step 2: Write `createPopupPromotion`**

Create `src/lib/actions/popup-promotion.ts`:

```ts
"use server";

import { d1 } from "@/lib/api/d1-client";
import { popupPromotionService } from "@/lib/services/popup-promotion";
import {
  getErrorMessage,
  requirePermission,
  assertBulkLimit,
} from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";
import {
  processImageFieldRich,
  deleteFile,
} from "@/lib/actions/upload-helpers";
import { slugify } from "@/lib/api/r2-client";
import type { PopupTargetScreen, PopupTriggerType } from "@/types/popup-promotion";

interface FormPayload {
  name: string;
  ctaLabel: string | null;
  triggerType: PopupTriggerType;
  triggerDelay: number;
  triggerScroll: number;
  startAt: string | null;
  endAt: string | null;
  active: 0 | 1;
  screens: PopupTargetScreen[];
  listingIds: number[];
}

function parseFormData(formData: FormData): FormPayload {
  const screensRaw = (formData.get("screens") as string) ?? "";
  const listingsRaw = (formData.get("listing_ids") as string) ?? "";
  return {
    name: ((formData.get("name") as string) ?? "").trim(),
    ctaLabel: (((formData.get("cta_label") as string) ?? "").trim()) || null,
    triggerType: (formData.get("trigger_type") as PopupTriggerType) ?? "screen_entry",
    triggerDelay: parseInt((formData.get("trigger_delay_seconds") as string) ?? "0", 10),
    triggerScroll: parseInt((formData.get("trigger_scroll_percent") as string) ?? "50", 10),
    startAt: ((formData.get("start_at") as string) ?? "") || null,
    endAt: ((formData.get("end_at") as string) ?? "") || null,
    active: (formData.get("active") === "1" ? 1 : 0),
    screens: screensRaw.split(",").filter(Boolean) as PopupTargetScreen[],
    listingIds: listingsRaw.split(",").filter(Boolean).map(Number),
  };
}

function validate(p: FormPayload): string | null {
  if (!p.name) return "Promotion name is required";
  if (p.screens.length === 0) return "At least one target screen is required";
  if (p.triggerType === "screen_entry" && (p.triggerDelay < 0 || p.triggerDelay > 30)) {
    return "Trigger delay must be 0–30 seconds";
  }
  if (p.triggerType === "scroll" && (p.triggerScroll < 0 || p.triggerScroll > 100)) {
    return "Trigger scroll percent must be 0–100";
  }
  if (p.listingIds.length > 0 && !p.ctaLabel) {
    return "CTA label is required when products are linked";
  }
  return null;
}

export async function createPopupPromotion(formData: FormData) {
  try {
    const payload = parseFormData(formData);
    const error = validate(payload);
    if (error) return { success: false, error };

    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Popup image is required" };
    }

    const created_by = await requirePermission("popup_promotions", "create");

    const entityName = slugify(payload.name) || "popup";
    const uploaded = await processImageFieldRich(
      formData,
      "image",
      "popup-promotions/",
      entityName,
    );
    if (!uploaded) {
      return { success: false, error: "Failed to upload image" };
    }

    // Insert image record
    const { results: imageRows } = await d1.query<{ image_id: number }>(
      "INSERT INTO image (image_url, thumb_url, blurhash, focal_x, focal_y, uploaded_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING image_id",
      [uploaded.key, uploaded.thumbKey, uploaded.blurhash, 0.5, 0.5, created_by],
    );
    const imageId = imageRows[0].image_id;

    // Insert popup_promotion
    const { results: promoRows } = await d1.query<{ popup_promotion_id: number }>(
      `INSERT INTO popup_promotion
        (name, image_id, cta_label, trigger_type, trigger_delay_seconds,
         trigger_scroll_percent, start_at, end_at, active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING popup_promotion_id`,
      [
        payload.name,
        imageId,
        payload.ctaLabel,
        payload.triggerType,
        payload.triggerDelay,
        payload.triggerScroll,
        payload.startAt,
        payload.endAt,
        payload.active,
        created_by,
      ],
    );
    const promoId = promoRows[0].popup_promotion_id;

    // Insert screens
    for (const screen of payload.screens) {
      await d1.query(
        "INSERT INTO popup_promotion_screen (popup_promotion_id, screen) VALUES (?, ?)",
        [promoId, screen],
      );
    }

    // Insert linked listings (display_order plain "0" — admin can reorder later)
    for (const lid of payload.listingIds) {
      await d1.query(
        "INSERT INTO popup_promotion_listing (popup_promotion_id, product_list_id, display_order) VALUES (?, ?, '0')",
        [promoId, lid],
      );
    }

    invalidateTag(CACHE_TAGS.POPUP_PROMOTIONS);
    auditLog(created_by, "created popup_promotion | id=" + promoId);
    return { success: true, id: promoId };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create popup promotion"),
    };
  }
}
```

(`updatePopupPromotion`, `deletePopupPromotion`, etc. follow in the next tasks.)

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: still fails on prototype consumers but no NEW errors in `popup-promotion.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/popup-promotion.ts
git commit -m "feat: createPopupPromotion server action"
```

---

## Task 8: Server action — `updatePopupPromotion`

**Files:**
- Modify: `src/lib/actions/popup-promotion.ts` (append)

- [ ] **Step 1: Append `updatePopupPromotion`**

```ts
export async function updatePopupPromotion(id: number, formData: FormData) {
  try {
    const payload = parseFormData(formData);
    const error = validate(payload);
    if (error) return { success: false, error };

    const userId = await requirePermission("popup_promotions", "edit");

    // Optional image swap
    let newImageId: number | null = null;
    let oldImageKey: string | null = null;
    let oldThumbKey: string | null = null;

    const file = formData.get("image");
    if (file instanceof File && file.size > 0) {
      // Look up the current image so we can delete it from R2 after the swap
      const { results: cur } = await d1.query<{
        image_id: number;
        image_url: string;
        thumb_url: string | null;
      }>(
        `SELECT p.image_id, i.image_url, i.thumb_url
           FROM popup_promotion p JOIN image i ON p.image_id = i.image_id
          WHERE p.popup_promotion_id = ?`,
        [id],
      );
      if (cur.length === 0) {
        return { success: false, error: "Popup promotion not found" };
      }
      oldImageKey = cur[0].image_url;
      oldThumbKey = cur[0].thumb_url;

      const entityName = slugify(payload.name) || "popup";
      const uploaded = await processImageFieldRich(
        formData,
        "image",
        "popup-promotions/",
        entityName,
      );
      if (!uploaded) return { success: false, error: "Failed to upload image" };

      const { results: imageRows } = await d1.query<{ image_id: number }>(
        "INSERT INTO image (image_url, thumb_url, blurhash, focal_x, focal_y, uploaded_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING image_id",
        [uploaded.key, uploaded.thumbKey, uploaded.blurhash, 0.5, 0.5, userId],
      );
      newImageId = imageRows[0].image_id;
    }

    // Update popup_promotion row
    const setClauses: string[] = [
      "name = ?",
      "cta_label = ?",
      "trigger_type = ?",
      "trigger_delay_seconds = ?",
      "trigger_scroll_percent = ?",
      "start_at = ?",
      "end_at = ?",
      "active = ?",
      "updated_at = CURRENT_TIMESTAMP",
    ];
    const params: unknown[] = [
      payload.name,
      payload.ctaLabel,
      payload.triggerType,
      payload.triggerDelay,
      payload.triggerScroll,
      payload.startAt,
      payload.endAt,
      payload.active,
    ];
    if (newImageId !== null) {
      setClauses.push("image_id = ?");
      params.push(newImageId);
    }
    params.push(id);

    await d1.query(
      `UPDATE popup_promotion SET ${setClauses.join(", ")} WHERE popup_promotion_id = ?`,
      params,
    );

    // Replace screens (DELETE-then-INSERT is the simplest correct strategy)
    await d1.query(
      "DELETE FROM popup_promotion_screen WHERE popup_promotion_id = ?",
      [id],
    );
    for (const screen of payload.screens) {
      await d1.query(
        "INSERT INTO popup_promotion_screen (popup_promotion_id, screen) VALUES (?, ?)",
        [id, screen],
      );
    }

    // Replace linked listings
    await d1.query(
      "DELETE FROM popup_promotion_listing WHERE popup_promotion_id = ?",
      [id],
    );
    for (const lid of payload.listingIds) {
      await d1.query(
        "INSERT INTO popup_promotion_listing (popup_promotion_id, product_list_id, display_order) VALUES (?, ?, '0')",
        [id, lid],
      );
    }

    // Best-effort cleanup of the old R2 image (after DB swap so we don't orphan)
    if (oldImageKey) await deleteFile(oldImageKey);
    if (oldThumbKey) await deleteFile(oldThumbKey);

    invalidateTag(CACHE_TAGS.POPUP_PROMOTIONS);
    auditLog(userId, "updated popup_promotion | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update popup promotion"),
    };
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no new errors in the actions file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/popup-promotion.ts
git commit -m "feat: updatePopupPromotion server action"
```

---

## Task 9: Server actions — delete, bulk delete, toggle active

**Files:**
- Modify: `src/lib/actions/popup-promotion.ts` (append)

- [ ] **Step 1: Append delete + toggle**

```ts
export async function deletePopupPromotion(id: number) {
  try {
    const deletedBy = await requirePermission("popup_promotions", "delete");
    await popupPromotionService.softDelete(id, deletedBy);
    await saveTrashMetadata("popup_promotion", id, deletedBy);
    invalidateTag(CACHE_TAGS.POPUP_PROMOTIONS);
    auditLog(deletedBy, "deleted popup_promotion | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete popup promotion"),
    };
  }
}

export async function deletePopupPromotions(ids: number[]) {
  const deletedBy = await requirePermission("popup_promotions", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await popupPromotionService.softDelete(id, deletedBy);
      await saveTrashMetadata("popup_promotion", id, deletedBy);
    }),
  );
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete popup promotion ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.POPUP_PROMOTIONS);
  auditLog(deletedBy, "bulk deleted popup_promotions | count=" + deleted);
  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

export async function togglePopupPromotionActive(id: number) {
  try {
    const userId = await requirePermission("popup_promotions", "edit");
    await d1.query(
      "UPDATE popup_promotion SET active = 1 - active, updated_at = CURRENT_TIMESTAMP WHERE popup_promotion_id = ?",
      [id],
    );
    invalidateTag(CACHE_TAGS.POPUP_PROMOTIONS);
    auditLog(userId, "toggled popup_promotion active | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle popup promotion"),
    };
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean in `popup-promotion.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/popup-promotion.ts
git commit -m "feat: delete + toggle popup promotion actions"
```

---

## Task 10: Wire the list page to real data + permission gate

**Files:**
- Modify: `src/app/(dashboard)/popup-promotions/page.tsx`

- [ ] **Step 1: Replace mock with `getPopupPromotions`**

Replace the file with:

```tsx
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getPopupPromotions } from "@/lib/cache";
import { PopupPromotionsClient } from "@/components/features/popup-promotions/popup-promotions-client";

export const metadata = {
  title: "Popup Promotions",
  description: "Manage in-app popup promotional ads",
};

export default function PopupPromotionsPage() {
  return (
    <>
      <PageHeader
        title="Popup Promotions"
        description="In-app popup ads shown inside the mobile app on Home, Browse and Subcategory screens."
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="popup_promotions">
          <Content />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function Content() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(CACHE_TAGS.POPUP_PROMOTIONS);

  const promotions = await getPopupPromotions();
  return <PopupPromotionsClient promotions={promotions} />;
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: still fails on mock-data consumers but no new errors.

- [ ] **Step 3: Manual verification**

```bash
pnpm dev
```

Open `http://localhost:3000/popup-promotions`. As Superadmin you should see an empty DataTable (no rows yet — DB is empty). As a non-permitted user the `<PermissionGate>` should show "Access denied".

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/popup-promotions/page.tsx
git commit -m "feat: list page reads from D1, gated by RBAC"
```

---

## Task 11: Wire row-actions delete

**Files:**
- Modify: `src/components/features/popup-promotions/row-actions.tsx`

- [ ] **Step 1: Replace mock handler with real action**

Replace the file's `handleDelete` body and add permission checks. Full file:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { RowActions as RowActionsUI } from "@/components/shared/row-actions";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { ROUTES } from "@/lib/constants";
import { deletePopupPromotion } from "@/lib/actions/popup-promotion";
import type { PopupPromotion } from "@/types/popup-promotion";

interface RowActionsProps {
  promotion: PopupPromotion;
}

export function RowActions({ promotion }: RowActionsProps) {
  const router = useRouter();
  const canEdit = useHasPermission("popup_promotions", "edit");
  const canDelete = useHasPermission("popup_promotions", "delete");
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleEdit() {
    router.push(`${ROUTES.POPUP_PROMOTIONS}/${promotion.popup_promotion_id}/edit`);
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePopupPromotion(promotion.popup_promotion_id);
      if (result.success) {
        toast.success(`"${promotion.name}" moved to trash`);
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const actions = [
    ...(canEdit ? [{ label: "Edit" as const, icon: Pencil, onClick: handleEdit }] : []),
    ...(canDelete
      ? [{
          label: "Delete" as const,
          icon: Trash2,
          onClick: () => setShowDelete(true),
          variant: "destructive" as const,
        }]
      : []),
  ];

  if (actions.length === 0) return null;

  return (
    <>
      <RowActionsUI actions={actions} />
      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete popup promotion?"
        description={
          <>
            <strong>&ldquo;{promotion.name}&rdquo;</strong> will be moved to the
            trash. You can restore it within 30 days.
          </>
        }
        isPending={isPending}
      />
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors in this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/popup-promotions/row-actions.tsx
git commit -m "feat: row-actions delete calls real server action"
```

---

## Task 12: Wire `ActiveToggle`

**Files:**
- Modify: `src/components/features/popup-promotions/columns.tsx` (only the `ActiveToggle` component)

- [ ] **Step 1: Replace `ActiveToggle` body**

In `columns.tsx`, replace the existing `ActiveToggle` function with:

```tsx
function ActiveToggle({ promotion }: { promotion: PopupPromotion }) {
  const [isPending, startTransition] = useTransition();
  const isActive = promotion.active === 1;

  function handleToggle() {
    startTransition(async () => {
      const result = await togglePopupPromotionActive(promotion.popup_promotion_id);
      if (result.success) {
        toast.success(isActive ? `"${promotion.name}" deactivated` : `"${promotion.name}" activated`);
      } else {
        toast.error(result.error ?? "Failed to toggle status");
      }
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "size-2 rounded-full",
            isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
        <span
          className={cn(
            "text-sm",
            isActive ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <Switch
        size="sm"
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add the import**

Near the top of `columns.tsx`:

```tsx
import { togglePopupPromotionActive } from "@/lib/actions/popup-promotion";
```

(Drop the prior `useState` import if it's no longer used — typecheck will flag it.)

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS in this file.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/popup-promotions/columns.tsx
git commit -m "feat: status toggle calls real server action"
```

---

## Task 13: Wire bulk delete

**Files:**
- Modify: `src/components/features/popup-promotions/popup-promotions-client.tsx`

- [ ] **Step 1: Replace mock bulk-delete handler**

In `popup-promotions-client.tsx`, replace the `handleBulkDelete` body:

```tsx
import { deletePopupPromotions } from "@/lib/actions/popup-promotion";

// ... inside the component:

const handleBulkDelete = useCallback(
  async (selected: PopupPromotion[]) => {
    const ids = selected.map((p) => p.popup_promotion_id);
    return deletePopupPromotions(ids);
  },
  [],
);
```

Also wrap the `BulkDeleteButton` in a permission check:

```tsx
import { useHasPermission } from "@/hooks/use-permissions";

// inside the component:
const canDelete = useHasPermission("popup_promotions", "delete");
const canCreate = useHasPermission("popup_promotions", "create");

// inside renderToolbar:
{canDelete && (
  <BulkDeleteButton
    selectedRows={selected}
    onDelete={handleBulkDelete}
    buildDescription={buildDescription}
    itemLabel="promotion"
  />
)}
{canCreate && (
  <Button asChild className="ml-auto">
    <Link href={ROUTES.POPUP_PROMOTIONS_NEW}>
      <Plus /> Create Promotion
    </Link>
  </Button>
)}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS in this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/popup-promotions/popup-promotions-client.tsx
git commit -m "feat: bulk delete calls real server action; respect RBAC"
```

---

## Task 14: Wire the create / edit form (the big one)

**Files:**
- Modify: `src/types/popup-promotion.ts` (drop `ListingOption`)
- Modify: `src/components/features/popup-promotions/popup-promotion-form.tsx`
- Modify: `src/app/(dashboard)/popup-promotions/new/page.tsx`
- Modify: `src/app/(dashboard)/popup-promotions/[id]/edit/page.tsx`
- Modify: `src/components/features/popup-promotions/linked-products-cell.tsx` (drop mock; consume from props)

- [ ] **Step 1: Drop the now-unused `ListingOption` export**

Open `src/types/popup-promotion.ts` and delete the `ListingOption` interface (lines roughly 28–38). All real listings come from `PopupListingOption` in `src/lib/cache.ts` from now on.

- [ ] **Step 2: Fetch real listings for the picker**

The form receives a `listings` prop (for the search/multi-select picker). Both the new-page and edit-page must pass real listings. Pick the lightest existing listings fetcher — look in `src/lib/cache.ts` (e.g. `getSaleListings`, `getRentListings`) — and combine them, OR use whatever the chat product-picker already uses. For this plan, use a small new helper:

In `src/lib/cache.ts`, append:

```ts
export interface PopupListingOption {
  listing_id: number;
  title: string;
  brand_name: string | null;
  model_name: string | null;
  thumb_url: string | null;
  custom_id: string | null;
  price_mmk: number | null;
  price_usd: number | null;
  listing_type: "sale" | "rent" | null;
}

export async function getPopupListingOptions(): Promise<PopupListingOption[]> {
  const { results } = await d1.query<PopupListingOption>(
    `SELECT
       pl.id AS listing_id,
       em.name AS title,
       pb.name AS brand_name,
       em.name AS model_name,
       pl.thumbnail_url AS thumb_url,
       pl.custom_id_suffix AS custom_id,
       COALESCE(sl.mmk_price, rl.mmk_price) AS price_mmk,
       COALESCE(sl.usd_price, rl.usd_price) AS price_usd,
       CASE
         WHEN sl.id IS NOT NULL THEN 'sale'
         WHEN rl.id IS NOT NULL THEN 'rent'
         ELSE NULL
       END AS listing_type
     FROM product_list pl
     LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
     LEFT JOIN product_brand pb ON em.brand_id = pb.brand_id
     LEFT JOIN sale_listing sl ON sl.product_list_id = pl.id
     LEFT JOIN rent_listing rl ON rl.product_list_id = pl.id
     WHERE pl.deleted_at IS NULL
       AND pl.is_draft = 0
     ORDER BY pl.created_at DESC
     LIMIT 500`,
  );
  return results;
}
```

**Scope simplification:** This query only surfaces **equipment** listings (via `equipment_model` + `product_brand`). Attachment listings (where `pl.attachment_model_id IS NOT NULL`) won't appear in the picker for Plan 1. If the client needs attachments too, add a UNION ALL variant in a follow-up — schema-wise nothing else changes (the M:N junction works on any `product_list.id`).

- [ ] **Step 3: Wire `new/page.tsx`**

Replace `src/app/(dashboard)/popup-promotions/new/page.tsx`:

```tsx
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PopupPromotionForm } from "@/components/features/popup-promotions/popup-promotion-form";
import { getPopupListingOptions } from "@/lib/cache";

export const metadata = {
  title: "New Popup Promotion",
  description: "Create a new in-app popup promotion",
};

export default function NewPopupPromotionPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <PermissionGate feature="popup_promotions" permission="create">
        <Content />
      </PermissionGate>
    </Suspense>
  );
}

async function Content() {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  const listings = await getPopupListingOptions();
  return <PopupPromotionForm listings={listings} />;
}
```

- [ ] **Step 4: Wire `[id]/edit/page.tsx`**

Replace `src/app/(dashboard)/popup-promotions/[id]/edit/page.tsx`:

```tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { PopupPromotionForm } from "@/components/features/popup-promotions/popup-promotion-form";
import { getPopupListingOptions, getPopupPromotion } from "@/lib/cache";

export const metadata = {
  title: "Edit Popup Promotion",
  description: "Edit an in-app popup promotion",
};

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default async function EditPopupPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <PermissionGate feature="popup_promotions" permission="edit">
        <Content id={Number(id)} />
      </PermissionGate>
    </Suspense>
  );
}

async function Content({ id }: { id: number }) {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });

  const [promo, listings] = await Promise.all([
    getPopupPromotion(id),
    getPopupListingOptions(),
  ]);
  if (!promo) notFound();
  return <PopupPromotionForm listings={listings} promotion={promo} />;
}
```

- [ ] **Step 5: Update form props and submit handler**

In `src/components/features/popup-promotions/popup-promotion-form.tsx`:

- Change the `listings` prop type from `ListingOption[]` → `PopupListingOption[]` (import from `@/lib/cache`).
- Replace the existing mock-submit `console.log` with real action calls. Form must build a `FormData` and send to `createPopupPromotion` or `updatePopupPromotion`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createPopupPromotion,
  updatePopupPromotion,
} from "@/lib/actions/popup-promotion";
import { ROUTES } from "@/lib/constants";
import type { PopupPromotion } from "@/types/popup-promotion";
import type { PopupListingOption } from "@/lib/cache";
// ... rest of UI imports already present

interface Props {
  listings: PopupListingOption[];
  promotion?: PopupPromotion;  // present in edit mode
}

export function PopupPromotionForm({ listings, promotion }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // ...existing local state for form fields...

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Inject the multi-selects that aren't native form fields
    formData.set("screens", selectedScreens.join(","));
    formData.set("listing_ids", selectedListingIds.join(","));
    formData.set("active", isActive ? "1" : "0");

    startTransition(async () => {
      const result = promotion
        ? await updatePopupPromotion(promotion.popup_promotion_id, formData)
        : await createPopupPromotion(formData);

      if (result.success) {
        toast.success(promotion ? "Promotion updated" : "Promotion created");
        router.push(ROUTES.POPUP_PROMOTIONS);
        router.refresh();
      } else {
        toast.error(result.error ?? "Save failed");
      }
    });
  }

  // ...in JSX, change <form ...> to <form onSubmit={handleSubmit} ...>
  // ...disable the Save button when isPending is true
}
```

Field name conventions for the form `<input>` `name` attributes (must match `parseFormData` in `src/lib/actions/popup-promotion.ts`):

- Promotion name: `name="name"`
- CTA label: `name="cta_label"`
- Image input: `name="image"` (file)
- Trigger type: `name="trigger_type"` (radio buttons)
- Delay: `name="trigger_delay_seconds"`
- Scroll percent: `name="trigger_scroll_percent"`
- Start datetime: `name="start_at"` (HTML `<input type="datetime-local">`)
- End datetime: `name="end_at"`
- Screens: hidden field synthesized in `handleSubmit` (`screens`)
- Linked listings: hidden field synthesized in `handleSubmit` (`listing_ids`)
- Active toggle: hidden field synthesized in `handleSubmit` (`active`)

- [ ] **Step 6: Drop the mock import in `linked-products-cell.tsx`**

The cell currently imports `MOCK_LISTINGS`. Replace with a prop. Either:

- Pass `listings` from the page down to the table → through to the cell, OR
- Keep the cell self-contained by fetching from the worker (overkill for this plan; defer)

Simplest: hoist the `listings` lookup to `PopupPromotionsClient`. Pass `listingMap: Map<number, PopupListingOption>` to the column factory, then to the cell. Update `LinkedProductsCell` signature:

```tsx
interface LinkedProductsCellProps {
  promotion: PopupPromotion;
  listingMap: Map<number, PopupListingOption>;
}

// ... use listingMap.get(id) instead of MOCK_LISTINGS.filter(...)
```

If you don't want to refactor the column factory pattern right now, **defer** the listing-name display: render just the count + a generic "linked product" placeholder text. The CTA still navigates to `/listings/[id]` in a new tab via the same row-link pattern. A follow-up task in Plan 3 (or a quick polish PR) can re-add the rich names.

For this plan, choose one — preferably the simple deferral so the rest of the wiring stays focused.

- [ ] **Step 7: Delete the mock-data file**

```bash
rm src/components/features/popup-promotions/mock-data.ts
```

- [ ] **Step 8: Typecheck**

```bash
npx tsc --noEmit
```

Expected: **PASS with zero errors** — this is the final task and the working tree should be fully clean.

- [ ] **Step 9: Manual end-to-end test**

```bash
pnpm dev
```

Walk the full happy path:

1. Open `/popup-promotions` — empty table.
2. Click **Create Promotion** → fill in name, upload an image, set CTA "Shop Now", select Home + Browse, leave trigger as screen entry with 3s, leave linked products empty (test the "image-only popup" path), leave schedule blank.
3. Submit → toast "Promotion created" → redirect to list. Row appears.
4. Click the row's Edit icon → form pre-fills with the saved values. Change CTA to "Save Now" → Save. Toast "Promotion updated".
5. Toggle the Status switch off → toast "deactivated". Toggle back on → "activated".
6. Tick the row's checkbox → click bulk Delete → confirm. Row disappears.
7. Refresh — row is still gone (soft-deleted in `popup_promotion.deleted_at`).
8. (Optional) Verify in D1 console: `SELECT name, deleted_at FROM popup_promotion ORDER BY popup_promotion_id;`

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(popup-promotions): wire form to real CRUD actions"
```

---

## Self-review checklist for the implementer

After completing all 14 tasks, run this once:

- [ ] `npx tsc --noEmit` → passes with zero errors
- [ ] `pnpm dev` → list / new / edit pages all render without console errors
- [ ] Soft delete verified in DB (row stays, `deleted_at` populated)
- [ ] R2 upload verified (R2 bucket has new files under `popup-promotions/`)
- [ ] As a non-permitted admin user (test by editing your role to drop `popup_promotions:read`), `/popup-promotions` shows "Access denied" — confirms RBAC gate works
- [ ] Audit log entries show `created popup_promotion`, `updated popup_promotion`, `deleted popup_promotion`, `toggled popup_promotion active`
- [ ] Sidebar nav still shows "Popup Promotions" under Content (no regression)

If any item fails, stop and resolve before declaring Plan 1 complete.

---

## What's NOT in this plan (intentionally deferred)

- **Mobile worker endpoints** — Plan 2
- **React Native popup carousel + landing page** — Plan 3
- **Rich linked-products display inside the table modal** — see Task 14 Step 6 (deferral noted)
- **Drag-to-reorder linked products** — schema already supports it (`display_order`), wiring deferred
- **Trash restore UI for popup promotions** — reuse existing `/trash` page; add a renderer when needed
- **Bulk Excel upload** — not requested

These do not block Plan 1 from shipping. Admins can author and manage promotions in staging the moment Plan 1 merges.
