/** Matches the equipment_main_category table in D1 */
export interface EquipmentMainCategory {
  category_id: number;
  name: string;
  image_url: string | null;
  display_order: string;
  created_by: number | null;
  created_at: string;
}

/** Matches the equipment_sub_category table in D1 */
export interface EquipmentSubCategory {
  sub_category_id: number;
  category_id: number;
  name: string;
  image_url: string | null;
  display_order: string;
  created_by: number | null;
  created_at: string;
}
