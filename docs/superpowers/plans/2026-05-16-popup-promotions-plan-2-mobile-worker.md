# Popup Promotions — Plan 2: Mobile Worker Endpoints

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose two read-only public endpoints on the mobile-facing worker so the React Native app can fetch eligible popup promotions per screen and load a promo's landing data (image + linked listings).

**Architecture:** New `src/routes/popup-promotions.ts` Hono sub-router on the existing mobile worker. Reads directly from D1 via the native binding (`c.env.DB.prepare(...)`), no service layer. Filtering by screen, schedule window (`start_at` / `end_at` NULL-as-open-ended), and `active=1` happens in SQL — client never sees inactive or out-of-schedule popups. Frequency capping stays client-side (Plan 3); the worker is stateless and returns the eligible set every call.

**Tech Stack:** Cloudflare Workers · Hono · D1 (native binding) · TypeScript. No test framework — verify via typecheck + curl against staging.

**Repository:** `/Users/peter/Desktop/cloudflare-worker-app-rest-api-dev` (separate repo from the admin portal). Auto-deploys to `api.staging.shweloader.com.mm` on push to `main`.

**Source spec:** [docs/superpowers/specs/2026-05-16-popup-promotions-design.md](../specs/2026-05-16-popup-promotions-design.md) (§6)

---

## File structure

**Create:**
- `src/routes/popup-promotions.ts` — new Hono sub-router; both endpoints live here

**Modify:**
- `src/index.ts` — wire the sub-router under `/popup-promotions`

That's it — single new route file plus a one-line registration. Mobile worker convention is one file per feature; no shared service / repository layer to update.

---

## Task 1: Scaffold the route file + wire into index.ts

Lay the empty sub-router in place first so subsequent tasks just fill in handlers. Keeps each task's diff small and reviewable.

**Files:**
- Create: `src/routes/popup-promotions.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create the empty sub-router**

Create `src/routes/popup-promotions.ts`:

```ts
import { Hono } from 'hono';
import type { Env } from '../types';

const popupPromotions = new Hono<{ Bindings: Env }>();

// Handlers added in subsequent tasks:
//   GET /             — eligible popups for ?screen={home|browse|subcategory}
//   GET /:id/landing  — popup image + linked listings for the promo landing page

export default popupPromotions;
```

- [ ] **Step 2: Wire the sub-router into `src/index.ts`**

Open `src/index.ts`. Add the import alongside the existing route imports (alphabetical-ish; place it after the `notifications` import, before the existing `const app = new Hono...` line):

```ts
import popupPromotions from './routes/popup-promotions';
```

Then add the route registration. Find the block of `app.route(...)` calls in the "Public routes (no auth)" section and append (after the `app-settings` line):

```ts
app.route('/popup-promotions', popupPromotions);
```

- [ ] **Step 3: Typecheck**

Run from the worker repo root:

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
npx tsc --noEmit
```

Expected: PASS (zero errors).

- [ ] **Step 4: Smoke test that the route is registered**

You can't deploy from your local terminal (per project memory: no wrangler CLI; auto-deploy on push). Instead verify routing works by reading what you wrote:

```bash
grep -E "popup-promotions" src/index.ts src/routes/popup-promotions.ts
```

Expected output (4 lines): the import in `index.ts`, the `app.route('/popup-promotions', ...)` registration in `index.ts`, the Hono router declaration in the route file, and the comment block in the route file.

- [ ] **Step 5: Commit**

```bash
git add src/routes/popup-promotions.ts src/index.ts
git commit -m "feat(popup-promotions): scaffold sub-router"
```

Do NOT push yet — Tasks 2 and 3 add the actual handlers; a single push at the end (Task 5) avoids a half-deployed state on staging.

---

## Task 2: `GET /popup-promotions?screen={...}` — eligible popups for a screen

The mobile app calls this on every screen mount for Home / Browse / Subcategory. Returns the popups that are active, inside their schedule window, and tagged for the given screen. The app handles per-user frequency capping locally (AsyncStorage); the worker is stateless.

**Files:**
- Modify: `src/routes/popup-promotions.ts`

- [ ] **Step 1: Append the GET / handler**

Add this to `src/routes/popup-promotions.ts`, immediately above the `export default` line:

