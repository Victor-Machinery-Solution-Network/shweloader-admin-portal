/** Matches the chat_session table in D1 */
export interface ChatSession {
  id: number;
  app_user_id: number;
  enquiry_id: number | null;
  status: "active" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  last_message_at: string;
  last_message_preview: string;
  unread_admin_count: number;
  unread_user_count: number;
}

/** Chat session with JOINed details for display */
export interface ChatSessionWithDetails extends ChatSession {
  user_name: string;
  user_email: string | null;
  user_phone: string;
  user_company: string | null;
  /** Enquiry-linked fields (null for general support sessions) */
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

/** Matches the chat_message table in D1 */
export interface ChatMessage {
  id: number;
  chat_session_id: number;
  sender_type: "user" | "admin";
  sender_id: number;
  message: string | null;
  created_at: string;
}

/** Chat message with sender name and attachments */
export interface ChatMessageWithDetails extends ChatMessage {
  sender_name: string;
  attachments: ChatAttachment[];
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
