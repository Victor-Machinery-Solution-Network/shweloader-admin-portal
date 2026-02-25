"use server";

import { businessTypeService } from "@/lib/services/app-user";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";

// ─── Business Type Actions ───────────────────────────────────────────────────

export async function createBusinessType(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Business type name is required" };
  }

  try {
    const created_by = await requirePermission("business_types", "create");
    await businessTypeService.create({
      name: name.trim(),
      is_listed: 1,
      created_by,
    });
    invalidateTag(CACHE_TAGS.BUSINESS_TYPES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create business type"),
    };
  }
}

export async function updateBusinessType(id: number, formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Business type name is required" };
  }

  try {
    await requirePermission("business_types", "edit");
    await businessTypeService.update(id, { name: name.trim() });
    invalidateTag(CACHE_TAGS.BUSINESS_TYPES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update business type"),
    };
  }
}

export async function deleteBusinessType(id: number) {
  try {
    await requirePermission("business_types", "delete");
    await businessTypeService.delete(id);
    invalidateTag(CACHE_TAGS.BUSINESS_TYPES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete business type"),
    };
  }
}

// ─── Linked Count Helpers ────────────────────────────────────────────────────

export async function getUserCount(
  businessTypeIds: number[],
): Promise<Record<number, number>> {
  if (businessTypeIds.length === 0) return {};

  const placeholders = businessTypeIds.map(() => "?").join(",");
  const result = await d1.query<{ business_type_id: number; count: number }>(
    `SELECT business_type_id, COUNT(*) as count FROM app_user WHERE business_type_id IN (${placeholders}) GROUP BY business_type_id`,
    businessTypeIds,
  );

  const countMap = Object.fromEntries(
    result.results.map((r) => [r.business_type_id, r.count]),
  );
  return Object.fromEntries(
    businessTypeIds.map((id) => [id, countMap[id] ?? 0]),
  );
}

// ─── Bulk Delete ─────────────────────────────────────────────────────────────

export async function deleteBusinessTypes(ids: number[]) {
  await requirePermission("business_types", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map((id) => businessTypeService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete business type ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.BUSINESS_TYPES);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
