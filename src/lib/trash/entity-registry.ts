import { CACHE_TAGS } from "@/lib/constants";
import type { TrashEntityType, TrashGroup } from "@/types/trash";

type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export interface EntityConfig {
  /** DB table name */
  table: string;
  /** Primary key column */
  primaryKey: string;
  /** Human-readable singular name */
  displayName: string;
  /** Cache tags to invalidate on restore/permanent-delete */
  cacheTags: CacheTag[];
  /** Columns that store R2 file keys (for cleanup on permanent delete) */
  fileColumns: string[];
  /** Trash page group for tab filtering */
  group: TrashGroup;
}

/**
 * Registry mapping every soft-deletable entity type to its config.
 * Used by trash actions, trash page, and purge cron.
 */
export const ENTITY_REGISTRY: Record<TrashEntityType, EntityConfig> = {
  brand: {
    table: "product_brand",
    primaryKey: "brand_id",
    displayName: "Brand",
    cacheTags: [CACHE_TAGS.BRANDS],
    fileColumns: [],
    group: "catalog",
  },
  equipment_main_category: {
    table: "equipment_main_category",
    primaryKey: "category_id",
    displayName: "Equipment Category",
    cacheTags: [CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES],
    fileColumns: ["image_url"],
    group: "catalog",
  },
  equipment_sub_category: {
    table: "equipment_sub_category",
    primaryKey: "sub_category_id",
    displayName: "Equipment Sub-Category",
    cacheTags: [CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES],
    fileColumns: ["image_url"],
    group: "catalog",
  },
  equipment_model: {
    table: "equipment_model",
    primaryKey: "model_id",
    displayName: "Equipment Model",
    cacheTags: [CACHE_TAGS.EQUIPMENT_MODELS],
    fileColumns: ["pdf_url"],
    group: "catalog",
  },
  attachment_category: {
    table: "attachment_category",
    primaryKey: "category_id",
    displayName: "Attachment Category",
    cacheTags: [CACHE_TAGS.ATTACHMENT_CATEGORIES],
    fileColumns: ["image_url"],
    group: "catalog",
  },
  attachment_model: {
    table: "attachment_model",
    primaryKey: "model_id",
    displayName: "Attachment Model",
    cacheTags: [CACHE_TAGS.ATTACHMENT_MODELS],
    fileColumns: ["pdf_url"],
    group: "catalog",
  },
  article: {
    table: "article",
    primaryKey: "article_id",
    displayName: "Article",
    cacheTags: [CACHE_TAGS.ARTICLES],
    fileColumns: ["cover_image_url"],
    group: "content",
  },
  article_category: {
    table: "article_category",
    primaryKey: "category_id",
    displayName: "Article Category",
    cacheTags: [CACHE_TAGS.ARTICLE_CATEGORIES],
    fileColumns: [],
    group: "content",
  },
  announcement: {
    table: "announcement_text",
    primaryKey: "announcement_id",
    displayName: "Announcement",
    cacheTags: [CACHE_TAGS.ANNOUNCEMENTS],
    fileColumns: [],
    group: "content",
  },
  state_region: {
    table: "state_region",
    primaryKey: "state_region_id",
    displayName: "State/Region",
    cacheTags: [CACHE_TAGS.LOCATIONS],
    fileColumns: [],
    group: "locations",
  },
  district: {
    table: "district",
    primaryKey: "district_id",
    displayName: "District",
    cacheTags: [CACHE_TAGS.LOCATIONS],
    fileColumns: [],
    group: "locations",
  },
  township: {
    table: "township",
    primaryKey: "township_id",
    displayName: "Township",
    cacheTags: [CACHE_TAGS.LOCATIONS],
    fileColumns: [],
    group: "locations",
  },
  custom_field_template: {
    table: "custom_field_template",
    primaryKey: "template_id",
    displayName: "Custom Field Template",
    cacheTags: [CACHE_TAGS.CUSTOM_FIELD_TEMPLATES],
    fileColumns: [],
    group: "system",
  },
  business_type: {
    table: "business_type",
    primaryKey: "business_type_id",
    displayName: "Business Type",
    cacheTags: [CACHE_TAGS.BUSINESS_TYPES],
    fileColumns: [],
    group: "system",
  },
  app_user: {
    table: "app_user",
    primaryKey: "app_user_id",
    displayName: "User",
    cacheTags: [CACHE_TAGS.USERS],
    fileColumns: [],
    group: "users",
  },
  admin_user: {
    table: "admin_user",
    primaryKey: "user_id",
    displayName: "Admin User",
    cacheTags: [CACHE_TAGS.ADMINS],
    fileColumns: [],
    group: "users",
  },
  role: {
    table: "role",
    primaryKey: "role_id",
    displayName: "Role",
    cacheTags: [CACHE_TAGS.ROLES],
    fileColumns: [],
    group: "system",
  },
  product_list: {
    table: "product_list",
    primaryKey: "id",
    displayName: "Product List",
    cacheTags: [CACHE_TAGS.SALE_LISTINGS, CACHE_TAGS.RENT_LISTINGS],
    fileColumns: ["thumbnail_url"],
    group: "listings",
  },
  sale_listing: {
    table: "sale_listing",
    primaryKey: "id",
    displayName: "Sale Listing",
    cacheTags: [CACHE_TAGS.SALE_LISTINGS, CACHE_TAGS.FEATURED_LISTINGS],
    fileColumns: [],
    group: "listings",
  },
  rent_listing: {
    table: "rent_listing",
    primaryKey: "id",
    displayName: "Rent Listing",
    cacheTags: [CACHE_TAGS.RENT_LISTINGS, CACHE_TAGS.FEATURED_LISTINGS],
    fileColumns: [],
    group: "listings",
  },
};

/** Display-name map for trash group tabs */
export const TRASH_GROUP_LABELS: Record<TrashGroup, string> = {
  all: "All",
  catalog: "Catalog",
  locations: "Locations",
  listings: "Listings",
  content: "Content",
  users: "Users",
  system: "System",
};

/**
 * Resolve a "name" column for a given entity type.
 * Used when recording trash metadata — we need a human-readable name.
 */
export function getNameColumn(entityType: TrashEntityType): string {
  switch (entityType) {
    case "article":
      return "title";
    case "announcement":
      return "text";
    case "app_user":
      return "username";
    case "admin_user":
      return "username";
    case "sale_listing":
    case "rent_listing":
      return "custom_id";
    case "product_list":
      return "description";
    default:
      return "name";
  }
}
