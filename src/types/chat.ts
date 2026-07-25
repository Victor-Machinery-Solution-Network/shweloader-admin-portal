/** Matches the chat_session table in D1 */
export interface ChatSession {
  id: number;
  app_user_id: number;
  status: "pending" | "active" | "resolved";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  last_message_at: string;
  last_message_preview: string;
  unread_admin_count: number;
  unread_user_count: number;
  admin_last_read_at: string | null;
  user_last_read_at: string | null;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Chat session with JOINed details for display */
export interface ChatSessionWithDetails extends ChatSession {
  /** sender_type of the most recent message — drives the "You:" preview prefix
   *  in the session list. Null when the session has no messages. */
  last_message_sender_type: "user" | "admin" | "system" | null;
  user_name: string;
  user_username: string;
  user_email: string | null;
  user_phone: string;
  user_company: string | null;
  user_is_verified: number;
  user_business_type: string | null;
  user_joined: string;
  product_name: string | null;
  product_thumbnail: string | null;
  /** "sale" or "rent" — use with listing_id to build URL */
  listing_type: "sale" | "rent" | null;
  listing_id: number | null;
  brand_name: string | null;
  mmk_price: number | null;
  usd_price: number | null;
  display_currency: string | null;
  partner_name: string | null;
}

export interface ProductDiscussed {
  listingId: number;
  listingType: "sale" | "rent";
  productListId: number;
  customId: string | null;
  productName: string | null;
  productThumbnail: string | null;
  brandName: string | null;
  mmkPrice: number | null;
  usdPrice: number | null;
  displayCurrency: string | null;
}

/** Matches the chat_message table in D1 */
export interface ChatMessage {
  id: number;
  chat_session_id: number;
  sender_type: "user" | "admin" | "system";
  sender_id: number | null;
  message: string | null;
  sale_listing_id: number | null;
  rent_listing_id: number | null;
  created_at: string;
}

/** Chat message with sender name and attachments */
export interface ChatMessageWithDetails extends ChatMessage {
  sender_name: string;
  attachments: ChatAttachment[];
  product_name: string | null;
  product_thumbnail: string | null;
  listing_type: "sale" | "rent" | null;
  product_list_id: number | null;
  custom_id: string | null;
  brand_name: string | null;
  mmk_price: number | null;
  usd_price: number | null;
  display_currency: string | null;
  partner_name: string | null;
}

/** Matches the chat_attachment table in D1 */
export interface ChatAttachment {
  id: number;
  chat_message_id: number;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
}
