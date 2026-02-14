import { unstable_cache } from "next/cache";
import { CACHE_TTL, CACHE_TAGS } from "@/lib/constants";
import { brandService } from "@/lib/services/brand";
import { locationService } from "@/lib/services/location";
import {
  mainCategoryService,
  subCategoryService,
  equipmentModelService,
} from "@/lib/services/equipment";
import {
  attachmentCategoryService,
  attachmentModelService,
} from "@/lib/services/attachment";
import {
  customerService,
  businessTypeService,
} from "@/lib/services/customer";
import { announcementTextService } from "@/lib/services/announcement";
import {
  articleCategoryService,
  articleStatusTypeService,
} from "@/lib/services/article";
import { carouselService } from "@/lib/services/carousel";
import {
  getApprovedPartners,
  getSaleListingsWithDetails,
  getRentListingsWithDetails,
  getFeaturedListingsWithDetails,
} from "@/lib/actions/listing";
import { getPartnersWithDetails } from "@/lib/actions/partner";
import { getArticlesWithDetails } from "@/lib/actions/article";
import { getCarouselImages } from "@/lib/actions/carousel";

// ---------------------------------------------------------------------------
// Tier 1 — Lookup tables (5 min TTL)
// ---------------------------------------------------------------------------

export const getCachedBrands = unstable_cache(
  () => brandService.list({ sort_by: "name", order: "asc" }),
  ["brands-list"],
  { revalidate: CACHE_TTL.LOOKUP, tags: [CACHE_TAGS.BRANDS] },
);

export const getCachedLocations = unstable_cache(
  () => locationService.list({ sort_by: "city_name", order: "asc" }),
  ["locations-list"],
  { revalidate: CACHE_TTL.LOOKUP, tags: [CACHE_TAGS.LOCATIONS] },
);

export const getCachedMainCategories = unstable_cache(
  () =>
    mainCategoryService.list({ sort_by: "display_order", order: "asc" }),
  ["equipment-main-categories-list"],
  {
    revalidate: CACHE_TTL.LOOKUP,
    tags: [CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES],
  },
);

export const getCachedSubCategories = unstable_cache(
  () =>
    subCategoryService.list({ sort_by: "display_order", order: "asc" }),
  ["equipment-sub-categories-list"],
  {
    revalidate: CACHE_TTL.LOOKUP,
    tags: [CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES],
  },
);

export const getCachedAttachmentCategories = unstable_cache(
  () =>
    attachmentCategoryService.list({
      sort_by: "display_order",
      order: "asc",
    }),
  ["attachment-categories-list"],
  {
    revalidate: CACHE_TTL.LOOKUP,
    tags: [CACHE_TAGS.ATTACHMENT_CATEGORIES],
  },
);

// ---------------------------------------------------------------------------
// Tier 2 — Models & partners (2 min TTL)
// ---------------------------------------------------------------------------

export const getCachedEquipmentModels = unstable_cache(
  () => equipmentModelService.list({ sort_by: "name", order: "asc" }),
  ["equipment-models-list"],
  { revalidate: CACHE_TTL.MODEL, tags: [CACHE_TAGS.EQUIPMENT_MODELS] },
);

export const getCachedAttachmentModels = unstable_cache(
  () => attachmentModelService.list({ sort_by: "name", order: "asc" }),
  ["attachment-models-list"],
  { revalidate: CACHE_TTL.MODEL, tags: [CACHE_TAGS.ATTACHMENT_MODELS] },
);

export const getCachedApprovedPartners = unstable_cache(
  () => getApprovedPartners(),
  ["approved-partners"],
  { revalidate: CACHE_TTL.MODEL, tags: [CACHE_TAGS.PARTNERS] },
);

export const getCachedPartnersWithDetails = unstable_cache(
  () => getPartnersWithDetails(),
  ["partners-with-details"],
  { revalidate: CACHE_TTL.MODEL, tags: [CACHE_TAGS.PARTNERS] },
);

// ---------------------------------------------------------------------------
// Tier 1 — Customers, announcements, articles (5 min TTL)
// ---------------------------------------------------------------------------

