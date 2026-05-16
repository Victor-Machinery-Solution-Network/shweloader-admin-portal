# Popup Promotions — Design Spec

**Date:** 2026-05-16
**Status:** Draft → awaiting user approval
**Touches:** D1 schema · admin portal · admin's D1 REST worker · mobile-facing worker · React Native app

---

## 1. Problem

Client wants foodpanda/Lazada-style in-app promotional popups inside the Shweloader mobile app. Admins must be able to fully control which screens popups appear on, how they're triggered, and which products they promote. Tapping a popup's CTA opens a "promotion landing page" that lists the linked products.

## 2. Scope

**In scope**

- Admin CRUD for popup promotions (UI already prototyped at `/popup-promotions`)
- Mobile-facing API endpoints to fetch active popups + promo landing details
- React Native popup carousel (image-only modal, swipable when multiple eligible)
- React Native promo landing page (image banner + linked listing grid)
- Local frequency tracking on device (2x/day cap, **CTA-tap → never again**)
- Three target screens: Home, Browse, Subcategory
- Two trigger types: On screen entry (with delay) · On scroll (with %)
- Audience: everyone (guests and logged-in users alike)

**Out of scope (deferred)**

- Server-side analytics dashboard for impressions/clicks
- Targeted segmentation (logged-in only, by location, by partner type)
- Product Details screen as a trigger location
- Exit-intent or back-button triggers
- Configurable cooldowns or admin-tunable frequency caps
- Push-notification-driven popups

## 3. UX summary

### Admin (Next.js — `/popup-promotions`)

- **List**: DataTable with `☐ | No. | Promotion (thumb + name + CTA) | Screens | Trigger | Linked products (centered, clickable count) | Schedule | Status (toggle) | Edit/Delete`. Bulk delete and CSV export. Linked-products count opens a Dialog listing each linked listing (brand, title, SKU, price, For Sale/Rent badge) — each row links to `/listings/[id]` in a new tab.
- **Create/Edit form** (single page, top bar + 5 numbered sections):
  - Top bar: internal name + Active toggle
  1. Popup design: image upload (mandatory) + CTA button label
  2. Where to show: chip multi-select (Home / Browse / Subcategory)
  3. When to show: radio (On screen entry + delay slider 0–30s OR On scroll + percent slider 0–100)
  4. Linked products: search + multi-select listings
  5. Schedule: start/end datetime (both optional)
- **Built-in rules banner**: surfaces the hard-coded mobile behavior so admins know what's not configurable.

### Mobile (React Native)

- On entering Home / Browse / Subcategory, the app evaluates trigger rules client-side and shows a horizontal **swipable carousel** of eligible popups inside a modal.
- Each slide: full-bleed image with a small **X close** in the corner. The **CTA button** is shown only when the popup has **≥1 linked product**.
- **Tap behavior** (explicit):
  - **CTA button tap** → close modal + navigate to `/promo/[id]` + mark the popup as "clicked" (never shown to this user again).
  - **X close tap** → dismiss modal. Counts as an impression. Popup can show again later (up to the 2x/day cap).
  - **Image tap (anywhere outside CTA and X)** → no-op. The image is decorative; only the CTA button navigates.
- **No-CTA popups**: when a popup has 0 linked products, the CTA button is hidden. The popup is image + X only — a "branding/announcement" popup. There's no `/promo/[id]` landing page to reach. The 2x/day impression cap still applies; `ctaClickedAt` can never be set.
- **Promo landing page** (`/promo/[id]`, deliberately simple): the popup image rendered as a banner at the top, then a vertical list of linked listings using the existing React Native `ListingCard` component. No marketing copy, no extra text — just banner + cards.

## 4. Architecture

### Components and contracts

```
┌────────────────────┐    REST     ┌────────────────────┐
│   Admin Portal     │ ──────────▶ │  D1 REST API       │  (Cloudflare)
│   (Next.js)        │             │  (admin path)      │
└────────────────────┘             └──────────┬─────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │   D1 DB      │
                                       └──────┬───────┘
                                              ▲
┌────────────────────┐    REST     ┌──────────┴─────────┐
│  React Native App  │ ──────────▶ │  Mobile API Worker │
│  (Expo)            │             │  (cf-worker-app-   │
└────────────────────┘             │   rest-api-dev)    │
                                   └────────────────────┘
```

