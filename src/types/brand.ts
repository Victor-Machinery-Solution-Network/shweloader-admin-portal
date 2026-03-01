/** Matches the product_brand table in D1 */
export interface ProductBrand {
  brand_id: number;
  name: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** ProductBrand extended with its linked category & sub-category IDs */
export interface ProductBrandWithCategories extends ProductBrand {
  categoryIds: number[];
  subCategoryIds: number[];
}
