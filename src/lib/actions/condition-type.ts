"use server";

import { conditionTypeService } from "@/lib/services/listing";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";

// ─── Condition Type Actions ──────────────────────────────────────────────────

export async function createConditionType(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Condition name is required" };
  }

  try {
    await requirePermission("condition_types", "create");
    await conditionTypeService.create({ name: name.trim() });
    invalidateTag(CACHE_TAGS.CONDITION_TYPES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create condition"),
    };
  }
}

export async function updateConditionType(id: number, formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Condition name is required" };
  }

  try {
    await requirePermission("condition_types", "edit");
    await conditionTypeService.update(id, { name: name.trim() });
    invalidateTag(CACHE_TAGS.CONDITION_TYPES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update condition"),
    };
  }
}

export async function deleteConditionType(id: number) {
  try {
    await requirePermission("condition_types", "delete");
    await conditionTypeService.delete(id);
    invalidateTag(CACHE_TAGS.CONDITION_TYPES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete condition"),
    };
  }
}

// ─── Linked Count Helpers ────────────────────────────────────────────────────

export async function getListingCountByCondition(
  conditionTypeIds: number[],
): Promise<Record<number, number>> {
  if (conditionTypeIds.length === 0) return {};

  const placeholders = conditionTypeIds.map(() => "?").join(",");
  const result = await d1.query<{ condition_type_id: number; count: number }>(
    `SELECT condition_type_id, COUNT(*) as count FROM sale_listing WHERE condition_type_id IN (${placeholders}) GROUP BY condition_type_id`,
    conditionTypeIds,
  );

  const countMap = Object.fromEntries(
    result.results.map((r) => [r.condition_type_id, r.count]),
  );
  return Object.fromEntries(
    conditionTypeIds.map((id) => [id, countMap[id] ?? 0]),
  );
}

// ─── Bulk Delete ─────────────────────────────────────────────────────────────

export async function deleteConditionTypes(ids: number[]) {
  await requirePermission("condition_types", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map((id) => conditionTypeService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete condition ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.CONDITION_TYPES);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
