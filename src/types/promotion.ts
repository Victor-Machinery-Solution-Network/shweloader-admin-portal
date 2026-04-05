/** Matches the promotion_push table in D1 */
export interface PromotionPush {
  promotion_push_id: number;
  title: string;
  body: string;
  image_url: string | null;
  listing_id: number | null;
  device_count: number;
  created_by: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}
