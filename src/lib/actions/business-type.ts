"use server";

import { businessTypeService } from "@/lib/services/app-user";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { CACHE_TAGS } from "@/lib/constants";
import { auditLog } from "@/lib/actions/audit";

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
    auditLog(created_by, "created business type | name=" + name.trim());
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
    const userId = await requirePermission("business_types", "edit");
    await businessTypeService.update(id, { name: name.trim() });
    invalidateTag(CACHE_TAGS.BUSINESS_TYPES);
    auditLog(userId, "updated business type | id=" + id);
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
    const deletedBy = await requirePermission("business_types", "delete");
    await businessTypeService.softDelete(id, deletedBy);
    saveTrashMetadata("business_type", id, deletedBy).catch(() => {});
    invalidateTag(CACHE_TAGS.BUSINESS_TYPES);
    auditLog(deletedBy, "deleted business type | id=" + id);
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
    `SELECT business_type_id, COUNT(*) as count FROM app_user WHERE business_type_id IN (${placeholders}) AND deleted_at IS NULL GROUP BY business_type_id`,
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
  const deletedBy = await requirePermission("business_types", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await businessTypeService.softDelete(id, deletedBy);
      saveTrashMetadata("business_type", id, deletedBy).catch(() => {});
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete business type ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.BUSINESS_TYPES);
  auditLog(deletedBy, "bulk deleted business types | count=" + deleted);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
