/** All entity types that support soft-delete */
export type TrashEntityType =
  | "brand"
  | "equipment_main_category"
  | "equipment_sub_category"
  | "equipment_model"
  | "attachment_category"
  | "attachment_model"
  | "article"
  | "article_category"
  | "announcement"
  | "promotion_push"
  | "state_region"
  | "district"
  | "township"
  | "custom_field_template"
  | "business_type"
  | "app_user"
  | "admin_user"
  | "role"
  | "product_list"
  | "sale_listing"
  | "rent_listing";

/** Matches the trash_metadata table in D1 */
export interface TrashMetadata {
  id: number;
  entity_type: TrashEntityType;
  entity_id: number;
  entity_table: string;
  entity_name: string;
  /** JSON array of R2 keys to clean up on permanent delete */
  file_keys: string | null;
  /** JSON for junction table snapshots (for restore) */
  related_data: string | null;
  /** UUID for grouping cascading deletes (e.g. state → districts → townships) */
  batch_id: string | null;
  deleted_by: number;
  deleted_at: string;
  expires_at: string;
}

/** Trash item for display in the trash page */
export interface TrashItem {
  id: number;
  entity_type: TrashEntityType;
  entity_id: number;
  entity_name: string;
  deleted_at: string;
  expires_at: string;
  deleted_by_name: string | null;
  batch_id: string | null;
  /** Whether this item has R2 files that will be cleaned up on permanent delete */
  has_files: boolean;
}

/** Group labels for trash page tabs */
export type TrashGroup =
  | "all"
  | "catalog"
  | "locations"
  | "listings"
  | "content"
  | "users"
  | "system";

/** Counts per entity type for trash page summary */
export type TrashCounts = Partial<Record<TrashEntityType, number>>;
