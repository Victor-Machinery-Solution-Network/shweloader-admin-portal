/** Matches the product_brand table in D1 */
export interface ProductBrand {
  brand_id: number;
  name: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** Matches the attachment_category_brand junction table in D1 */
export interface AttachmentCategoryBrand {
  id: number;
  category_id: number;
  brand_id: number;
  created_at: string;
  created_by: number | null;
}

/** Matches the equipment_sub_category_brand junction table in D1 */
export interface EquipmentSubCategoryBrand {
  id: number;
  sub_category_id: number;
  brand_id: number;
  created_at: string;
  created_by: number | null;
}

/** ProductBrand extended with its linked category & sub-category IDs */
export interface ProductBrandWithCategories extends ProductBrand {
  categoryIds: number[];
  subCategoryIds: number[];
}
