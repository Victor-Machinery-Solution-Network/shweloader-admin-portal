"use server";

import { equipmentModelService } from "@/lib/services/equipment";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { processFileField, deleteFile, cleanupOldFile } from "@/lib/actions/upload-helpers";

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
    await requirePermission("equipment_models", "edit");
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
    await requirePermission("equipment_models", "delete");
    const existing = await equipmentModelService.getById(id);
    await equipmentModelService.delete(id);
    await deleteFile(existing?.pdf_url);
    invalidateTag(CACHE_TAGS.EQUIPMENT_MODELS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete equipment model"),
    };
  }
}

export async function deleteEquipmentModels(ids: number[]) {
  await requirePermission("equipment_models", "delete");
  assertBulkLimit(ids);
  const existingRecords = await Promise.all(
    ids.map((id) => equipmentModelService.getById(id)),
  );

  const results = await Promise.allSettled(
    ids.map((id) => equipmentModelService.delete(id)),
  );

  const deletePromises = results.map((r, i) => {
    if (r.status === "fulfilled") {
      return deleteFile(existingRecords[i]?.pdf_url);
    }
  });
  await Promise.allSettled(deletePromises.filter(Boolean));

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete equipment model ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.EQUIPMENT_MODELS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
