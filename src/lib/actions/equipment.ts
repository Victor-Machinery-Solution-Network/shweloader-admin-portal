"use server";

import {
  mainCategoryService,
  subCategoryService,
} from "@/lib/services/equipment";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { getNextDisplayOrder } from "@/lib/actions/reorder";
import { processFileField, deleteFile, cleanupOldFile } from "@/lib/actions/upload-helpers";

// ─── Main Category Actions ───────────────────────────────────────────────────

export async function createMainCategory(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    const image_url = await processFileField(
      formData, "image_url", "categories/equipments/main/", name.trim(),
    );
    const [created_by, display_order] = await Promise.all([
      requirePermission("equipment_main_categories", "create"),
      getNextDisplayOrder("equipment_main_category"),
    ]);
    await mainCategoryService.create({
      name: name.trim(),
      image_url,
      created_by,
      display_order,
    });
    invalidateTag(CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES);
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

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    await requirePermission("equipment_main_categories", "edit");
    const existing = await mainCategoryService.getById(id);
    const image_url = await processFileField(
      formData, "image_url", "categories/equipments/main/", name.trim(), existing?.image_url,
    );
    await mainCategoryService.update(id, { name: name.trim(), image_url });
    await cleanupOldFile(existing?.image_url, image_url);
    invalidateTag(CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES);
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
    await requirePermission("equipment_main_categories", "delete");
    const existing = await mainCategoryService.getById(id);
    await mainCategoryService.delete(id);
    await deleteFile(existing?.image_url);
    invalidateTag(CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete category"),
    };
  }
}

export async function deleteMainCategories(ids: number[]) {
  await requirePermission("equipment_main_categories", "delete");
  assertBulkLimit(ids);
  // Fetch existing records to get image URLs for R2 cleanup
  const existingRecords = await Promise.all(
    ids.map((id) => mainCategoryService.getById(id)),
  );

  const results = await Promise.allSettled(
    ids.map((id) => mainCategoryService.delete(id)),
  );

  // Clean up R2 files for successfully deleted records
  const deletePromises = results.map((r, i) => {
    if (r.status === "fulfilled") {
      return deleteFile(existingRecords[i]?.image_url);
    }
  });
  await Promise.allSettled(deletePromises.filter(Boolean));

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete category ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES);

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
  if (categoryIds.length === 0) return {};

  const placeholders = categoryIds.map(() => "?").join(",");
  const result = await d1.query<{ category_id: number; count: number }>(
    `SELECT category_id, COUNT(*) as count FROM equipment_sub_category WHERE category_id IN (${placeholders}) GROUP BY category_id`,
    categoryIds,
  );

  const countMap = Object.fromEntries(
    result.results.map((r) => [r.category_id, r.count]),
  );
  return Object.fromEntries(
    categoryIds.map((id) => [id, countMap[id] ?? 0]),
  );
}

// ─── Sub Category Actions ────────────────────────────────────────────────────

export async function createSubCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const category_id = Number(formData.get("category_id"));

  if (!name?.trim()) {
    return { success: false, error: "Sub category name is required" };
  }
  if (!category_id) {
    return { success: false, error: "Main category is required" };
  }

  try {
    const image_url = await processFileField(
      formData, "image_url", "categories/equipments/sub/", name.trim(),
    );
    const [created_by, display_order] = await Promise.all([
      requirePermission("equipment_sub_categories", "create"),
      getNextDisplayOrder("equipment_sub_category"),
    ]);
    await subCategoryService.create({
      name: name.trim(),
      category_id,
      image_url,
      created_by,
      display_order,
    });
    invalidateTag(CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES);
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

  if (!name?.trim()) {
    return { success: false, error: "Sub category name is required" };
  }
  if (!category_id) {
    return { success: false, error: "Main category is required" };
  }

  try {
    await requirePermission("equipment_sub_categories", "edit");
    const existing = await subCategoryService.getById(id);
    const image_url = await processFileField(
      formData, "image_url", "categories/equipments/sub/", name.trim(), existing?.image_url,
    );
    await subCategoryService.update(id, {
      name: name.trim(),
      category_id,
      image_url,
    });
    await cleanupOldFile(existing?.image_url, image_url);
    invalidateTag(CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES);
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
    await requirePermission("equipment_sub_categories", "delete");
    const existing = await subCategoryService.getById(id);
    await subCategoryService.delete(id);
    await deleteFile(existing?.image_url);
    invalidateTag(CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete sub category"),
    };
  }
}

export async function deleteSubCategories(ids: number[]) {
  await requirePermission("equipment_sub_categories", "delete");
  assertBulkLimit(ids);
  const existingRecords = await Promise.all(
    ids.map((id) => subCategoryService.getById(id)),
  );

  const results = await Promise.allSettled(
    ids.map((id) => subCategoryService.delete(id)),
  );

  const deletePromises = results.map((r, i) => {
    if (r.status === "fulfilled") {
      return deleteFile(existingRecords[i]?.image_url);
    }
  });
  await Promise.allSettled(deletePromises.filter(Boolean));

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete sub category ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES);

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
  if (subCategoryIds.length === 0) return {};

  const placeholders = subCategoryIds.map(() => "?").join(",");

  const [eqResults, brandResults] = await Promise.all([
    d1.query<{ sub_category_id: number; count: number }>(
      `SELECT sub_category_id, COUNT(*) as count FROM equipment_model WHERE sub_category_id IN (${placeholders}) GROUP BY sub_category_id`,
      subCategoryIds,
    ),
    d1.query<{ sub_category_id: number; count: number }>(
      `SELECT sub_category_id, COUNT(*) as count FROM equipment_sub_category_brand WHERE sub_category_id IN (${placeholders}) GROUP BY sub_category_id`,
      subCategoryIds,
    ),
  ]);

  const eqMap = Object.fromEntries(
    eqResults.results.map((r) => [r.sub_category_id, r.count]),
  );
  const brandMap = Object.fromEntries(
    brandResults.results.map((r) => [r.sub_category_id, r.count]),
  );

  return Object.fromEntries(
    subCategoryIds.map((id) => {
      const equipmentModels = eqMap[id] ?? 0;
      const brands = brandMap[id] ?? 0;
      return [id, { equipmentModels, brands, total: equipmentModels + brands }];
    }),
  );
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

