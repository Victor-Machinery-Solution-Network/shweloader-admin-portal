/**
 * Application-wide constants
 */

export const SUPER_ADMIN_ROLE_ID = 1;
export const PRIMARY_ADMIN_ID = 1;

export const APP_NAME = "Admin Portal";
export const APP_DESCRIPTION =
  "Admin portal for managing application resources";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",

  // Dashboard
  DASHBOARD: "/dashboard",
  DASHBOARD_OVERVIEW: "/dashboard/overview",
  DASHBOARD_ANALYTICS: "/dashboard/analytics",

  // Catalog Management - Equipment
  EQUIPMENT: "/equipment",
  EQUIPMENT_MAIN_CATEGORIES: "/equipment/main-categories",
  EQUIPMENT_SUB_CATEGORIES: "/equipment/sub-categories",
  EQUIPMENT_MODELS: "/equipment/models",

  // Catalog Management - Attachments
  ATTACHMENTS: "/attachments",
  ATTACHMENT_CATEGORIES: "/attachments/categories",
  ATTACHMENT_MODELS: "/attachments/models",

  // Catalog Management - Others
  BRANDS: "/brands",
  LOCATIONS: "/locations",

  // Marketplace
  LISTINGS: "/listings",
  LISTINGS_FOR_SALE: "/listings/for-sale",
  LISTINGS_FOR_RENT: "/listings/for-rent",
  LISTINGS_NEW: "/listings/new",
  LISTING_TEMPLATES: "/listing-templates",
  LISTING_TEMPLATES_NEW: "/listing-templates/new",
  CONDITION_TYPES: "/condition-types",
  CHAT: "/chat",
  ENQUIRIES: "/enquiries",

  // Users
  USERS: "/users",
  PARTNERS: "/partners",

  // Content
  ARTICLE_CATEGORIES: "/articles/categories",
  POSTS: "/articles/posts",
  CAROUSEL_IMAGES: "/carousel-images",
  ANNOUNCEMENT_BAR: "/announcement-bar",
  PROMOTIONS: "/promotions",
  POPUP_PROMOTIONS: "/popup-promotions",
  POPUP_PROMOTIONS_NEW: "/popup-promotions/new",

  // Settings
  ADMINS: "/admins",
  ROLES_PERMISSIONS: "/roles-permissions",
  SETTINGS: "/settings",
  ACTIVITY_LOGS: "/activity-logs",

  // Bulk Upload
  BULK_UPLOAD: "/bulk-upload",

  // Notifications
  NOTIFICATIONS: "/notifications",

  // Profile
  PROFILE: "/profile",
  APPEARANCE: "/appearance",

  // Trash
  TRASH: "/trash",
} as const;

export const ITEMS_PER_PAGE = 20;

// System exchange rate (USD to MMK)
export const SYSTEM_EXCHANGE_RATE = 3200;

/** SessionStorage keys shared across components */
export const SESSION_KEYS = {
  NEW_LISTING_DEFAULT: "newListingDefault",
  LISTING_AUTOSAVE: "listing-editor-autosave",
} as const;

// ---------------------------------------------------------------------------
// Cache configuration
// ---------------------------------------------------------------------------

/** Tag strings used by cacheTag (use cache) + updateTag for invalidation */
export const CACHE_TAGS = {
  BRANDS: "brands",
  LOCATIONS: "locations",
  EQUIPMENT_MAIN_CATEGORIES: "equipment-main-categories",
  EQUIPMENT_SUB_CATEGORIES: "equipment-sub-categories",
  EQUIPMENT_MODELS: "equipment-models",
  ATTACHMENT_CATEGORIES: "attachment-categories",
  ATTACHMENT_MODELS: "attachment-models",
  BLACKLIST: "blacklist",
  PARTNERS: "partners",
  SALE_LISTINGS: "sale-listings",
  RENT_LISTINGS: "rent-listings",
  FEATURED_LISTINGS: "featured-listings",
  USERS: "users",
  BUSINESS_TYPES: "business-types",
  ANNOUNCEMENTS: "announcements",
  PROMOTION_PUSHES: "promotion-pushes",
  ARTICLE_CATEGORIES: "article-categories",
  ARTICLES: "articles",
  CAROUSELS: "carousels",
  CONDITION_TYPES: "condition-types",
  ROLES: "roles",
  ADMINS: "admins",
  SETTINGS: "settings",
  CHAT_SESSIONS: "chat-sessions",
  ENQUIRIES: "enquiries",
  ENQUIRY_STATUS_TYPES: "enquiry-status-types",
  FEATURE_PERMISSIONS: "feature-permissions",
  CUSTOM_FIELD_TEMPLATES: "custom-field-templates",
  PERMISSIONS: "permissions",
  NOTIFICATIONS: "notifications",
  TRASH: "trash",
  ACTIVITY_LOGS: "activity-logs",
} as const;