Each side has one clear job:
- Admin portal owns authoring + RBAC; talks to D1 REST directly via the existing `d1-client` service factory.
- Mobile-facing worker exposes two read-only endpoints to the app.
- React Native app owns trigger evaluation, frequency tracking, and the popup carousel UI.

### Build order

1. **D1 schema** (3 new tables) — single migration, applied via the worker's deployment flow.
2. **Admin portal types + service + server actions** — replaces today's mock data layer behind the same component API.
3. **Admin portal: image upload + listings picker** — reuse existing R2 upload helper and listing-search components.
4. **Admin portal: switch UI from mocks to real data** — no visual change for the user; types are stable.
5. **Mobile worker endpoints** — `/popup-promotions` and `/popup-promotions/:id/landing`.
6. **React Native data layer** — fetch + cache + AsyncStorage state.
7. **React Native popup carousel + trigger logic** — drop into Home, Browse, Subcategory.
8. **React Native promo landing page** — new route.
9. **End-to-end QA** across admin → worker → app.

Steps 1–4 are admin-only and can ship to staging independently. Steps 5–8 need to land together because the mobile app expects both endpoints.

## 5. Data model (D1)

Three tables. Schedule columns live on the parent. M:N relations for screens and listings.

```sql
CREATE TABLE IF NOT EXISTS popup_promotion (
    popup_promotion_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                              -- internal label
    image_id INTEGER NOT NULL,                       -- FK to image table (mandatory)
    cta_label TEXT,                                  -- nullable: only used when ≥1 linked product
    trigger_type TEXT NOT NULL CHECK(trigger_type IN ('screen_entry', 'scroll')),
    trigger_delay_seconds INTEGER NOT NULL DEFAULT 0,
    trigger_scroll_percent INTEGER NOT NULL DEFAULT 50,
    start_at TIMESTAMP,                              -- nullable: no start = always
    end_at TIMESTAMP,                                -- nullable: no end = forever
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
    display_order TEXT DEFAULT '0',                  -- fractional indexing
    PRIMARY KEY (popup_promotion_id, product_list_id),
    FOREIGN KEY (popup_promotion_id)
        REFERENCES popup_promotion(popup_promotion_id) ON DELETE CASCADE,
    FOREIGN KEY (product_list_id)
        REFERENCES product_list(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_popup_promotion_listing_promo
    ON popup_promotion_listing(popup_promotion_id);
```

**Notes**

- `image_id` is NOT NULL — every promotion must have an image (per client requirement).
- Soft delete via `deleted_at` matches the rest of the schema.
- `popup_promotion_listing.display_order` reuses the project's existing fractional-indexing pattern so admins can reorder linked listings on the landing page.
- Screens is a junction table (not a JSON column) so we can index lookups by screen — the mobile API queries by screen on every fetch.

## 6. Mobile worker endpoints

Two read-only endpoints, both unauthenticated (audience = everyone).

### `GET /popup-promotions?screen={home|browse|subcategory}`

Returns popups eligible for the given screen, server-side filtered by `active=1`, `deleted_at IS NULL`, and current time within `[start_at, end_at]` (NULLs treated as open-ended). Frequency caps are NOT enforced server-side — the client does that.

```ts
// Response
Array<{
  id: number;
  image_url: string;           // resolved R2 path
  image_thumb_url: string | null;
  cta_label: string | null;       // null when no linked products → hide CTA button
  has_linked_products: boolean;   // convenience flag so the app knows whether to render CTA
  trigger_type: 'screen_entry' | 'scroll';
  trigger_delay_seconds: number;
  trigger_scroll_percent: number;
}>
```

### `GET /popup-promotions/:id/landing`

Returns the popup's image + linked listings (ordered by `display_order`) for the promo landing page.

```ts
// Response
{
  id: number;
  image_url: string;
  listings: Array<{
    id: number;                 // product_list.id
    title: string;
    thumb_url: string | null;
    brand_name: string | null;
    model_name: string | null;
    custom_id: string | null;
    price_mmk: number | null;
    price_usd: number | null;
    listing_type: 'sale' | 'rent';
  }>;
}
```

If the popup isn't active or is outside its schedule, return 404 — the landing page should not be reachable for inactive promos.

## 7. Admin portal

