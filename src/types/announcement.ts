/** Matches the announcement_text table in D1 */
export interface AnnouncementText {
  announcement_id: number;
  text: string | null;
  is_active: number;
  created_by: number | null;
  created_at: string;
  display_order: string;
}
