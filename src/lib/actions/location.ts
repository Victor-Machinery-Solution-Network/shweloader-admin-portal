"use server";

import {
  stateRegionService,
  districtService,
  townshipService,
} from "@/lib/services/location";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";
import type { StateRegion, DistrictWithParent, TownshipWithParents } from "@/types/location";

// ─── State/Region Actions ───────────────────────────────────────────────────

export async function createStateRegion(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as string;

  if (!name) return { success: false, error: "Name is required" };
  if (!["state", "region", "union_territory"].includes(type)) {
    return { success: false, error: "Invalid type" };
  }

  const validType = type as StateRegion["type"];

  try {
    const created_by = await requirePermission("locations", "create");
    await stateRegionService.create({ name, type: validType, created_by });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    auditLog(created_by, "created state/region | name=" + name);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to create state/region") };
  }
}

export async function updateStateRegion(id: number, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as string;

  if (!name) return { success: false, error: "Name is required" };
  // Mirror the allowlist used in createStateRegion — update was previously
  // missing this and would accept any string into the type column.
  if (!["state", "region", "union_territory"].includes(type)) {
    return { success: false, error: "Invalid type" };
  }

  const validType = type as StateRegion["type"];

  try {
    const userId = await requirePermission("locations", "edit");
    await stateRegionService.update(id, { name, type: validType });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    auditLog(userId, "updated state/region | id=" + id);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to update state/region") };
  }
}

export async function deleteStateRegion(id: number) {
  try {
    const deletedBy = await requirePermission("locations", "delete");
    await stateRegionService.softDelete(id, deletedBy);
    await saveTrashMetadata("state_region", id, deletedBy);
    invalidateTag(CACHE_TAGS.LOCATIONS);
    auditLog(deletedBy, "deleted state/region | id=" + id);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to delete state/region") };
  }
}

// ─── District Actions ───────────────────────────────────────────────────────

export async function createDistrict(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const state_region_id = Number(formData.get("state_region_id"));

  if (!name) return { success: false, error: "Name is required" };
  if (!state_region_id) return { success: false, error: "State/Region is required" };

  try {
    const created_by = await requirePermission("locations", "create");
    await districtService.create({ name, state_region_id, created_by });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    auditLog(created_by, "created district | name=" + name);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to create district") };
  }
}

export async function updateDistrict(id: number, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const state_region_id = Number(formData.get("state_region_id"));

  if (!name) return { success: false, error: "Name is required" };

  try {
    const userId = await requirePermission("locations", "edit");
    await districtService.update(id, { name, state_region_id });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    auditLog(userId, "updated district | id=" + id);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to update district") };
  }
}

export async function deleteDistrict(id: number) {
  try {
    const deletedBy = await requirePermission("locations", "delete");
    await districtService.softDelete(id, deletedBy);
    await saveTrashMetadata("district", id, deletedBy);
    invalidateTag(CACHE_TAGS.LOCATIONS);
    auditLog(deletedBy, "deleted district | id=" + id);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to delete district") };
  }
}

// ─── Township Actions ───────────────────────────────────────────────────────

export async function createTownship(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const district_id = Number(formData.get("district_id"));

  if (!name) return { success: false, error: "Name is required" };
  if (!district_id) return { success: false, error: "District is required" };

  try {
    const created_by = await requirePermission("locations", "create");
    await townshipService.create({ name, district_id, created_by });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    auditLog(created_by, "created township | name=" + name);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to create township") };
  }
}

export async function updateTownship(id: number, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const district_id = Number(formData.get("district_id"));

  if (!name) return { success: false, error: "Name is required" };

  try {
    const userId = await requirePermission("locations", "edit");
    await townshipService.update(id, { name, district_id });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    auditLog(userId, "updated township | id=" + id);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to update township") };
  }
}

