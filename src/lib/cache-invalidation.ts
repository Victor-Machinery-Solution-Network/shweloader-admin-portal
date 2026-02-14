import { updateTag, revalidatePath } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";

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
  ],
  [CACHE_TAGS.ATTACHMENT_MODELS]: [
    CACHE_TAGS.SALE_LISTINGS,
    CACHE_TAGS.RENT_LISTINGS,
    CACHE_TAGS.FEATURED_LISTINGS,
  ],
  [CACHE_TAGS.LOCATIONS]: [
    CACHE_TAGS.SALE_LISTINGS,
    CACHE_TAGS.RENT_LISTINGS,
    CACHE_TAGS.FEATURED_LISTINGS,
  ],
  [CACHE_TAGS.PARTNERS]: [
    CACHE_TAGS.SALE_LISTINGS,
    CACHE_TAGS.RENT_LISTINGS,
    CACHE_TAGS.FEATURED_LISTINGS,
  ],
};

/**
 * Invalidate one or more cache tags plus all their dependents (recursive).
 * Uses a Set to deduplicate — safe against circular references.
 */
export function invalidateTag(...tags: CacheTag[]) {
  const all = new Set<CacheTag>();

  function resolve(tag: CacheTag) {
    if (all.has(tag)) return;
    all.add(tag);
    for (const dep of CACHE_DEPENDENTS[tag] ?? []) resolve(dep);
  }

  for (const tag of tags) resolve(tag);
  for (const tag of all) updateTag(tag);

  // updateTag only invalidates unstable_cache data entries.
  // revalidatePath invalidates the ISR route cache so the server
  // re-renders pages with fresh data on the next request.
  // Combined with staleTimes.static: 0 (no client Router Cache),
  // this ensures navigating to any page always shows fresh data.
  revalidatePath("/", "layout");
}
