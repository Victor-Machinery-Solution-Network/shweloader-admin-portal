/** Matches the attachment_category table in D1 */
export interface AttachmentCategory {
  category_id: number;
  name: string;
  image_url: string | null;
  display_order: string;
  created_by: number | null;
  created_at: string;
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
}
