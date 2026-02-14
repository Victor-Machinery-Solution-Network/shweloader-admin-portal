"use server";

import { locationService } from "@/lib/services/location";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";

// ─── Location Actions ────────────────────────────────────────────────────────

export async function createLocation(formData: FormData) {
  const city_name = formData.get("city_name") as string;

  if (!city_name?.trim()) {
    return { success: false, error: "City name is required" };
  }

  try {
    const created_by = await getCurrentUserId();
    await locationService.create({
      city_name: city_name.trim(),
      created_by,
    });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create location"),
    };
  }
}

export async function updateLocation(id: number, formData: FormData) {
  const city_name = formData.get("city_name") as string;

  if (!city_name?.trim()) {
    return { success: false, error: "City name is required" };
  }

  try {
    await locationService.update(id, { city_name: city_name.trim() });
    invalidateTag(CACHE_TAGS.LOCATIONS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update location"),
    };
  }
}

export async function deleteLocation(id: number) {
  try {
    await locationService.delete(id);
    invalidateTag(CACHE_TAGS.LOCATIONS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete location"),
    };
  }
}

// ─── Linked Count Helpers ────────────────────────────────────────────────────

export async function getListingCount(
  locationIds: number[],
): Promise<Record<number, number>> {
  if (locationIds.length === 0) return {};

  const placeholders = locationIds.map(() => "?").join(",");
  const result = await d1.query<{ location_id: number; count: number }>(
    `SELECT location_id, COUNT(*) as count FROM product_list WHERE location_id IN (${placeholders}) GROUP BY location_id`,
    locationIds,
  );

  const countMap = Object.fromEntries(
    result.results.map((r) => [r.location_id, r.count]),
  );
  return Object.fromEntries(
    locationIds.map((id) => [id, countMap[id] ?? 0]),
  );
}

// ─── Bulk Delete ─────────────────────────────────────────────────────────────

export async function deleteLocations(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map((id) => locationService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete location ${ids[i]}`),
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