Reuse the existing patterns (createService → server actions → DataTable → form dialogs). The UI is already prototyped against mock data — wiring is a swap of the data source, not a rewrite.

**Files to add**

- `src/lib/services/popup-promotion.ts` — CRUD via `createService<PopupPromotion>`
- `src/lib/actions/popup-promotion.ts` — `createPopupPromotion`, `updatePopupPromotion`, `deletePopupPromotion`, `togglePopupPromotionActive`, `bulkDeletePopupPromotions`
- `src/lib/cache.ts` — add `getPopupPromotions()` and `getPopupPromotion(id)` with `cacheTag(CACHE_TAGS.POPUP_PROMOTIONS)`
- `src/lib/constants.ts` — add `CACHE_TAGS.POPUP_PROMOTIONS` and route `/popup-promotions`
- `src/types/popup-promotion.ts` — already exists from prototype, just remove the `ListingOption` mock extension and source from the real `Listing` type

**RBAC**

- Add `popup_promotions` to the `feature` table seed (read/create/edit/delete).
- Grant Superadmin all four permissions in the migration.
- Wire `<PermissionGate feature="popup_promotions">` around the page content (matches `/promotions` push-notifications pattern).

**Image upload**

- Reuse the same R2 upload flow used by carousel images. Image must be uploaded before submitting the form; on save, send `image_id` along with the other fields.

**Linked-products picker**

- Reuse the listing search component used elsewhere (chat product picker is the closest match). Returns an ordered array of `product_list_id` saved to `popup_promotion_listing`.

## 8. React Native app

### Data layer

```
PopupPromoStore (Zustand or Context, mounted in app root)
  ├─ allPopups: Map<screen, PopupPromo[]>   // fetched once on app start
  ├─ localState: Record<popupId, { impressionsByDate, clickedAt }>
  ├─ usePopupForScreen(screen): PopupPromo[]   // filtered by eligibility
  ├─ markImpression(id): void
  ├─ markClicked(id): void
  └─ persist localState to AsyncStorage under key "popup_state_v1"
```

**Eligibility check (pure function):**

```ts
function isEligible(popup, localState): boolean {
  if (localState.ctaClickedAt) return false;         // CTA tapped before → never show
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = localState.impressionsByDate?.[today] ?? 0;
  return todayCount < 2;                              // 2x/day cap per popup
}
```

**State shape per popup:**

```ts
type PopupLocalState = {
  impressionsByDate: Record<string, number>;  // "YYYY-MM-DD" → count
  ctaClickedAt: string | null;                // ISO timestamp; sticky once set
};
```

`ctaClickedAt` is set ONLY when the user taps the CTA button. Tapping X or tapping the image does not set it.

### Trigger evaluation

A single `usePopupForScreen(screen)` hook drives the modal visibility:

- **screen_entry**: `setTimeout(showModal, popup.trigger_delay_seconds * 1000)` on screen mount; clear on unmount.
- **scroll**: subscribe to the screen's main ScrollView/FlatList `onScroll`. Trigger when `contentOffset.y / (contentSize.height - layoutHeight) >= trigger_scroll_percent / 100`. Use a ref to fire only once per screen mount.

When multiple popups are eligible for the same screen, the modal opens with a horizontal `PagerView` (or `FlatList` with `pagingEnabled`) showing all of them. Each slide records its own impression when it becomes visible (use a `viewability` callback).

**Carousel growth on staggered triggers**: if popup A fires at 3s and popup B at 5s, the modal opens at 3s with just A. When B's delay elapses (or its scroll threshold trips), B is **appended to the end** of the carousel. The user's currently-viewed slide does NOT get yanked or replaced — the new slide is simply available if they swipe to it. Implementation: keep the active popups in a state array; the trigger handlers `push` rather than replace.

### Popup carousel UI

- Full-screen-ish modal with a translucent backdrop.
- Each slide: image fills, X button top-right. CTA button overlay at bottom **only when `has_linked_products` is true**.
- Swipe horizontally between slides (only when more than one).
- **X close tap** → dismisses the whole modal. Every visible slide is already counted as an impression. Does NOT mark any popup as clicked.
- **CTA button tap** (only present when ≥1 linked product) → `markCtaClicked(id)` + `router.push(`/promo/${id}`)` + close modal.
- **Image tap (anywhere outside CTA and X)** → swallowed (no navigation, no state change). Use a transparent overlay catcher or set `pointerEvents` so the underlying image isn't pressable.

