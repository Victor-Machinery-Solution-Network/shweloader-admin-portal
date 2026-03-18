"use server";

import { equipmentModelService } from "@/lib/services/equipment";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { processFileField, cleanupOldFile } from "@/lib/actions/upload-helpers";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";

// ─── Equipment Model Actions ────────────────────────────────────────────────

export async function createEquipmentModel(formData: FormData) {
  const name = formData.get("name") as string;
  const sub_category_id = Number(formData.get("sub_category_id"));
  const brand_id = formData.get("brand_id")
    ? Number(formData.get("brand_id"))
    : null;

  if (!name?.trim()) {
    return { success: false, error: "Model name is required" };
  }
  if (!sub_category_id) {
    return { success: false, error: "Sub category is required" };
  }

  try {
    const pdf_url = await processFileField(
      formData, "pdf_url", "pdfs/equipments/", name.trim(),
    );
    const created_by = await requirePermission("equipment_models", "create");
    await equipmentModelService.create({
      name: name.trim(),
      sub_category_id,
      brand_id,
      pdf_url,
      created_by,
    });
    invalidateTag(CACHE_TAGS.EQUIPMENT_MODELS);
    auditLog(created_by, "created equipment model | name=" + name.trim());
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create equipment model"),
    };
  }
}

export async function updateEquipmentModel(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const sub_category_id = Number(formData.get("sub_category_id"));
  const brand_id = formData.get("brand_id")
    ? Number(formData.get("brand_id"))
    : null;

  if (!name?.trim()) {
    return { success: false, error: "Model name is required" };
  }
  if (!sub_category_id) {
    return { success: false, error: "Sub category is required" };
  }

  try {
    const userId = await requirePermission("equipment_models", "edit");
    const existing = await equipmentModelService.getById(id);
    const pdf_url = await processFileField(
      formData, "pdf_url", "pdfs/equipments/", name.trim(), existing?.pdf_url,
    );
    await equipmentModelService.update(id, {
      name: name.trim(),
      sub_category_id,
      brand_id,
      pdf_url,
    });
    await cleanupOldFile(existing?.pdf_url, pdf_url);
    invalidateTag(CACHE_TAGS.EQUIPMENT_MODELS);
    auditLog(userId, "updated equipment model | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update equipment model"),
    };
  }
}

export async function deleteEquipmentModel(id: number) {
  try {
    const deletedBy = await requirePermission("equipment_models", "delete");
    await equipmentModelService.softDelete(id, deletedBy);
    saveTrashMetadata("equipment_model", id, deletedBy).catch(() => {});
    invalidateTag(CACHE_TAGS.EQUIPMENT_MODELS);
    auditLog(deletedBy, "deleted equipment model | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete equipment model"),
    };
  }
}

export async function deleteEquipmentModels(ids: number[]) {
  const deletedBy = await requirePermission("equipment_models", "delete");
  assertBulkLimit(ids);

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await equipmentModelService.softDelete(id, deletedBy);
      saveTrashMetadata("equipment_model", id, deletedBy).catch(() => {});
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete equipment model ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.EQUIPMENT_MODELS);
  auditLog(deletedBy, "bulk deleted equipment models | count=" + deleted);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