export const getCachedCustomers = unstable_cache(
  () => customerService.list({ sort_by: "created_at", order: "desc" }),
  ["customers-list"],
  { revalidate: CACHE_TTL.LOOKUP, tags: [CACHE_TAGS.CUSTOMERS] },
);

export const getCachedBusinessTypes = unstable_cache(
  () => businessTypeService.list({ sort_by: "name", order: "asc" }),
  ["business-types-list"],
  { revalidate: CACHE_TTL.LOOKUP, tags: [CACHE_TAGS.BUSINESS_TYPES] },
);

export const getCachedAnnouncements = unstable_cache(
  () =>
    announcementTextService.list({ sort_by: "display_order", order: "asc" }),
  ["announcements-list"],
  { revalidate: CACHE_TTL.LOOKUP, tags: [CACHE_TAGS.ANNOUNCEMENTS] },
);

export const getCachedArticleCategories = unstable_cache(
  () => articleCategoryService.list({ sort_by: "name", order: "asc" }),
  ["article-categories-list"],
  { revalidate: CACHE_TTL.LOOKUP, tags: [CACHE_TAGS.ARTICLE_CATEGORIES] },
);

export const getCachedArticleStatusTypes = unstable_cache(
  () => articleStatusTypeService.list(),
  ["article-status-types-list"],
  { revalidate: CACHE_TTL.LOOKUP, tags: [CACHE_TAGS.ARTICLE_CATEGORIES] },
);

// ---------------------------------------------------------------------------
// Tier 2 — Articles & carousels with details (2 min TTL)
// ---------------------------------------------------------------------------

export const getCachedArticlesWithDetails = unstable_cache(
  () => getArticlesWithDetails(),
  ["articles-with-details"],
  { revalidate: CACHE_TTL.MODEL, tags: [CACHE_TAGS.ARTICLES] },
);

export const getCachedCarouselsWithImages = unstable_cache(
  async () => {
    const carousels = await carouselService.list({
      sort_by: "created_at",
      order: "asc",
    });
    return Promise.all(
      carousels.map(async (c) => ({
        carousel: c,
        images: await getCarouselImages(c.carousel_id),
      })),
    );
  },
  ["carousels-with-images"],
  { revalidate: CACHE_TTL.MODEL, tags: [CACHE_TAGS.CAROUSELS] },
);

// ---------------------------------------------------------------------------
// Tier 2 — Listing detail queries (2 min TTL)
// ---------------------------------------------------------------------------

export const getCachedSaleListings = unstable_cache(
  () => getSaleListingsWithDetails(),
  ["sale-listings-with-details"],
  { revalidate: CACHE_TTL.MODEL, tags: [CACHE_TAGS.SALE_LISTINGS] },
);

export const getCachedRentListings = unstable_cache(
  () => getRentListingsWithDetails(),
  ["rent-listings-with-details"],
  { revalidate: CACHE_TTL.MODEL, tags: [CACHE_TAGS.RENT_LISTINGS] },
);

export const getCachedFeaturedListings = unstable_cache(
  () => getFeaturedListingsWithDetails(),
  ["featured-listings-with-details"],
  { revalidate: CACHE_TTL.MODEL, tags: [CACHE_TAGS.FEATURED_LISTINGS] },
);

// ---------------------------------------------------------------------------
// Cache warming — called via after() in dashboard layout
// ---------------------------------------------------------------------------

/**
 * Warm all server-side caches in parallel.
 * Safe to call repeatedly — returns cached data if within TTL (no D1 requests).
 * Uses allSettled so one failure doesn't block the rest.
 */
export async function warmCaches() {
  await Promise.allSettled([
    getCachedBrands(),
    getCachedLocations(),
    getCachedMainCategories(),
    getCachedSubCategories(),
    getCachedAttachmentCategories(),
    getCachedEquipmentModels(),
    getCachedAttachmentModels(),
    getCachedApprovedPartners(),
    getCachedPartnersWithDetails(),
    getCachedSaleListings(),
    getCachedRentListings(),
    getCachedFeaturedListings(),
    getCachedCustomers(),
    getCachedBusinessTypes(),
    getCachedAnnouncements(),
    getCachedArticleCategories(),
    getCachedArticleStatusTypes(),
    getCachedArticlesWithDetails(),
    getCachedCarouselsWithImages(),
  ]);
}
