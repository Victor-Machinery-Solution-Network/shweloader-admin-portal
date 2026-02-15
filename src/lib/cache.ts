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
import { conditionTypeService } from "@/lib/services/listing";
import { getAllSubCategoryBrandLinks, getAllCategoryBrandLinks } from "@/lib/actions/brand";
import {
  getApprovedPartners as fetchApprovedPartners,
  getSaleListingsWithDetails,
  getRentListingsWithDetails,
  getFeaturedListingsWithDetails,
} from "@/lib/actions/listing";
import { getPartnersWithDetails as fetchPartnersWithDetails } from "@/lib/actions/partner";
import { getArticlesWithDetails as fetchArticlesWithDetails } from "@/lib/actions/article";
import { getCarouselImages } from "@/lib/actions/carousel";
import {
  getRolesWithPermissionCount,
  getAllFeaturePermissions,
} from "@/lib/actions/role";
import {
  getAdminsWithRoles,
  getAssignableRoles,
} from "@/lib/actions/admin";
import { getAllSettings } from "@/lib/actions/setting";
import {
  getEnquiriesWithDetails,
  getEnquiryStatusTypes as fetchEnquiryStatusTypes,
} from "@/lib/actions/enquiry";

// ---------------------------------------------------------------------------
// Data-fetching layer — plain functions, no caching here.
// Caching is handled at the component level in each page.tsx
// via "use cache" + cacheLife + cacheTag.
// ---------------------------------------------------------------------------

// Lookup tables

export function getBrands() {
  return brandService.list({ sort_by: "name", order: "asc" });
}

export function getSubCategoryBrandLinks() {
  return getAllSubCategoryBrandLinks();
}

export function getCategoryBrandLinks() {
  return getAllCategoryBrandLinks();
}

export function getLocations() {
  return locationService.list({ sort_by: "city_name", order: "asc" });
}

export function getMainCategories() {
  return mainCategoryService.list({ sort_by: "display_order", order: "asc" });
}

export function getSubCategories() {
  return subCategoryService.list({ sort_by: "display_order", order: "asc" });
}

export function getAttachmentCategories() {
  return attachmentCategoryService.list({
    sort_by: "display_order",
    order: "asc",
  });
}

// Models & partners

export function getEquipmentModels() {
  return equipmentModelService.list({ sort_by: "name", order: "asc" });
}

export function getAttachmentModels() {
  return attachmentModelService.list({ sort_by: "name", order: "asc" });
}

export function getApprovedPartners() {
  return fetchApprovedPartners();
}

export function getPartnersWithDetails() {
  return fetchPartnersWithDetails();
}

// Customers, announcements, articles

export function getCustomers() {
  return customerService.list({ sort_by: "created_at", order: "desc" });
}

export function getBusinessTypes() {
  return businessTypeService.list({ sort_by: "name", order: "asc" });
}

export function getAnnouncements() {
  return announcementTextService.list({
    sort_by: "display_order",
    order: "asc",
  });
}

export function getArticleCategories() {
  return articleCategoryService.list({ sort_by: "name", order: "asc" });
}

export function getArticleStatusTypes() {
  return articleStatusTypeService.list();
}

// Articles & carousels with details

export function getArticlesWithDetails() {
  return fetchArticlesWithDetails();
}

export async function getCarouselsWithImages() {
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
}

export function getConditionTypes() {
  return conditionTypeService.list({ sort_by: "name", order: "asc" });
}

// Listing detail queries

export function getSaleListings() {
  return getSaleListingsWithDetails();
}

export function getRentListings() {
  return getRentListingsWithDetails();
}

export function getFeaturedListings() {
  return getFeaturedListingsWithDetails();
}

// Roles

export function getRoles() {
  return getRolesWithPermissionCount();
}

export function getFeaturePermissions() {
  return getAllFeaturePermissions();
}

// Admins

export function getAdmins() {
  return getAdminsWithRoles();
}

export function getRolesForAssignment() {
  return getAssignableRoles();
}

// Settings

export function getSettings() {
  return getAllSettings();
}

// Enquiries

export function getEnquiries() {
  return getEnquiriesWithDetails();
}

export function getEnquiryStatusTypes() {
  return fetchEnquiryStatusTypes();
}
