/**
 * Application-wide constants
 */

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
  ENQUIRIES: "/enquiries",

  // Users
  CUSTOMERS: "/customers",
  PARTNERS: "/partners",

  // Content
  ARTICLE_CATEGORIES: "/articles/categories",
  POSTS: "/articles/posts",
  CAROUSEL_IMAGES: "/carousel-images",
  ANNOUNCEMENT_BAR: "/announcement-bar",

  // Settings
  ADMINS: "/admins",
  ROLES_PERMISSIONS: "/roles-permissions",
  SETTINGS: "/settings",
} as const;

export const API_ROUTES = {
  USERS: "/api/users",
  PRODUCTS: "/api/products",
  ORDERS: "/api/orders",
} as const;

export const ITEMS_PER_PAGE = 20;

export const DATE_FORMAT = "MMM dd, yyyy";
export const DATETIME_FORMAT = "MMM dd, yyyy HH:mm";

// System exchange rate (USD to MMK)
export const SYSTEM_EXCHANGE_RATE = 3200;

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
  PARTNERS: "partners",
  SALE_LISTINGS: "sale-listings",
  RENT_LISTINGS: "rent-listings",
  FEATURED_LISTINGS: "featured-listings",
  CUSTOMERS: "customers",
  BUSINESS_TYPES: "business-types",
  ANNOUNCEMENTS: "announcements",
  ARTICLE_CATEGORIES: "article-categories",
  ARTICLES: "articles",
  CAROUSELS: "carousels",
} as const;
