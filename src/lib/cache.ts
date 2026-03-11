import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { brandService } from "@/lib/services/brand";
import {
  stateRegionService,
  districtService,
  townshipService,
} from "@/lib/services/location";
import {
  mainCategoryService,
  subCategoryService,
  equipmentModelService,
} from "@/lib/services/equipment";
import {
  attachmentCategoryService,
  attachmentModelService,
} from "@/lib/services/attachment";
import { businessTypeService } from "@/lib/services/app-user";
import { d1 } from "@/lib/api/d1-client";
import type { AppUser } from "@/types/app-user";
import type { BlacklistEntryWithDetails } from "@/types/blacklist";
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
  getSaleListingWithDetailsById,
  getRentListingWithDetailsById,
  getProductImages,
} from "@/lib/actions/listing";
import { getPartnersWithDetails as fetchPartnersWithDetails } from "@/lib/actions/partner";
import {
  getArticlesWithDetails as fetchArticlesWithDetails,
  getArticleById as fetchArticleById,
} from "@/lib/actions/article";
import { getAllCarouselImages } from "@/lib/actions/carousel";
import {
  getRolesWithPermissionCount,
  getAllFeaturePermissions,
  getAllRolePermissionMap,
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
import {
  getCustomFieldTemplates as fetchCustomFieldTemplates,
  getCustomFieldTemplateById as fetchCustomFieldTemplateById,
} from "@/lib/actions/custom-field-template";

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

export function getStateRegions() {
  return stateRegionService.list({ sort_by: "name", order: "asc" });
}

export function getDistricts() {
  return districtService.list({ sort_by: "name", order: "asc" });
}

export function getTownships() {
  return townshipService.list({ sort_by: "name", order: "asc" });
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

// Users, announcements, articles

export async function getUsers() {
  const result = await d1.query<AppUser>(
    `SELECT c.*,
      CASE WHEN p.id IS NOT NULL AND pst.status_name = 'Approved' THEN 1 ELSE 0 END AS is_approved_partner
    FROM app_user c
    LEFT JOIN partner p ON c.app_user_id = p.app_user_id
    LEFT JOIN partner_status_type pst ON p.status_id = pst.id
    WHERE c.deleted_at IS NULL
    ORDER BY c.created_at DESC`,
  );
  return result.results;
}

export async function getBlacklistEntries() {
  const result = await d1.query<BlacklistEntryWithDetails>(
    `SELECT b.*,
      u.username,
      a.username AS admin_username
    FROM blacklist b
    LEFT JOIN app_user u ON b.app_user_id = u.app_user_id
    LEFT JOIN admin_user a ON b.blacklisted_by = a.user_id
    ORDER BY b.created_at DESC`,
  );
  return result.results;
}

export function getBusinessTypes() {
  return businessTypeService.list({ sort_by: "name", order: "asc" });
}

export function getListedBusinessTypes() {
  return businessTypeService.list({ sort_by: "name", order: "asc", is_listed: 1 });
}

// ─── Consolidated Users Page Query ──────────────────────────────────────────

interface UsersPageRaw {
  users: string;
  business_types: string;
  listed_business_types: string;
  blacklist_entries: string;
}

/** Fetch all data for the Users page in a single D1 query */
export async function getUsersPageData() {
  const { results } = await d1.query<UsersPageRaw>(`
    SELECT
      (SELECT json_group_array(json_object(
        'app_user_id', t.app_user_id, 'username', t.username,
        'full_name', t.full_name, 'email', t.email,
        'password_hash', t.password_hash,
        'phone', t.phone, 'is_verified', t.is_verified,
        'company_name', t.company_name, 'office_address', t.office_address,
        'business_type_id', t.business_type_id,
        'created_at', t.created_at, 'deleted_at', t.deleted_at,
        'deleted_by', t.deleted_by,
        'is_approved_partner', t.is_approved_partner
      )) FROM (
        SELECT c.*,
          CASE WHEN p.id IS NOT NULL AND pst.status_name = 'Approved' THEN 1 ELSE 0 END AS is_approved_partner
        FROM app_user c
        LEFT JOIN partner p ON c.app_user_id = p.app_user_id
        LEFT JOIN partner_status_type pst ON p.status_id = pst.id
        WHERE c.deleted_at IS NULL
        ORDER BY c.created_at DESC
      ) t
      ) AS users,

      (SELECT json_group_array(json_object(
        'business_type_id', bt.business_type_id, 'name', bt.name,
        'is_listed', bt.is_listed, 'created_by', bt.created_by,
        'created_at', bt.created_at
      )) FROM (SELECT * FROM business_type WHERE deleted_at IS NULL ORDER BY name) bt
      ) AS business_types,

      (SELECT json_group_array(json_object(
        'business_type_id', bt.business_type_id, 'name', bt.name,
        'is_listed', bt.is_listed, 'created_by', bt.created_by,
        'created_at', bt.created_at
      )) FROM (SELECT * FROM business_type WHERE is_listed = 1 AND deleted_at IS NULL ORDER BY name) bt
      ) AS listed_business_types,

      (SELECT json_group_array(json_object(
        'blacklist_id', t.blacklist_id, 'app_user_id', t.app_user_id,
        'phone', t.phone, 'email', t.email,
        'company_name', t.company_name, 'reason', t.reason,
        'blacklisted_by', t.blacklisted_by, 'created_at', t.created_at,
        'username', t.username, 'admin_username', t.admin_username
      )) FROM (
        SELECT b.*,
          u.username,
          a.username AS admin_username
        FROM blacklist b
        LEFT JOIN app_user u ON b.app_user_id = u.app_user_id
        LEFT JOIN admin_user a ON b.blacklisted_by = a.user_id
        ORDER BY b.created_at DESC
      ) t
      ) AS blacklist_entries
  `);

  const raw = results[0];
  return {
    users: raw?.users ? JSON.parse(raw.users) : [],
    businessTypes: raw?.business_types ? JSON.parse(raw.business_types) : [],
    listedBusinessTypes: raw?.listed_business_types ? JSON.parse(raw.listed_business_types) : [],
    blacklistEntries: raw?.blacklist_entries ? JSON.parse(raw.blacklist_entries) : [],
  };
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

export function getArticleById(id: number) {
  return fetchArticleById(id);
}

export async function getCarouselsWithImages() {
  const carouselsPromise = carouselService.list({ sort_by: "created_at", order: "asc" });
  const imagesPromise = getAllCarouselImages();
  const [carousels, allImages] = await Promise.all([carouselsPromise, imagesPromise]);

  const imagesByCarousel = Map.groupBy(allImages, (img) => img.carousel_id);

  return carousels.map((c) => ({
    carousel: c,
    images: imagesByCarousel.get(c.carousel_id) ?? [],
  }));
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

export function getSaleListingById(id: number) {
  return getSaleListingWithDetailsById(id);
}

export function getRentListingById(id: number) {
  return getRentListingWithDetailsById(id);
}

export function getListingImages(productListId: number) {
  return getProductImages(productListId);
}

// Roles

export function getRoles() {
  return getRolesWithPermissionCount();
}

export function getFeaturePermissions() {
  return getAllFeaturePermissions();
}

export function getRolePermissionMap() {
  return getAllRolePermissionMap();
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

// Custom field templates

export function getCustomFieldTemplates() {
  return fetchCustomFieldTemplates();
}

export function getCustomFieldTemplateById(id: number) {
  return fetchCustomFieldTemplateById(id);
}

// Permissions (cached at function level — called from server actions)

import { getPermissionsForRole } from "@/lib/actions/permission";

export async function getCachedPermissionsForRole(
  roleId: number,
): Promise<string[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.PERMISSIONS);
  return getPermissionsForRole(roleId);
}
