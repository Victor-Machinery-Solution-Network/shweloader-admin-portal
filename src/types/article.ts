/** Matches the article_status_type lookup table in D1 */
export interface ArticleStatusType {
  id: number;
  status_name: string;
}

/** Matches the article_category table in D1 */
export interface ArticleCategory {
  category_id: number;
  name: string;
  created_by: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Matches the article table in D1 */
export interface Article {
  article_id: number;
  title: string;
  content: string | null;
  created_by: number | null;
  category_id: number | null;
  created_at: string;
  updated_at: string;
  article_status_type_id: number | null;
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  publish_date: string | null;
  author_name: string | null;
  cover_image_url: string | null;
  focal_x: number | null;
  focal_y: number | null;
  estimated_read_time: number | null;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Article with resolved display names for table rendering */
export interface ArticleWithDetails extends Article {
  category_name: string | null;
  status_name: string | null;
}
