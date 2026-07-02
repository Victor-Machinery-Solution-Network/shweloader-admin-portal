import { updateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { revalidatePublicSite } from "@/lib/revalidate-public";

type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Dependency map: when a key tag is invalidated, all tags in its value
 * array are also invalidated (recursively).
 *
 * Derived from SQL JOINs — e.g. equipment_model JOINs product_brand,
 * so mutating a brand must also invalidate equipment models.
 */
const CACHE_DEPENDENTS: Partial<Record<CacheTag, CacheTag[]>> = {
  [CACHE_TAGS.BRANDS]: [
    CACHE_TAGS.EQUIPMENT_MODELS,
    CACHE_TAGS.ATTACHMENT_MODELS,
  ],
  [CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES]: [
    CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES,
  ],
  [CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES]: [CACHE_TAGS.EQUIPMENT_MODELS],
  [CACHE_TAGS.ATTACHMENT_CATEGORIES]: [CACHE_TAGS.ATTACHMENT_MODELS],
  [CACHE_TAGS.ARTICLE_CATEGORIES]: [CACHE_TAGS.ARTICLES],
  [CACHE_TAGS.EQUIPMENT_MODELS]: [
    CACHE_TAGS.SALE_LISTINGS,
    CACHE_TAGS.RENT_LISTINGS,
    CACHE_TAGS.FEATURED_LISTINGS,
    CACHE_TAGS.ENQUIRIES,
  ],
  [CACHE_TAGS.ATTACHMENT_MODELS]: [
    CACHE_TAGS.SALE_LISTINGS,
    CACHE_TAGS.RENT_LISTINGS,
    CACHE_TAGS.FEATURED_LISTINGS,
    CACHE_TAGS.ENQUIRIES,
  ],
  [CACHE_TAGS.LOCATIONS]: [
    CACHE_TAGS.SALE_LISTINGS,
    CACHE_TAGS.RENT_LISTINGS,
    CACHE_TAGS.FEATURED_LISTINGS,
    CACHE_TAGS.ENQUIRIES,
  ],
  [CACHE_TAGS.PARTNERS]: [
    CACHE_TAGS.SALE_LISTINGS,
    CACHE_TAGS.RENT_LISTINGS,
    CACHE_TAGS.FEATURED_LISTINGS,
    CACHE_TAGS.ENQUIRIES,
  ],
  [CACHE_TAGS.SALE_LISTINGS]: [CACHE_TAGS.ENQUIRIES],
  [CACHE_TAGS.RENT_LISTINGS]: [CACHE_TAGS.ENQUIRIES],
  [CACHE_TAGS.USERS]: [CACHE_TAGS.ENQUIRIES],
  [CACHE_TAGS.FEATURED_LISTINGS]: [
    CACHE_TAGS.SALE_LISTINGS,
    CACHE_TAGS.RENT_LISTINGS,
  ],
  [CACHE_TAGS.CONDITION_TYPES]: [CACHE_TAGS.SALE_LISTINGS],
  [CACHE_TAGS.ROLES]: [CACHE_TAGS.PERMISSIONS],
  [CACHE_TAGS.BLACKLIST]: [CACHE_TAGS.USERS],
};

/**
 * Map an admin cache tag → the PUBLIC web app's cache tag, for entities the
 * public site renders. Tags absent here are admin-only (users, roles,
 * enquiries, popup promotions, …) and never trigger a public revalidation.
 *
 * This is collection-level only. A single product/article DETAIL page is busted
 * surgically by its `listing:<id>` / `blog:<id>` tag from the listing/article
 * actions (see actions/listing.ts, actions/article.ts) — not here, because this
 * choke-point only receives tag enums, not row ids.
 */
const PUBLIC_TAG_FOR: Partial<Record<CacheTag, string>> = {
  [CACHE_TAGS.BRANDS]: "brands",
  [CACHE_TAGS.LOCATIONS]: "locations",
  [CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES]: "categories",
  [CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES]: "categories",
  [CACHE_TAGS.EQUIPMENT_MODELS]: "categories",
  [CACHE_TAGS.ATTACHMENT_CATEGORIES]: "categories",
  [CACHE_TAGS.ATTACHMENT_MODELS]: "categories",
  [CACHE_TAGS.CONDITION_TYPES]: "categories",
  [CACHE_TAGS.SALE_LISTINGS]: "listings",
  [CACHE_TAGS.RENT_LISTINGS]: "listings",
  [CACHE_TAGS.FEATURED_LISTINGS]: "featured-listings",
  [CACHE_TAGS.ARTICLES]: "blogs",
  [CACHE_TAGS.ARTICLE_CATEGORIES]: "blog-categories",
  [CACHE_TAGS.ANNOUNCEMENTS]: "announcements",
  [CACHE_TAGS.CAROUSELS]: "carousel",
  [CACHE_TAGS.BUSINESS_TYPES]: "business-types",
  [CACHE_TAGS.PARTNER_TYPES]: "partner-types",
  [CACHE_TAGS.SETTINGS]: "app-settings",
};

/**
 * Admin tags whose entities render on EVERY public product detail page. Detail
 * pages carry only their surgical `listing:<id>` tag (so per-listing edits stay
 * surgical), plus one broad `listing-details` tag fired here when any of THESE
 * change — a brand/model/location/partner/condition rename must refresh all
 * detail pages, not just collection views. Deliberately excludes
 * SALE/RENT/FEATURED_LISTINGS: those fire on every ordinary listing edit, and
 * mapping them would nuke every warm detail page on each save. The exchange
 * rate is the other all-pages case — its trigger tags ARE the listing tags, so
 * it can't be detected here; actions/setting.ts sends `listing-details` itself.
 */
const DETAIL_PAGE_TAGS: ReadonlySet<CacheTag> = new Set([
  CACHE_TAGS.BRANDS,
  CACHE_TAGS.EQUIPMENT_MODELS,
  CACHE_TAGS.ATTACHMENT_MODELS,
  CACHE_TAGS.LOCATIONS,
  CACHE_TAGS.PARTNERS,
  CACHE_TAGS.CONDITION_TYPES,
]);

/**
 * Invalidate one or more cache tags plus all their dependents (recursive).
 * Uses a Set to deduplicate — safe against circular references.
 *
 * Two layers fire from the resolved tag set:
 *  1. The PUBLIC web app's cache, via a fire-and-forget webhook (mapped tags).
 *  2. This admin app's OWN cache, via updateTag (read-your-own-writes).
 *
 * The public revalidation runs FIRST and independently: updateTag is a
 * Server-Action-only API that can throw outside that context (e.g. the daily
 * cron purge Route Handler), so we must not let it gate the public bust.
 */
export function invalidateTag(...tags: CacheTag[]) {
  const all = new Set<CacheTag>();

  function resolve(tag: CacheTag) {
    if (all.has(tag)) return;
    all.add(tag);
    for (const dep of CACHE_DEPENDENTS[tag] ?? []) resolve(dep);
  }

  for (const tag of tags) resolve(tag);

  // 1. Bust the public site (collection-level) for any public-facing tags.
  //    Fire-and-forget; no-ops when no public tags map or the env is unset.
  const publicTags = new Set(
    [...all]
      .map((t) => PUBLIC_TAG_FOR[t])
      .filter((t): t is string => Boolean(t)),
  );
  // Detail-page taxonomy changed → also bust ALL product detail pages.
  if ([...all].some((t) => DETAIL_PAGE_TAGS.has(t))) {
    publicTags.add("listing-details");
  }
  revalidatePublicSite([...publicTags]);

  // 2. Bust this admin app's own cache.
  for (const tag of all) updateTag(tag);
}
