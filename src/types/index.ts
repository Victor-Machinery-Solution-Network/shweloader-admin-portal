/**
 * Shared TypeScript types and interfaces
 */

// Re-export D1 types for convenience
export type {
  D1Response,
  D1Meta,
  D1QueryParams,
  D1RawQueryRequest,
} from "./d1";

// Re-export equipment types
export type { EquipmentMainCategory, EquipmentSubCategory } from "./equipment";

// Re-export attachment types
export type { AttachmentCategory } from "./attachment";

// Re-export location types
export type {
  StateRegion,
  District,
  Township,
  DistrictWithParent,
  TownshipWithParents,
} from "./location";

// Re-export user types
export type { AppUser, BusinessType } from "./app-user";

// Re-export partner types
export type {
  Partner,
  PartnerType,
  PartnerStatusType,
  PartnerWithDetails,
} from "./partner";

// Re-export listing types
export type {
  ProductList,
  ProductImage,
  SaleListing,
  RentListing,
  FeaturedListing,
  SaleListingWithDetails,
  RentListingWithDetails,
  FeaturedListingWithDetails,
  ApprovedPartner,
} from "./listing";

// Re-export brand types
export type {
  ProductBrand,
  ProductBrandWithCategories,
} from "./brand";

// Re-export article types
export type {
  ArticleCategory,
  Article,
  ArticleStatusType,
  ArticleWithDetails,
} from "./article";

// Re-export carousel types
export type { Carousel, CarouselImageWithDetails } from "./carousel";

// Re-export announcement types
export type { AnnouncementText } from "./announcement";

// Re-export promotion types
export type { PromotionPush } from "./promotion";

// Re-export role types
export type {
  Role,
  FeaturePermission,
  RoleWithPermissionCount,
} from "./role";

// Re-export admin types
export type { AdminUser, AdminWithRole } from "./admin";

// Re-export setting types
export type { AppSetting, SettingKey } from "./setting";
export { SETTING_KEYS } from "./setting";

// Re-export notification types
export type { Notification, NotificationType } from "./notification";