export async function deleteTownship(id: number) {
  try {
    const deletedBy = await requirePermission("locations", "delete");
    await townshipService.softDelete(id, deletedBy);
    await saveTrashMetadata("township", id, deletedBy);
    invalidateTag(CACHE_TAGS.LOCATIONS);
    auditLog(deletedBy, "deleted township | id=" + id);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to delete township") };
  }
}

// ─── Township query with parent names (for locations page) ──────────────────

export async function getTownshipsWithParents(): Promise<TownshipWithParents[]> {
  const result = await d1.query<TownshipWithParents>(
    `SELECT
      t.township_id, t.name, t.district_id, t.created_at,
      d.name AS district_name,
      sr.state_region_id, sr.name AS state_region_name, sr.type AS state_region_type
    FROM township t
    JOIN district d ON t.district_id = d.district_id
    JOIN state_region sr ON d.state_region_id = sr.state_region_id
    WHERE t.deleted_at IS NULL AND d.deleted_at IS NULL AND sr.deleted_at IS NULL
    ORDER BY sr.name, d.name, t.name`,
  );
  return result.results;
}

// ─── District query with parent names (for locations page) ──────────────────

export async function getDistrictsWithParents(): Promise<DistrictWithParent[]> {
  const result = await d1.query<DistrictWithParent>(
    `SELECT
      d.district_id, d.name, d.state_region_id, d.created_at,
      sr.name AS state_region_name
    FROM district d
    JOIN state_region sr ON d.state_region_id = sr.state_region_id
    WHERE d.deleted_at IS NULL AND sr.deleted_at IS NULL
    ORDER BY sr.name, d.name`,
  );
  return result.results;
}

// ─── Linked Count Helpers ───────────────────────────────────────────────────
// Single query each, no parameters — avoids D1's SQL variable limit entirely.

export async function getDistrictCount(): Promise<Record<number, number>> {
  const result = await d1.query<{ state_region_id: number; count: number }>(
    `SELECT state_region_id, COUNT(*) as count FROM district WHERE deleted_at IS NULL GROUP BY state_region_id`,
  );
  return Object.fromEntries(result.results.map((r) => [r.state_region_id, r.count]));
}

export async function getTownshipCount(): Promise<Record<number, number>> {
  const result = await d1.query<{ district_id: number; count: number }>(
    `SELECT district_id, COUNT(*) as count FROM township WHERE deleted_at IS NULL GROUP BY district_id`,
  );
  return Object.fromEntries(result.results.map((r) => [r.district_id, r.count]));
}

export async function getListingCount(): Promise<Record<number, number>> {
  const result = await d1.query<{ township_id: number; count: number }>(
    `SELECT township_id, COUNT(*) as count FROM product_list WHERE township_id IS NOT NULL AND deleted_at IS NULL GROUP BY township_id`,
  );
  return Object.fromEntries(result.results.map((r) => [r.township_id, r.count]));
}

// ─── Consolidated Locations Page Query ───────────────────────────────────────

interface LocationsPageRaw {
  state_regions: string;
  districts: string;
  districts_with_parents: string;
  townships_with_parents: string;
  district_counts: string;
  township_counts: string;
  listing_counts: string;
}

