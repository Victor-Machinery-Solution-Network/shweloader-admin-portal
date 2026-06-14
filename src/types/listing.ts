/** Matches the product_list table in D1 */
export interface ProductList {
  id: number;
  custom_id_suffix: string | null;
  partner_id: number | null;
  equipment_model_id: number | null;
  attachment_model_id: number | null;
  custom_fields: string | null;
  description: string | null;
  thumbnail_url: string | null;
  thumbnail_sm_url: string | null;
  thumbnail_blurhash: string | null;
  focal_x: number;
  focal_y: number;
  township_id: number | null;
  address: string | null;
  hide_address: number;
  hide_state_region: number;
  hide_district: number;
  hide_township: number;
  hide_partner: number;
  is_draft: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Matches the product_image table in D1 */
export interface ProductImage {
  image_id: number;
  product_list_id: number;
  url: string;
  thumb_url: string | null;
  blurhash: string | null;
  display_order: string;
  uploaded_by: number | null;
  active: number;
  focal_x: number | null;
  focal_y: number | null;
  created_at: string;
}

/** Matches the condition_type lookup table in D1 */
export interface ConditionType {
  id: number;
  name: string;
}

/** Matches the sale_listing table in D1 */
export interface SaleListing {
  id: number;
  product_list_id: number;
  condition_type_id: number | null;
  mmk_price: number | null;
  usd_price: number | null;
  hide_price: number;
  is_hidden: number;
  is_sold_out: number;
  display_currency: string;
  use_system_rate: number;
  /** Per-listing USD→MMK rate, used when use_system_rate = 0. NULL when system rate is in effect. */
  rate_to_usd: number | null;
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  approve_status_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
  display_order: string;
}

export type RentalUnit = 'per_day' | 'per_month' | 'per_duty';

/** Matches the rent_listing table in D1 */
export interface RentListing {
  id: number;
  product_list_id: number;
  mmk_price: number | null;
  usd_price: number | null;
  hide_price: number;
  is_hidden: number;
  is_rented: number;
  display_currency: string;
  use_system_rate: number;
  /** Per-listing USD→MMK rate, used when use_system_rate = 0. NULL when system rate is in effect. */
  rate_to_usd: number | null;
  rental_unit: RentalUnit;
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  approve_status_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
  display_order: string;
}

/** Matches the featured_listing table in D1 */
export interface FeaturedListing {
  id: number;
  sale_listing_id: number | null;
  rent_listing_id: number | null;
  display_order: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** JOIN view for sale listings table display */
export interface SaleListingWithDetails {
  id: number;
  custom_id: string | null;
  product_list_id: number;
  condition_type_id: number | null;
  condition_name: string | null;
  mmk_price: number | null;
  usd_price: number | null;
  hide_price: number;
  is_hidden: number;
  is_sold_out: number;
  display_currency: string;
  use_system_rate: number;
  /** Per-listing USD→MMK rate, used when use_system_rate = 0. NULL when system rate is in effect. */
  rate_to_usd: number | null;
  approve_status_id: number | null;
  rejection_reason: string | null;
  created_at: string;
  display_order: string;
  // Product info
  thumbnail_url: string | null;
  description: string | null;
  township_id: number | null;
  address: string | null;
  hide_address: number;
  hide_state_region: number;
  hide_district: number;
  hide_township: number;
  equipment_model_id: number | null;
  attachment_model_id: number | null;
  partner_id: number;
  hide_partner: number;
  custom_fields: string | null;
  // Joined names
  model_name: string | null;
  product_type: "equipment" | "attachment";
  partner_name: string | null;
  township_name: string | null;
  // Partner details (prefetched)
  partner_email: string | null;
  partner_phone: string | null;
  partner_company: string | null;
  partner_address: string | null;
  partner_verified: number | null;
  partner_joined: string | null;
  partner_business_type: string | null;
  partner_type_name: string | null;
  partner_status: string | null;
  partner_applied_at: string | null;
  partner_reviewed_at: string | null;
  partner_app_user_id: number | null;
  // Approval status
  approve_status_name: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  // Featured status
  featured_id: number | null;
  // Joined product taxonomy (drives the category filters)
  main_category_name: string | null;
  sub_category_name: string | null;
  attachment_category_name: string | null;
}

/** JOIN view for rent listings table display */
export interface RentListingWithDetails {
  id: number;
  custom_id: string | null;
  product_list_id: number;
  mmk_price: number | null;
  usd_price: number | null;
  hide_price: number;
  is_hidden: number;
  is_rented: number;
  display_currency: string;
  use_system_rate: number;
  /** Per-listing USD→MMK rate, used when use_system_rate = 0. NULL when system rate is in effect. */
  rate_to_usd: number | null;
  rental_unit: RentalUnit;
  approve_status_id: number | null;
  rejection_reason: string | null;
  created_at: string;
  display_order: string;
  // Product info
  thumbnail_url: string | null;
  description: string | null;
  township_id: number | null;
  address: string | null;
  hide_address: number;
  hide_state_region: number;
  hide_district: number;
  hide_township: number;
  equipment_model_id: number | null;
  attachment_model_id: number | null;
  partner_id: number;
  hide_partner: number;
  custom_fields: string | null;
  // Joined names
  model_name: string | null;
  product_type: "equipment" | "attachment";
  partner_name: string | null;
  township_name: string | null;
  // Partner details (prefetched)
  partner_email: string | null;
  partner_phone: string | null;
  partner_company: string | null;
  partner_address: string | null;
  partner_verified: number | null;
  partner_joined: string | null;
  partner_business_type: string | null;
  partner_type_name: string | null;
  partner_status: string | null;
  partner_applied_at: string | null;
  partner_reviewed_at: string | null;
  partner_app_user_id: number | null;
  // Approval status
  approve_status_name: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  // Featured status
  featured_id: number | null;
  // Joined product taxonomy (drives the category filters)
  main_category_name: string | null;
  sub_category_name: string | null;
  attachment_category_name: string | null;
}

/** Raw row from featured listings query (before merging) */
export interface FeaturedListingRow {
  id: number;
  sale_listing_id: number | null;
  rent_listing_id: number | null;
  display_order: string;
  listing_type: "sale" | "rent";
  product_list_id: number;
  custom_id: string | null;
  model_name: string | null;
  product_type: "equipment" | "attachment";
  partner_name: string | null;
  thumbnail_url: string | null;
  approved_at: string | null;
}

/** Merged view for featured listings tab (one row per product) */
export interface FeaturedListingWithDetails {
  /** Primary featured_listing id (sale row preferred, used for drag-sort) */
  id: number;
  /** All featured_listing ids for this product (for removal) */
  featured_ids: number[];
  sale_listing_id: number | null;
  rent_listing_id: number | null;
  display_order: string;
  /** Can be both when product is featured as sale AND rent */
  listing_types: ("sale" | "rent")[];
  product_list_id: number;
  custom_id: string | null;
  model_name: string | null;
  product_type: "equipment" | "attachment";
  partner_name: string | null;
  thumbnail_url: string | null;
  approved_at: string | null;
}

/** Partner with approved status, used in listing form dropdowns */
export interface ApprovedPartner {
  id: number;
  user_name: string;
  company_name: string | null;
}

/** Draft product_list with JOINed names (for Drafts tab and edit page) */
export interface DraftListingWithDetails {
  id: number;
  equipment_model_id: number | null;
  attachment_model_id: number | null;
  partner_id: number | null;
  township_id: number | null;
  address: string | null;
  hide_address: number;
  hide_state_region: number;
  hide_district: number;
  hide_township: number;
  description: string | null;
  thumbnail_url: string | null;
  hide_partner: number;
  custom_fields: string | null;
  model_name: string | null;
  product_type: "equipment" | "attachment" | null;
  partner_name: string | null;
  township_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Unified listing detail view (works for both sale and rent) */
export interface ListingDetail {
  listing_type: "sale" | "rent";
  id: number;
  custom_id: string | null;
  product_list_id: number;
  // Sale-only
  condition_type_id: number | null;
  condition_name: string | null;
  is_sold_out: number | null;
  // Rent-only
  is_rented: number | null;
  rental_unit: RentalUnit | null;
  // Shared pricing
  mmk_price: number | null;
  usd_price: number | null;
  hide_price: number;
  display_currency: string;
  use_system_rate: number;
  /** Per-listing USD→MMK rate, used when use_system_rate = 0. NULL when system rate is in effect. */
  rate_to_usd: number | null;
  is_hidden: number;
  // Product info
  thumbnail_url: string | null;
  description: string | null;
  township_id: number | null;
  address: string | null;
  hide_address: number;
  hide_state_region: number;
  hide_district: number;
  hide_township: number;
  equipment_model_id: number | null;
  attachment_model_id: number | null;
  partner_id: number;
  hide_partner: number;
  custom_fields: string | null;
  // Joined product details
  model_name: string | null;
  product_type: "equipment" | "attachment";
  brand_name: string | null;
  pdf_url: string | null;
  main_category_name: string | null;
  sub_category_name: string | null;
  attachment_category_name: string | null;
  // Location hierarchy
  township_name: string | null;
  district_name: string | null;
  state_region_name: string | null;
  // Partner details
  partner_name: string | null;
  partner_email: string | null;
  partner_phone: string | null;
  partner_company: string | null;
  partner_address: string | null;
  partner_verified: number | null;
  partner_joined: string | null;
  partner_business_type: string | null;
  partner_type_name: string | null;
  partner_status: string | null;
  // Approval
  approve_status_id: number | null;
  approve_status_name: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  created_by_name: string | null;
  // Featured
  featured_id: number | null;
  // Other listing (if product is listed as both sale and rent)
  other_listing_id: number | null;
  other_listing_type: "sale" | "rent" | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}
