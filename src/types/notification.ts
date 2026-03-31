/** Notification types for real-time alerts */

export type NotificationType =
  | "article_submitted"
  | "article_approved"
  | "article_rework"
  | "listing_submitted"
  | "listing_approved"
  | "listing_rework"
  | "partner_submitted";

/** Matches the notification table in D1 */
export interface Notification {
  notification_id: number;
  recipient_id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  reference_type: string | null;
  reference_id: number | null;
  action_url: string | null;
  is_read: number; // 0 or 1
  created_at: string;
}
