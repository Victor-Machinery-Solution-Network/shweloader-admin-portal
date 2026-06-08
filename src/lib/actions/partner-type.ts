"use server";

import { partnerTypeService } from "@/lib/services/partner";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { auditLog } from "@/lib/actions/audit";

// ─── Partner Type Actions ────────────────────────────────────────────────────
// RBAC: partner-type management reuses the existing `partners` feature
// (Option B) — gated on partners:create / partners:edit / partners:delete.

function invalidatePartnerTypes() {
  // The Partner Types tab lives inside the Partners page cache block, and the
  // Add-Partner dialog also reads the type list — bust both tags.
  invalidateTag(CACHE_TAGS.PARTNER_TYPES);
  invalidateTag(CACHE_TAGS.PARTNERS);
}

export async function createPartnerType(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Partner type name is required" };
  }

  try {
    const userId = await requirePermission("partners", "create");
    await partnerTypeService.create({ name: name.trim() });
    invalidatePartnerTypes();
    auditLog(userId, "created partner type | name=" + name.trim());
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create partner type"),
    };
  }
}

export async function updatePartnerType(id: number, formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Partner type name is required" };
  }

  try {
    const userId = await requirePermission("partners", "edit");
    await partnerTypeService.update(id, { name: name.trim() });
    invalidatePartnerTypes();
    auditLog(userId, "updated partner type | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update partner type"),
    };
  }
}

export async function deletePartnerType(id: number) {
  try {
    const userId = await requirePermission("partners", "delete");
    await partnerTypeService.delete(id);
    invalidatePartnerTypes();
    auditLog(userId, "deleted partner type | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete partner type"),
    };
  }
}

// ─── Linked Count Helper ─────────────────────────────────────────────────────

/**
 * Count partners referencing each partner type. Used to warn before delete.
 * Counts ALL referencing rows (including soft-deleted) because the DB FK is
 * `ON DELETE RESTRICT` — a soft-deleted partner still blocks a hard delete.
 */
export async function getPartnerCountByType(
  partnerTypeIds: number[],
): Promise<Record<number, number>> {
  if (partnerTypeIds.length === 0) return {};

  const placeholders = partnerTypeIds.map(() => "?").join(",");
  const result = await d1.query<{ partner_type_id: number; count: number }>(
    `SELECT partner_type_id, COUNT(*) as count FROM partner WHERE partner_type_id IN (${placeholders}) GROUP BY partner_type_id`,
    partnerTypeIds,
  );

  const countMap = Object.fromEntries(
    result.results.map((r) => [r.partner_type_id, r.count]),
  );
  return Object.fromEntries(
    partnerTypeIds.map((id) => [id, countMap[id] ?? 0]),
  );
}

// ─── Bulk Delete ─────────────────────────────────────────────────────────────

export async function deletePartnerTypes(ids: number[]) {
  const userId = await requirePermission("partners", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map((id) => partnerTypeService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete partner type ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidatePartnerTypes();
  auditLog(userId, "bulk deleted partner types | count=" + deleted);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