### Promo landing page

`/promo/[id]` route. **Intentionally minimal** — no marketing copy, no extra sections.

- Header: full-width image banner from `image_url`.
- Below: vertical list of linked listings using the existing React Native `ListingCard` component.
- Pull-to-refresh re-fetches `/popup-promotions/:id/landing`.
- If 404 (popup expired/deactivated while page was open, or popup has 0 linked products), show "This promotion has ended" empty state.
- If a popup has 0 linked products, this route is unreachable from the carousel (no CTA button). If a user reaches it via a stale deep link, treat as 404.

### Wiring into the three screens

- Each of `app/(tabs)/index.tsx` (Home), `app/(tabs)/browse.tsx`, `app/(tabs)/category/[id].tsx` (Subcategory) mounts the `PopupCarousel` once and calls `usePopupForScreen('home' | 'browse' | 'subcategory')`. The scroll-trigger variant requires passing a scroll handler ref to the screen's existing list.

## 9. Error handling

- **Worker returns 5xx on `/popup-promotions?screen=...`**: app silently swallows (popups are non-essential — never block screen rendering). Cached payload from last successful fetch keeps working.
- **Worker returns 404 on `/popup-promotions/:id/landing`**: app shows "This promotion has ended" + a Back button. Also clears that popup id from `allPopups` to prevent re-showing.
- **Image fails to load in popup**: skip that slide silently. Don't show a broken-image popup.
- **Admin saves a promotion with no linked products**: allowed. The popup renders **image + X only** (no CTA button). The `/promo/[id]` landing page is not reachable from such a popup. This supports "branding-only / announcement" popups.
- **Admin saves a promotion with linked products but blank CTA label**: blocked at form validation — when ≥1 product is linked, CTA label is required.
- **Schedule is in the past on save**: allowed but warn the admin inline ("This promotion's end date is in the past — it won't show in the app").

## 10. Testing strategy

**Admin portal**
- Service unit tests for CRUD round-trips against D1 staging.
- Form validation: image required, CTA required, name required, ≥1 target screen.
- Toggle-active server action returns the new state and invalidates `CACHE_TAGS.POPUP_PROMOTIONS`.

**Worker**
- Endpoint tests: `?screen=home` returns only active, scheduled, non-deleted promos with that screen attached.
- `/landing` returns 404 for inactive/out-of-schedule promos.

**React Native**
- Pure-function unit test for `isEligible` (CTA-clicked → false; 2 impressions today → false; 1 impression today → true).
- Tap-target unit tests: X tap only fires dismiss; CTA tap fires `markCtaClicked` + navigate; image tap fires nothing.
- Manual QA matrix: each trigger × each screen × single popup × multiple popups, including the carousel swipe interaction.
- AsyncStorage round-trip on app cold start (state survives, `ctaClickedAt` stays permanent).

## 11. Resolved decisions (was: open questions)

All four open questions have been answered by the client owner:

1. **Empty linked products on save**: **Allowed.** Popup renders as image + X (no CTA), no landing page reachable. This is the "branding/announcement" mode.
2. **Image upload**: **Same R2 flow as carousel.** No separate promo image library.
3. **Multiple popups with staggered triggers**: **Carousel grows.** Late arrivals append to the end; the user's currently-viewed slide is never replaced. See §8 "Carousel growth on staggered triggers".
4. **Promo landing page back behavior**: **Previous screen** (default React Navigation behavior). Not always Home.

Additionally:

5. **What counts as a "click → never again"**: **CTA button tap only.** Tapping X = dismiss (impression counted, popup may show again). Tapping the image = no-op. See §8 and §12.

## 12. Hard-coded rules summary (re-stated for clarity)

These are baked into the mobile client. Not configurable. Not surfaced as form fields.

- Each popup shows max **2 times per day** per user.
- **Tapping the CTA button** → that popup is **never shown again** to that user. (Tapping X or tapping the image does NOT trigger this.)
- **X close** = dismiss only. Counts as an impression. Popup can show again later.
- **Image taps** (outside CTA and X) = no-op. Only the CTA button navigates.
- Multiple eligible popups → **swipable carousel** (no queueing).
- Tracking lives on the device (AsyncStorage). No server-side impressions table.
- No cooldown between screens.
