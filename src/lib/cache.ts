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
import { promotionPushService } from "@/lib/services/promotion";
import {
  articleCategoryService,
  articleStatusTypeService,
} from "@/lib/services/article";
import { carouselService } from "@/lib/services/carousel";
import { conditionTypeService } from "@/lib/services/listing";
import { getAllSubCategoryBrandLinks, getAllCategoryBrandLinks } from "@/lib/actions/brand";
import { getAllCategorySubCategoryLinks } from "@/lib/actions/attachment";
import {
  getApprovedPartners as fetchApprovedPartners,
  getSaleListingsWithDetails,
  getRentListingsWithDetails,
  getFeaturedListingsWithDetails,
  getSaleListingWithDetailsById,
  getRentListingWithDetailsById,
  getProductImages,
  getListingDetail as fetchListingDetail,
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
  getCustomFieldTemplates as fetchCustomFieldTemplates,
  getCustomFieldTemplateById as fetchCustomFieldTemplateById,
} from "@/lib/actions/custom-field-template";
import { getChatSessionsWithDetails as fetchChatSessions } from "@/lib/services/chat-queries";
import { getTotalUnreadCount as fetchTotalUnread } from "@/lib/actions/chat";
import {
  getEnquiriesWithDetails as fetchEnquiries,
  getEnquiryStatusTypes as fetchEnquiryStatusTypes,
} from "@/lib/actions/enquiry";
import { getFeedbackWithDetails as fetchFeedback } from "@/lib/actions/feedback";

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

export function getCategorySubCategoryLinks() {
  return getAllCategorySubCategoryLinks();
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

export async function getPartnerTypes(): Promise<{ id: number; name: string }[]> {
  const { results } = await d1.query<{ id: number; name: string }>(
    "SELECT id, name FROM partner_type WHERE deleted_at IS NULL ORDER BY name ASC",
  );
  return results;
}

/**
 * Recent users eligible to be promoted to partner (not already an approved
 * partner). Prefetched server-side so the "Add Partner" dialog shows its list
 * instantly; the dialog's search action handles narrowing beyond this set.
 */
export async function getPromotableUsers(): Promise<AppUser[]> {
  const { results } = await d1.query<AppUser>(
    `SELECT c.*, 0 AS is_approved_partner
     FROM app_user c
     WHERE c.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM partner p
         JOIN partner_status_type pst ON p.status_id = pst.id
         WHERE p.app_user_id = c.app_user_id AND pst.status_name = 'Approved'
       )
     ORDER BY c.created_at DESC
     LIMIT 20`,
  );
  return results;
}

// Users, announcements, articles

export async function getUsers() {
  const result = await d1.query<AppUser>(
    // Explicit columns (no password_hash — it must never leave the DB layer).
    `SELECT c.app_user_id, c.username, c.full_name, c.email, c.phone, c.is_verified,
       c.company_name, c.address, c.business_type_id, c.created_at, c.updated_at,
       c.deleted_at, c.deleted_by, c.last_login_at, c.township_id,
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
        'phone', t.phone, 'is_verified', t.is_verified,
        'company_name', t.company_name, 'address', t.address,
        'business_type_id', t.business_type_id,
        'township_id', t.township_id,
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

export function getPromotionPushes() {
  return promotionPushService.list({
    sort_by: "created_at",
    order: "desc",
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

export function getListingDetail(productListId: number) {
  return fetchListingDetail(productListId);
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

// Custom field templates

export function getCustomFieldTemplates() {
  return fetchCustomFieldTemplates();
}

export function getCustomFieldTemplateById(id: number) {
  return fetchCustomFieldTemplateById(id);
}

// Chat

export function getChatSessions() {
  return fetchChatSessions();
}

export function getChatUnreadCount() {
  return fetchTotalUnread();
}

// Enquiries

export function getEnquiries() {
  return fetchEnquiries();
}

export function getEnquiryStatusTypes() {
  return fetchEnquiryStatusTypes();
}

// Feedback

export async function getFeedback() {
  "use cache";
  cacheTag(CACHE_TAGS.FEEDBACK);
  return fetchFeedback();
}

// Permissions (cached at function level — called from server actions)

import { getPermissionsForRole } from "@/lib/actions/permission";
import { getActivityLogs as fetchActivityLogs } from "@/lib/actions/activity-log";

export async function getCachedPermissionsForRole(
  roleId: number,
): Promise<string[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.PERMISSIONS);
  return getPermissionsForRole(roleId);
}

// Activity Logs

export function getActivityLogsData() {
  return fetchActivityLogs();
}

// Popup Promotions

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
  screen: PopupTargetScreen | null;
  listing_ids: string | null;      // comma-joined via GROUP_CONCAT
}

function hydratePopup(row: PopupRow): PopupPromotion {
  return {
    popup_promotion_id: row.popup_promotion_id,
    name: row.name,
    active: row.active,
    image_id: row.image_id,
    image_url: row.image_url,
    image_thumb_url: row.image_thumb_url,
    cta_label: row.cta_label,
    target_screen: (row.screen ?? "home") as PopupTargetScreen,
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
       (SELECT GROUP_CONCAT(l.product_list_id) FROM (
          SELECT product_list_id FROM popup_promotion_listing
          WHERE popup_promotion_id = p.popup_promotion_id
          ORDER BY display_order, product_list_id
        ) l) AS listing_ids
     FROM popup_promotion p
     JOIN image i ON p.image_id = i.image_id
     WHERE p.deleted_at IS NULL
     ORDER BY p.created_at DESC`,
  );
  return results.map(hydratePopup);
}

export async function getPopupPromotion(
  id: number,
): Promise<PopupPromotion | null> {
  const { results } = await d1.query<PopupRow>(
    `SELECT
       p.*,
       i.image_url, i.thumb_url AS image_thumb_url,
       (SELECT GROUP_CONCAT(l.product_list_id) FROM (
          SELECT product_list_id FROM popup_promotion_listing
          WHERE popup_promotion_id = p.popup_promotion_id
          ORDER BY display_order, product_list_id
        ) l) AS listing_ids
     FROM popup_promotion p
     JOIN image i ON p.image_id = i.image_id
     WHERE p.popup_promotion_id = ? AND p.deleted_at IS NULL
     LIMIT 1`,
    [id],
  );
  return results.length > 0 ? hydratePopup(results[0]) : null;
}

// Listings options for the popup-promotion picker

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
     LEFT JOIN sale_listing sl
       ON sl.product_list_id = pl.id AND sl.deleted_at IS NULL
     LEFT JOIN rent_listing rl
       ON rl.product_list_id = pl.id AND rl.deleted_at IS NULL
     WHERE pl.deleted_at IS NULL
       AND pl.is_draft = 0
     ORDER BY pl.created_at DESC
     LIMIT 500`,
  );
  return results;
}
