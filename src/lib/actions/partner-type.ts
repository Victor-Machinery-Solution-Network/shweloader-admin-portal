"use server";

import { partnerTypeService } from "@/lib/services/partner";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { saveTrashMetadata } from "@/lib/actions/trash";
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
  const name_my = (formData.get("name_my") as string)?.trim();

  if (!name?.trim()) {
    return { success: false, error: "Partner type name is required" };
  }
  if (!name_my) {
    return { success: false, error: "Burmese name is required" };
  }

  try {
    const userId = await requirePermission("partners", "create");
    await partnerTypeService.create({ name: name.trim(), name_my });
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
  const name_my = (formData.get("name_my") as string)?.trim();

  if (!name?.trim()) {
    return { success: false, error: "Partner type name is required" };
  }
  if (!name_my) {
    return { success: false, error: "Burmese name is required" };
  }

  try {
    const userId = await requirePermission("partners", "edit");
    await partnerTypeService.update(id, { name: name.trim(), name_my });
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
    const deletedBy = await requirePermission("partners", "delete");
    await partnerTypeService.softDelete(id, deletedBy);
    await saveTrashMetadata("partner_type", id, deletedBy);
    invalidatePartnerTypes();
    auditLog(deletedBy, "deleted partner type | id=" + id);
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
 * Count active partners referencing each partner type. Shown as an
 * informational warning before delete. Soft-delete itself is not FK-blocked
 * (it's an UPDATE, not a DELETE), but a type that's actively in use shouldn't
 * be removed from the picker without the admin knowing. (A later *permanent*
 * delete from Trash would hit the FK `ON DELETE RESTRICT` and be rejected.)
 */
export async function getPartnerCountByType(
  partnerTypeIds: number[],
): Promise<Record<number, number>> {
  if (partnerTypeIds.length === 0) return {};

  const placeholders = partnerTypeIds.map(() => "?").join(",");
  const result = await d1.query<{ partner_type_id: number; count: number }>(
    `SELECT partner_type_id, COUNT(*) as count FROM partner WHERE partner_type_id IN (${placeholders}) AND deleted_at IS NULL GROUP BY partner_type_id`,
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
  const deletedBy = await requirePermission("partners", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await partnerTypeService.softDelete(id, deletedBy);
      await saveTrashMetadata("partner_type", id, deletedBy);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete partner type ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidatePartnerTypes();
  auditLog(deletedBy, "bulk deleted partner types | count=" + deleted);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
