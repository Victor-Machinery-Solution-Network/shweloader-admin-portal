/** Matches the attachment_category table in D1 */
export interface AttachmentCategory {
  category_id: number;
  name: string;
  image_url: string | null;
  focal_x: number | null;
  focal_y: number | null;
  display_order: string;
  created_by: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Matches the attachment_model table in D1 */
export interface AttachmentModel {
  model_id: number;
  name: string;
  brand_id: number | null;
  category_id: number;
  pdf_url: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}
