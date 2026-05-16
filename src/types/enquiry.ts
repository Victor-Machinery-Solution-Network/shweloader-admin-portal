/** Matches the enquiry_status_type lookup table in D1 */
export interface EnquiryStatusType {
  id: number;
  status_name: "New" | "Contacted" | "Closed";
}

/** Matches the chat_enquiry table in D1 */
export interface ChatEnquiry {
  id: number;
  chat_session_id: number;
  sale_listing_id: number | null;
  rent_listing_id: number | null;
  status_id: number;
  close_outcome: "won" | "lost" | null;
  notes: string | null;
  first_message_id: number;
  enquired_at: string;
  created_at: string;
  updated_at: string;
  updated_by: number | null;
}

/**
 * Enquiry row with all JOINed fields for the report table.
 * Field names mirror the Excel column order so the export step is trivial.
 */
export interface EnquiryWithDetails {
  id: number;
  enquired_at: string;

  // User who inquired
  user_name: string | null;          // Account Name (app_user.full_name)
  user_username: string;             // User Name (app_user.username)
  user_phone: string;                // Contact Number
  user_email: string | null;
  user_location: string | null;      // "Township, District, State" composed string

  // Product / listing
  product_type: "sale" | "rent";
  product_code: string | null;       // listing custom_id
  product_list_id: number;
  listing_id: number;                // sale_listing.id or rent_listing.id
  brand_name: string | null;
  model_name: string | null;
  mmk_price: number | null;
  usd_price: number | null;
  display_currency: string | null;
  rental_unit: string | null;        // null for sale, e.g. 'per_day' for rent

  // Partner (listing owner)
  partner_name: string | null;       // Partner Account
  partner_username: string | null;   // Partner Username
  partner_id: number | null;
  app_user_id: number;               // inquiring user's id

  // Admin-side tracking
  status_id: number;
  status_name: "New" | "Contacted" | "Closed";
  close_outcome: "won" | "lost" | null;
  notes: string | null;
  chat_session_id: number;
}
