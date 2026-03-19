/** Matches the product_list table in D1 */
export interface ProductList {
  id: number;
  partner_id: number | null;
  equipment_model_id: number | null;
  attachment_model_id: number | null;
  custom_fields: string | null;
  description: string | null;
  thumbnail_url: string | null;
  focal_x: number;
  focal_y: number;
  township_id: number | null;
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
  custom_id: string | null;
  product_list_id: number;
  condition_type_id: number | null;
  mmk_price: number | null;
  usd_price: number | null;
  hide_price: number;
  is_hidden: number;
  is_sold_out: number;
  display_currency: string;
  use_system_rate: number;
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  approve_status_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Matches the rent_listing table in D1 */
export interface RentListing {
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
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  approve_status_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
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
  approve_status_id: number | null;
  rejection_reason: string | null;
  created_at: string;
  display_order: string;
  // Product info
  thumbnail_url: string | null;
  description: string | null;
  township_id: number | null;
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
  // Featured status
  featured_id: number | null;
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
  approve_status_id: number | null;
  rejection_reason: string | null;
  created_at: string;
  display_order: string;
  // Product info
  thumbnail_url: string | null;
  description: string | null;
  township_id: number | null;
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
  // Featured status
  featured_id: number | null;
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
