/** Matches the attachment_category table in D1 */
export interface AttachmentCategory {
  category_id: number;
  name: string;
  image_url: string | null;
  display_order: string;
  created_by: number | null;
  created_at: string;
}