```ts
type PopupListRow = {
  id: number;
  image_url: string;
  image_thumb_url: string | null;
  cta_label: string | null;
  trigger_type: 'screen_entry' | 'scroll';
  trigger_delay_seconds: number;
  trigger_scroll_percent: number;
  linked_count: number;
};

const VALID_SCREENS = ['home', 'browse', 'subcategory'] as const;
type Screen = (typeof VALID_SCREENS)[number];

/**
 * GET /popup-promotions?screen={home|browse|subcategory}
 *
 * Returns popups that are:
 *  - active=1
 *  - deleted_at IS NULL
 *  - within their schedule window (NULL bounds treated as open-ended)
 *  - attached to the requested screen via popup_promotion_screen
 *
 * Frequency capping (2x/day, click-then-never-again) lives client-side
 * in the React Native app — this endpoint is stateless.
 */
popupPromotions.get('/', async (c) => {
  const screen = c.req.query('screen');
  if (!screen || !VALID_SCREENS.includes(screen as Screen)) {
    return c.json(
      { error: `Missing or invalid screen — expected one of: ${VALID_SCREENS.join(', ')}` },
      400,
    );
  }

  const results = await c.env.DB.prepare(
    `SELECT
       p.popup_promotion_id AS id,
       i.image_url,
       i.thumb_url AS image_thumb_url,
       p.cta_label,
       p.trigger_type,
       p.trigger_delay_seconds,
       p.trigger_scroll_percent,
       (SELECT COUNT(*) FROM popup_promotion_listing pl
          WHERE pl.popup_promotion_id = p.popup_promotion_id) AS linked_count
     FROM popup_promotion p
     JOIN image i ON p.image_id = i.image_id
     JOIN popup_promotion_screen pps ON pps.popup_promotion_id = p.popup_promotion_id
     WHERE p.active = 1
       AND p.deleted_at IS NULL
       AND pps.screen = ?
       AND (p.start_at IS NULL OR p.start_at <= datetime('now'))
       AND (p.end_at IS NULL OR p.end_at >= datetime('now'))
     ORDER BY p.created_at DESC`,
  )
    .bind(screen)
    .all<PopupListRow>();

  const popups = (results.results ?? []).map((row) => ({
    id: row.id,
    image_url: row.image_url,
    image_thumb_url: row.image_thumb_url,
    cta_label: row.linked_count > 0 ? row.cta_label : null,
    has_linked_products: row.linked_count > 0,
    trigger_type: row.trigger_type,
    trigger_delay_seconds: row.trigger_delay_seconds,
    trigger_scroll_percent: row.trigger_scroll_percent,
  }));

  return c.json(popups);
});
```

**Why the `has_linked_products` shape:** the spec says popups with zero linked products should hide the CTA button on the mobile side. Surface that directly so the client doesn't need to call a second endpoint to decide what to render. `cta_label` is forced to `null` in that case for defensive consistency (a stray label on a "branding-only" popup would be confusing in client code).

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/routes/popup-promotions.ts
git commit -m "feat(popup-promotions): GET / — eligible popups per screen"
```

---

## Task 3: `GET /popup-promotions/:id/landing` — promo landing data

Powers the React Native promo landing screen. Returns the popup's banner image plus the ordered list of linked listings (image, brand, custom_id, price, sale/rent type) shaped to fit the existing mobile `ListingCard` component.

**Files:**
- Modify: `src/routes/popup-promotions.ts`

- [ ] **Step 1: Append the GET /:id/landing handler**

Add this to `src/routes/popup-promotions.ts`, immediately above the existing `export default` line (and after the `GET /` handler from Task 2):

```ts
type LandingPromoRow = {
  id: number;
  image_url: string;
};

type LandingListingRow = {
  id: number;
  title: string | null;
  thumb_url: string | null;
  brand_name: string | null;
  model_name: string | null;
  custom_id: string | null;
  price_mmk: number | null;
  price_usd: number | null;
  listing_type: 'sale' | 'rent' | null;
};

/**
 * GET /popup-promotions/:id/landing
 *
 * Returns the popup's banner image plus all linked listings (equipment only
 * for now — attachment listings are a Plan-2 follow-up).
 *
 * 404s on:
 *  - popup not found
 *  - popup soft-deleted (deleted_at IS NOT NULL)
 *  - popup inactive (active = 0)
 *  - popup outside its schedule window
 *  - popup with zero linked products (landing page is unreachable in the
 *    happy path because the app hides the CTA button when count = 0; treat
 *    direct access as expired/invalid)
 */
