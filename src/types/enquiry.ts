/** Matches the enquiry table in D1 */
export interface Enquiry {
  id: number;
  sale_listing_id: number | null;
  rent_listing_id: number | null;
  app_user_id: number | null;
  message: string | null;
  enquiry_status_id: number | null;
  created_at: string;
  updated_at: string;
  updated_by: number | null;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Enquiry with JOINed details for display */
export interface EnquiryWithDetails extends Enquiry {
  status_name: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_company: string | null;
  /** Product model name from sale or rent listing */
  model_name: string | null;
  /** "sale" or "rent" */
  listing_type: string | null;
  /** Linked chat session (null if no reply thread yet) */
  session_id: number | null;
  /** Total messages in conversation thread */
  message_count: number;
  /** Timestamp of most recent reply in thread */
  last_reply_at: string | null;
  /** Product thumbnail from product_list */
  thumbnail_url: string | null;
}

/** Matches the enquiry_status_type table in D1 */
export interface EnquiryStatusType {
  id: number;
  status_name: string;
}