/** Fetch all data for the Locations page in a single D1 query */
export async function getLocationsPageData() {
  const { results } = await d1.query<LocationsPageRaw>(`
    SELECT
      (SELECT json_group_array(json_object(
        'state_region_id', sr.state_region_id, 'name', sr.name,
        'type', sr.type, 'created_by', sr.created_by, 'created_at', sr.created_at,
        'deleted_at', null, 'deleted_by', null
      )) FROM (SELECT * FROM state_region WHERE deleted_at IS NULL ORDER BY name) sr
      ) AS state_regions,

      (SELECT json_group_array(json_object(
        'district_id', d.district_id, 'name', d.name,
        'state_region_id', d.state_region_id,
        'created_by', d.created_by, 'created_at', d.created_at,
        'deleted_at', null, 'deleted_by', null
      )) FROM (SELECT * FROM district WHERE deleted_at IS NULL ORDER BY name) d
      ) AS districts,

      (SELECT json_group_array(json_object(
        'district_id', d.district_id, 'name', d.name,
        'state_region_id', d.state_region_id,
        'state_region_name', sr.name, 'created_at', d.created_at
      )) FROM district d
      JOIN state_region sr ON d.state_region_id = sr.state_region_id
      WHERE d.deleted_at IS NULL AND sr.deleted_at IS NULL
      ORDER BY sr.name, d.name
      ) AS districts_with_parents,

      (SELECT json_group_array(json_object(
        'township_id', t.township_id, 'name', t.name,
        'district_id', t.district_id, 'district_name', d.name,
        'state_region_id', sr.state_region_id,
        'state_region_name', sr.name, 'state_region_type', sr.type,
        'created_at', t.created_at
      )) FROM township t
      JOIN district d ON t.district_id = d.district_id
      JOIN state_region sr ON d.state_region_id = sr.state_region_id
      WHERE t.deleted_at IS NULL AND d.deleted_at IS NULL AND sr.deleted_at IS NULL
      ORDER BY sr.name, d.name, t.name
      ) AS townships_with_parents,

      (SELECT json_group_array(json_object(
        'id', state_region_id, 'count', cnt
      )) FROM (SELECT state_region_id, COUNT(*) as cnt FROM district WHERE deleted_at IS NULL GROUP BY state_region_id)
      ) AS district_counts,

      (SELECT json_group_array(json_object(
        'id', district_id, 'count', cnt
      )) FROM (SELECT district_id, COUNT(*) as cnt FROM township WHERE deleted_at IS NULL GROUP BY district_id)
      ) AS township_counts,

      (SELECT json_group_array(json_object(
        'id', township_id, 'count', cnt
      )) FROM (SELECT township_id, COUNT(*) as cnt FROM product_list WHERE township_id IS NOT NULL AND deleted_at IS NULL GROUP BY township_id)
      ) AS listing_counts
  `);

  const raw = results[0];
  const parseCountMap = (json: string | null): Record<number, number> => {
    if (!json) return {};
    const arr: { id: number; count: number }[] = JSON.parse(json);
    return Object.fromEntries(arr.map((r) => [r.id, r.count]));
  };

  return {
    townships: raw?.townships_with_parents ? JSON.parse(raw.townships_with_parents) : [],
    stateRegions: raw?.state_regions ? JSON.parse(raw.state_regions) : [],
    districts: raw?.districts ? JSON.parse(raw.districts) : [],
    districtsWithParents: raw?.districts_with_parents ? JSON.parse(raw.districts_with_parents) : [],
    listingCounts: parseCountMap(raw?.listing_counts),
    districtCounts: parseCountMap(raw?.district_counts),
    townshipCounts: parseCountMap(raw?.township_counts),
  };
}

// ─── Bulk Delete ────────────────────────────────────────────────────────────

export async function deleteStateRegions(ids: number[]) {
  const deletedBy = await requirePermission("locations", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await stateRegionService.softDelete(id, deletedBy);
      await saveTrashMetadata("state_region", id, deletedBy);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete state/region ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.LOCATIONS);
  auditLog(deletedBy, "bulk deleted state/regions | count=" + deleted);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

export async function deleteDistricts(ids: number[]) {
  const deletedBy = await requirePermission("locations", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await districtService.softDelete(id, deletedBy);
      await saveTrashMetadata("district", id, deletedBy);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete district ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.LOCATIONS);
  auditLog(deletedBy, "bulk deleted districts | count=" + deleted);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

export async function deleteTownships(ids: number[]) {
  const deletedBy = await requirePermission("locations", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await townshipService.softDelete(id, deletedBy);
      await saveTrashMetadata("township", id, deletedBy);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete township ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.LOCATIONS);
  auditLog(deletedBy, "bulk deleted townships | count=" + deleted);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