popupPromotions.get('/:id/landing', async (c) => {
  const idParam = c.req.param('id');
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ error: 'Invalid promo id' }, 400);
  }

  const promoRow = await c.env.DB.prepare(
    `SELECT p.popup_promotion_id AS id, i.image_url
     FROM popup_promotion p
     JOIN image i ON p.image_id = i.image_id
     WHERE p.popup_promotion_id = ?
       AND p.active = 1
       AND p.deleted_at IS NULL
       AND (p.start_at IS NULL OR p.start_at <= datetime('now'))
       AND (p.end_at IS NULL OR p.end_at >= datetime('now'))
     LIMIT 1`,
  )
    .bind(id)
    .first<LandingPromoRow>();

  if (!promoRow) {
    return c.json({ error: 'Promotion not found or no longer active' }, 404);
  }

  const listingsResult = await c.env.DB.prepare(
    `SELECT
       pl.id,
       em.name AS title,
       pl.thumbnail_url AS thumb_url,
       pb.name AS brand_name,
       em.name AS model_name,
       pl.custom_id_suffix AS custom_id,
       COALESCE(sl.mmk_price, rl.mmk_price) AS price_mmk,
       COALESCE(sl.usd_price, rl.usd_price) AS price_usd,
       CASE
         WHEN sl.id IS NOT NULL THEN 'sale'
         WHEN rl.id IS NOT NULL THEN 'rent'
         ELSE NULL
       END AS listing_type
     FROM popup_promotion_listing ppl
     JOIN product_list pl ON pl.id = ppl.product_list_id
     LEFT JOIN equipment_model em ON pl.equipment_model_id = em.model_id
     LEFT JOIN product_brand pb ON em.brand_id = pb.brand_id
     LEFT JOIN sale_listing sl
       ON sl.product_list_id = pl.id AND sl.deleted_at IS NULL
     LEFT JOIN rent_listing rl
       ON rl.product_list_id = pl.id AND rl.deleted_at IS NULL
     WHERE ppl.popup_promotion_id = ?
       AND pl.deleted_at IS NULL
       AND pl.is_draft = 0
     ORDER BY ppl.display_order, ppl.product_list_id`,
  )
    .bind(id)
    .all<LandingListingRow>();

  const listings = listingsResult.results ?? [];

  if (listings.length === 0) {
    // No linked products — landing page is meaningless. Treat as expired so
    // the app can show its "This promotion has ended" empty state.
    return c.json({ error: 'Promotion has no linked products' }, 404);
  }

  return c.json({
    id: promoRow.id,
    image_url: promoRow.image_url,
    listings,
  });
});
```

**SQL notes:**

- The JOINs to `sale_listing` / `rent_listing` are LEFT JOINs with `deleted_at IS NULL` in the ON clause (not WHERE) so soft-deleted listings are excluded but their parent `product_list` row still appears with `listing_type = NULL`. The app can render those as "Not available" or filter them — its call.
- `pl.is_draft = 0` matches the admin picker's filter (Plan 1, `getPopupListingOptions`) so a draft product an admin accidentally linked never reaches mobile users.
- `ORDER BY ppl.display_order, ppl.product_list_id` matches the Plan-1 follow-up (commit `4a0cbbf`) — admin-defined order with a deterministic tiebreaker when everything is `'0'`.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/routes/popup-promotions.ts
git commit -m "feat(popup-promotions): GET /:id/landing — banner + linked listings"
```

---

## Task 4: Push to deploy, then smoke-test against staging

The worker auto-deploys on push to `main`. Per project memory, this is the canonical deploy path — no wrangler, no dashboard click required for normal pushes.

- [ ] **Step 1: Push**

```bash
cd /Users/peter/Desktop/cloudflare-worker-app-rest-api-dev
git push origin main
```

Expected output: refs updated; no errors. If GitHub returns a "repository moved" notice, follow the redirect instructions (the repo URL may have changed — see Plan 1's worker fix where the admin worker's old URL redirected to a new name).

- [ ] **Step 2: Wait for the deploy to go active**

Poll the new endpoint with a known-bad screen value to confirm the route is wired AND the handler is the new code. If the route isn't deployed yet, you'll get a 404 (Hono "Not Found"); once deployed, you'll get a 400 with the screen-validation error from Task 2.

```bash
source /Users/peter/Desktop/shweloader-admin-portal/.env.local
for i in 1 2 3 4 5 6; do
  RESP=$(curl -s -o /dev/null -w "%{http_code}" \
    "${CLOUDFLARE_WORKER_API_URL}/popup-promotions?screen=invalid")
  echo "attempt $i: HTTP $RESP"
  if [ "$RESP" = "400" ]; then
    echo "✓ deployed — handler is live"
    break
  fi
  [ "$i" -lt 6 ] && sleep 20
done
```

Expected: HTTP 400 within ~60s.

**Note:** Per project memory (`feedback_worker_deploy.md`), Cloudflare's "Connect to Git" sometimes loses the GitHub webhook after a repo rename. If after 3 minutes you still see HTTP 404, open the Cloudflare dashboard → Workers & Pages → mobile worker → **Deployments** and confirm the new commit is listed and active. If it isn't, manually trigger a deploy from the dashboard.

- [ ] **Step 3: Smoke-test the GET / endpoint**

Hit it with each of the three valid screens. If you created a popup in Plan 1 for screen=home, you should see exactly that popup. Otherwise the response is `[]`.

```bash
for SCREEN in home browse subcategory; do
  echo "--- screen=$SCREEN ---"
  curl -s "${CLOUDFLARE_WORKER_API_URL}/popup-promotions?screen=$SCREEN" | head -c 600
  echo ""
done
```

