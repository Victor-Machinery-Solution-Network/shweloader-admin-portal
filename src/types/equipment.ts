/** Matches the equipment_main_category table in D1 */
export interface EquipmentMainCategory {
  category_id: number;
  name: string;
  name_my: string | null;
  image_url: string | null;
  display_order: string;
  created_by: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Matches the equipment_sub_category table in D1 */
export interface EquipmentSubCategory {
  sub_category_id: number;
  category_id: number;
  name: string;
  name_my: string | null;
  image_url: string | null;
  display_order: string;
  created_by: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Matches the equipment_model table in D1 */
export interface EquipmentModel {
  model_id: number;
  name: string;
  brand_id: number | null;
  sub_category_id: number;
  pdf_url: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}
