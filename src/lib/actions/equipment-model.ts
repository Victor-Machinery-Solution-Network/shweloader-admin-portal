"use server";

import { revalidatePath, updateTag } from "next/cache";
import { equipmentModelService } from "@/lib/services/equipment";
import { ROUTES } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";

// ─── Equipment Model Actions ────────────────────────────────────────────────

export async function createEquipmentModel(formData: FormData) {
  const name = formData.get("name") as string;
  const sub_category_id = Number(formData.get("sub_category_id"));
  const brand_id = formData.get("brand_id")
    ? Number(formData.get("brand_id"))
    : null;
  const pdf_url = (formData.get("pdf_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Model name is required" };
  }
  if (!sub_category_id) {
    return { success: false, error: "Sub category is required" };
  }

  try {
    const created_by = await getCurrentUserId();
    await equipmentModelService.create({
      name: name.trim(),
      sub_category_id,
      brand_id,
      pdf_url,
      created_by,
    });
    revalidatePath(ROUTES.EQUIPMENT_MODELS);
    updateTag("equipment-models");
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
  const pdf_url = (formData.get("pdf_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Model name is required" };
  }
  if (!sub_category_id) {
    return { success: false, error: "Sub category is required" };
  }

  try {
    await equipmentModelService.update(id, {
      name: name.trim(),
      sub_category_id,
      brand_id,
      pdf_url,
    });
    revalidatePath(ROUTES.EQUIPMENT_MODELS);
    updateTag("equipment-models");
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
    await equipmentModelService.delete(id);
    revalidatePath(ROUTES.EQUIPMENT_MODELS);
    updateTag("equipment-models");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete equipment model"),
    };
  }
}

export async function deleteEquipmentModels(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map((id) => equipmentModelService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete equipment model ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  revalidatePath(ROUTES.EQUIPMENT_MODELS);
  updateTag("equipment-models");

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
