"use server";

import { revalidatePath } from "next/cache";
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
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete equipment model"),
    };
  }
}

export async function deleteEquipmentModels(ids: number[]) {
  const errors: string[] = [];
  let deleted = 0;

  for (const id of ids) {
    try {
      await equipmentModelService.delete(id);
      deleted++;
    } catch (error) {
      errors.push(
        getErrorMessage(error, `Failed to delete equipment model ${id}`),
      );
    }
  }

  revalidatePath(ROUTES.EQUIPMENT_MODELS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
