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
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to create state/region") };
  }
}

export async function updateStateRegion(id: number, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as string;

  if (!name) return { success: false, error: "Name is required" };

  const validType = type as StateRegion["type"];

  try {
    await requirePermission("locations", "edit");
    await stateRegionService.update(id, { name, type: validType });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to update state/region") };
  }
}

export async function deleteStateRegion(id: number) {
  try {
    await requirePermission("locations", "delete");
    await stateRegionService.delete(id);
    invalidateTag(CACHE_TAGS.LOCATIONS);
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
    await requirePermission("locations", "edit");
    await districtService.update(id, { name, state_region_id });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to update district") };
  }
}

export async function deleteDistrict(id: number) {
  try {
    await requirePermission("locations", "delete");
    await districtService.delete(id);
    invalidateTag(CACHE_TAGS.LOCATIONS);
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
    await requirePermission("locations", "edit");
    await townshipService.update(id, { name, district_id });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to update township") };
  }
}

export async function deleteTownship(id: number) {
  try {
    await requirePermission("locations", "delete");
    await townshipService.delete(id);
    invalidateTag(CACHE_TAGS.LOCATIONS);
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
    ORDER BY sr.name, d.name`,
  );
  return result.results;
}

// ─── Linked Count Helpers ───────────────────────────────────────────────────
// Single query each, no parameters — avoids D1's SQL variable limit entirely.

export async function getDistrictCount(): Promise<Record<number, number>> {
  const result = await d1.query<{ state_region_id: number; count: number }>(
    `SELECT state_region_id, COUNT(*) as count FROM district GROUP BY state_region_id`,
  );
  return Object.fromEntries(result.results.map((r) => [r.state_region_id, r.count]));
}

export async function getTownshipCount(): Promise<Record<number, number>> {
  const result = await d1.query<{ district_id: number; count: number }>(
    `SELECT district_id, COUNT(*) as count FROM township GROUP BY district_id`,
  );
  return Object.fromEntries(result.results.map((r) => [r.district_id, r.count]));
}

export async function getListingCount(): Promise<Record<number, number>> {
  const result = await d1.query<{ township_id: number; count: number }>(
    `SELECT township_id, COUNT(*) as count FROM product_list WHERE township_id IS NOT NULL GROUP BY township_id`,
  );
  return Object.fromEntries(result.results.map((r) => [r.township_id, r.count]));
}

// ─── Bulk Delete ────────────────────────────────────────────────────────────

export async function deleteStateRegions(ids: number[]) {
  await requirePermission("locations", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map((id) => stateRegionService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete state/region ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.LOCATIONS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

export async function deleteDistricts(ids: number[]) {
  await requirePermission("locations", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map((id) => districtService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete district ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.LOCATIONS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

export async function deleteTownships(ids: number[]) {
  await requirePermission("locations", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map((id) => townshipService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete township ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.LOCATIONS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
