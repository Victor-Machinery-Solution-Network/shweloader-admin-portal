/** Matches the role table in D1 */
export interface Role {
  role_id: number;
  name: string;
  description: string | null;
  created_by: number | null;
  created_at: string;
}

/** JOIN result: feature_permission + feature + permission */
export interface FeaturePermission {
  feature_permission_id: number;
  feature_id: number;
  permission_id: number;
  feature_name: string;
  permission_name: string;
  group_name: string;
  feature_display_order: number;
  permission_display_order: number;
}

/** Role with aggregated permission count for list view */
export interface RoleWithPermissionCount extends Role {
  permission_count: number;
}
