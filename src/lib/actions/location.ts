"use server";

import { revalidatePath } from "next/cache";
import { locationService } from "@/lib/services/location";
import { d1 } from "@/lib/api/d1-client";
import { ROUTES } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";

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
    revalidatePath(ROUTES.LOCATIONS);
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
    revalidatePath(ROUTES.LOCATIONS);
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
    revalidatePath(ROUTES.LOCATIONS);
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
  const counts: Record<number, number> = {};
  for (const id of locationIds) {
    const result = await d1.query<{ count: number }>(
      "SELECT COUNT(*) as count FROM product_list WHERE location_id = ?",
      [id],
    );
    counts[id] = result.results[0]?.count ?? 0;
  }
  return counts;
}

// ─── Bulk Delete ─────────────────────────────────────────────────────────────

export async function deleteLocations(ids: number[]) {
  const errors: string[] = [];
  let deleted = 0;

  for (const id of ids) {
    try {
      await locationService.delete(id);
      deleted++;
    } catch (error) {
      errors.push(getErrorMessage(error, `Failed to delete location ${id}`));
    }
  }

  revalidatePath(ROUTES.LOCATIONS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
