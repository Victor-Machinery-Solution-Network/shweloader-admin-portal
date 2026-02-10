"use server";

import { revalidatePath } from "next/cache";
import {
  mainCategoryService,
  subCategoryService,
} from "@/lib/services/equipment";
import { d1 } from "@/lib/api/d1-client";
import { ROUTES } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";

// ─── Main Category Actions ───────────────────────────────────────────────────

export async function createMainCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const image_url = (formData.get("image_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    const created_by = await getCurrentUserId();
    await mainCategoryService.create({
      name: name.trim(),
      image_url,
      created_by,
    });
    revalidatePath(ROUTES.EQUIPMENT_MAIN_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create category"),
    };
  }
}

export async function updateMainCategory(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const image_url = (formData.get("image_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    await mainCategoryService.update(id, { name: name.trim(), image_url });
    revalidatePath(ROUTES.EQUIPMENT_MAIN_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update category"),
    };
  }
}

export async function deleteMainCategory(id: number) {
  try {
    await mainCategoryService.delete(id);
    revalidatePath(ROUTES.EQUIPMENT_MAIN_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete category"),
    };
  }
}

export async function deleteMainCategories(ids: number[]) {
  const errors: string[] = [];
  let deleted = 0;

  for (const id of ids) {
    try {
      await mainCategoryService.delete(id);
      deleted++;
    } catch (error) {
      errors.push(getErrorMessage(error, `Failed to delete category ${id}`));
    }
  }

  revalidatePath(ROUTES.EQUIPMENT_MAIN_CATEGORIES);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

export async function getSubCategoryCount(
  categoryIds: number[],
): Promise<Record<number, number>> {
  const counts: Record<number, number> = {};
  for (const id of categoryIds) {
    counts[id] = await subCategoryService.count({ category_id: id });
  }
  return counts;
}

// ─── Sub Category Actions ────────────────────────────────────────────────────

export async function createSubCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const category_id = Number(formData.get("category_id"));
  const image_url = (formData.get("image_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Sub category name is required" };
  }
  if (!category_id) {
    return { success: false, error: "Main category is required" };
  }

  try {
    const created_by = await getCurrentUserId();
    await subCategoryService.create({
      name: name.trim(),
      category_id,
      image_url,
      created_by,
    });
    revalidatePath(ROUTES.EQUIPMENT_SUB_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create sub category"),
    };
  }
}

export async function updateSubCategory(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const category_id = Number(formData.get("category_id"));
  const image_url = (formData.get("image_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Sub category name is required" };
  }
  if (!category_id) {
    return { success: false, error: "Main category is required" };
  }

  try {
    await subCategoryService.update(id, {
      name: name.trim(),
      category_id,
      image_url,
    });
    revalidatePath(ROUTES.EQUIPMENT_SUB_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update sub category"),
    };
  }
}

export async function deleteSubCategory(id: number) {
  try {
    await subCategoryService.delete(id);
    revalidatePath(ROUTES.EQUIPMENT_SUB_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete sub category"),
    };
  }
}

export async function deleteSubCategories(ids: number[]) {
  const errors: string[] = [];
  let deleted = 0;

  for (const id of ids) {
    try {
      await subCategoryService.delete(id);
      deleted++;
    } catch (error) {
      errors.push(
        getErrorMessage(error, `Failed to delete sub category ${id}`),
      );
    }
  }

  revalidatePath(ROUTES.EQUIPMENT_SUB_CATEGORIES);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

// ─── Linked Count Helpers ─────────────────────────────────────────────────────

export interface SubCategoryLinkedCounts {
  equipmentModels: number;
  brands: number;
  total: number;
}

export async function getSubCategoryLinkedCounts(
  subCategoryIds: number[],
): Promise<Record<number, SubCategoryLinkedCounts>> {
  const counts: Record<number, SubCategoryLinkedCounts> = {};
  for (const id of subCategoryIds) {
    const [eqModels, brands] = await Promise.all([
      d1.query<{ count: number }>(
        "SELECT COUNT(*) as count FROM equipment_model WHERE sub_category_id = ?",
        [id],
      ),
      d1.query<{ count: number }>(
        "SELECT COUNT(*) as count FROM equipment_sub_category_brand WHERE sub_category_id = ?",
        [id],
      ),
    ]);

    const equipmentModels = eqModels.results[0]?.count ?? 0;
    const brandsCount = brands.results[0]?.count ?? 0;

    counts[id] = {
      equipmentModels,
      brands: brandsCount,
      total: equipmentModels + brandsCount,
    };
  }
  return counts;
}

export async function formatSubCategoryLinkedSummary(
  c: SubCategoryLinkedCounts,
): Promise<string> {
  const parts: string[] = [];
  if (c.equipmentModels > 0) {
    parts.push(
      `${c.equipmentModels} equipment ${c.equipmentModels === 1 ? "model" : "models"}`,
    );
  }
  if (c.brands > 0) {
    parts.push(`${c.brands} ${c.brands === 1 ? "brand" : "brands"}`);
  }
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

// ─── Reorder Actions ─────────────────────────────────────────────────────────

export async function reorderMainCategories(orderedIds: number[]) {
  try {
    const cases = orderedIds
      .map((id, i) => `WHEN ${id} THEN '${i + 1}'`)
      .join(" ");
    const idList = orderedIds.join(", ");
    await d1.query(
      `UPDATE equipment_main_category SET display_order = CASE category_id ${cases} END WHERE category_id IN (${idList})`,
    );
    revalidatePath(ROUTES.EQUIPMENT_MAIN_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reorder categories"),
    };
  }
}

export async function reorderSubCategories(orderedIds: number[]) {
  try {
    const cases = orderedIds
      .map((id, i) => `WHEN ${id} THEN '${i + 1}'`)
      .join(" ");
    const idList = orderedIds.join(", ");
    await d1.query(
      `UPDATE equipment_sub_category SET display_order = CASE sub_category_id ${cases} END WHERE sub_category_id IN (${idList})`,
    );
    revalidatePath(ROUTES.EQUIPMENT_SUB_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reorder sub categories"),
    };
  }
}
