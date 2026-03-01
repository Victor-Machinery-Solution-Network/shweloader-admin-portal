export interface StateRegion {
  state_region_id: number;
  name: string;
  type: "state" | "region" | "union_territory";
  created_by: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

export interface District {
  district_id: number;
  name: string;
  state_region_id: number;
  created_by: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

export interface Township {
  township_id: number;
  name: string;
  district_id: number;
  created_by: number | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: number | null;
}

/** Flattened view for display: district with parent state/region name */
export interface DistrictWithParent {
  district_id: number;
  name: string;
  state_region_id: number;
  state_region_name: string;
  created_at: string;
}

/** Flattened view for display: township with parent names */
export interface TownshipWithParents {
  township_id: number;
  name: string;
  district_id: number;
  district_name: string;
  state_region_id: number;
  state_region_name: string;
  state_region_type: string;
  created_at: string;
}
