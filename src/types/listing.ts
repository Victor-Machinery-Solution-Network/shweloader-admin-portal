/** Matches the product_list table in D1 */
export interface ProductList {
  id: number;
  partner_id: number;
  equipment_model_id: number | null;
  attachment_model_id: number | null;
  custom_fields: string | null;
  description: string | null;
  thumbnail_url: string | null;
  location_id: number | null;
  hide_partner: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** Matches the product_image table in D1 */
export interface ProductImage {
  image_id: number;
  product_list_id: number;
  url: string;
  display_order: string;
  uploaded_by: number | null;
  active: number;
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
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  approve_status_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
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
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  approve_status_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
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
  approve_status_id: number | null;
  rejection_reason: string | null;
  created_at: string;
  // Product info
  thumbnail_url: string | null;
  description: string | null;
  location_id: number | null;
  equipment_model_id: number | null;
  attachment_model_id: number | null;
  partner_id: number;
  hide_partner: number;
  custom_fields: string | null;
  // Joined names
  model_name: string | null;
  product_type: "equipment" | "attachment";
  partner_name: string | null;
  location_name: string | null;
  // Approval status
  approve_status_name: string | null;
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
  approve_status_id: number | null;
  rejection_reason: string | null;
  created_at: string;
  // Product info
  thumbnail_url: string | null;
  description: string | null;
  location_id: number | null;
  equipment_model_id: number | null;
  attachment_model_id: number | null;
  partner_id: number;
  hide_partner: number;
  custom_fields: string | null;
  // Joined names
  model_name: string | null;
  product_type: "equipment" | "attachment";
  partner_name: string | null;
  location_name: string | null;
  // Approval status
  approve_status_name: string | null;
  // Featured status
  featured_id: number | null;
}

/** Approval status type lookup */
export interface ApprovalStatusType {
  id: number;
  status_name: string;
}

/** JOIN view for featured listings tab */
export interface FeaturedListingWithDetails {
  id: number;
  sale_listing_id: number | null;
  rent_listing_id: number | null;
  display_order: string;
  listing_type: "sale" | "rent";
  model_name: string | null;
  partner_name: string | null;
  thumbnail_url: string | null;
}

/** Partner with approved status, used in listing form dropdowns */
export interface ApprovedPartner {
  id: number;
  customer_name: string;
  company_name: string | null;
}