Expected for each screen: either `[]` or a JSON array of popup objects with the fields `id`, `image_url`, `image_thumb_url`, `cta_label`, `has_linked_products`, `trigger_type`, `trigger_delay_seconds`, `trigger_scroll_percent`. No `error` field.

- [ ] **Step 4: Smoke-test the /:id/landing endpoint**

Use a popup id you can see in the GET / response above. If you have none, create one in the admin UI (`/popup-promotions/new`) and link at least one product, then come back.

```bash
PROMO_ID=<paste id from previous step>
curl -s "${CLOUDFLARE_WORKER_API_URL}/popup-promotions/${PROMO_ID}/landing" | head -c 1000
```

Expected: JSON with `id`, `image_url`, and a non-empty `listings` array. Each listing has `id`, `title`, `thumb_url`, `brand_name`, `model_name`, `custom_id`, `price_mmk`, `price_usd`, `listing_type`.

Also test the 404 paths:

```bash
# Non-existent id
curl -s -o /dev/null -w "%{http_code}\n" "${CLOUDFLARE_WORKER_API_URL}/popup-promotions/999999/landing"
# Expected: 404

# Invalid id (non-numeric)
curl -s -o /dev/null -w "%{http_code}\n" "${CLOUDFLARE_WORKER_API_URL}/popup-promotions/abc/landing"
# Expected: 400
```

- [ ] **Step 5: Deactivate test — toggle a popup off, re-fetch, confirm it disappears**

In the admin UI (`/popup-promotions`), toggle a popup's Status switch to Inactive. Then:

```bash
curl -s "${CLOUDFLARE_WORKER_API_URL}/popup-promotions?screen=home" | grep -c '"id"'
```

Expected: the count goes down by 1 (or to 0 if it was the only one). Toggle it back to Active and re-run — count returns. This proves the worker respects the `active` column live.

- [ ] **Step 6: Document the smoke-test result in this plan's checkbox above**

(No code change — just confirm that the deploy + 4 smoke tests passed. If any failed, stop and investigate before declaring Plan 2 complete.)

---

## Task 5: (Optional polish) Add an `OPTIONS` preflight & cache headers

The two new endpoints inherit CORS from the worker's root `cors()` middleware, which already allows `*`. No additional CORS work needed. But the response can opt into a short `Cache-Control` so the React Native app's fetch doesn't hammer the worker on every screen mount.

This is **optional**. Skip if you'd rather keep the responses fully dynamic and let the app cache them in-memory.

**Files:**
- Modify: `src/routes/popup-promotions.ts`

- [ ] **Step 1: Add a Cache-Control header to GET /**

At the bottom of the GET `/` handler, just before `return c.json(popups);`, set:

```ts
c.header('Cache-Control', 'public, max-age=30');
```

Rationale: 30 seconds is short enough that toggling a popup off feels near-instant during demos, but long enough to absorb tab-rapid-fire from the React Native app during screen transitions.

Do NOT add it to `/:id/landing` — that one is per-promo and should always reflect the latest linked listings.

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/routes/popup-promotions.ts
git commit -m "perf(popup-promotions): cache eligible list for 30s"
```

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Self-review checklist for the implementer

After all 4 (or 5) tasks land:

- [ ] `npx tsc --noEmit` passes in the worker repo
- [ ] `git log --oneline -5` shows the new commits with the expected messages
- [ ] GET `/popup-promotions?screen=home` returns a JSON array (`[]` is fine if no active popups)
- [ ] GET `/popup-promotions?screen=invalid` returns HTTP 400 with a sensible error message
- [ ] GET `/popup-promotions/:id/landing` returns the popup + a non-empty `listings` array for a real id
- [ ] GET `/popup-promotions/999999/landing` returns HTTP 404
- [ ] Toggling a popup's Active switch in the admin UI immediately removes it from the worker response (or after up to 30s if Task 5 caching was added)

Once everything's green, mark Plan 2 done in your todo list. Plan 3 (React Native popup carousel) is unblocked.

---

## What's NOT in this plan (intentionally deferred)

- **Attachment listings** in `/:id/landing` — only equipment listings surface (matches Plan 1's picker). If a popup is linked to an attachment-only listing, that listing will appear with `title: null` / `brand_name: null` / `model_name: null` and `listing_type` derived from sale/rent rows. Add a UNION-ALL pattern in a follow-up if the client needs attachments in popups.
- **Server-side impression / click tracking** — out of scope per the spec (§12: tracking is local-only).
- **Per-user targeting** — Plan 1 chose to show popups to everyone (guests + logged-in alike), so this endpoint is unauthenticated.
- **Pagination on the landing listings array** — `popup_promotion_listing` rarely holds more than a few dozen rows; if a popup ever links to 500+ products, add a `LIMIT` + cursor.

These are real follow-ups, not bugs. None block Plan 3.
