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
import { processFileField, cleanupOldFile } from "@/lib/actions/upload-helpers";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";

// ─── Main Category Actions ───────────────────────────────────────────────────

export async function createMainCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const name_my = (formData.get("name_my") as string)?.trim();

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }
  if (!name_my) {
    return { success: false, error: "Burmese name is required" };
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
      name_my,
      image_url,
      created_by,
      display_order,
    });
    invalidateTag(CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES);
    auditLog(created_by, "created equipment main category | name=" + name.trim());
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
  const name_my = (formData.get("name_my") as string)?.trim();

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }
  if (!name_my) {
    return { success: false, error: "Burmese name is required" };
  }

  try {
    const userId = await requirePermission("equipment_main_categories", "edit");
    const existing = await mainCategoryService.getById(id);
    const image_url = await processFileField(
      formData, "image_url", "categories/equipments/main/", name.trim(), existing?.image_url,
    );
    await mainCategoryService.update(id, { name: name.trim(), name_my, image_url });
    await cleanupOldFile(existing?.image_url, image_url);
    invalidateTag(CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES);
    auditLog(userId, "updated equipment main category | id=" + id);
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
    const deletedBy = await requirePermission("equipment_main_categories", "delete");
    await mainCategoryService.softDelete(id, deletedBy);
    await saveTrashMetadata("equipment_main_category", id, deletedBy);
    invalidateTag(CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES);
    auditLog(deletedBy, "deleted equipment main category | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete category"),
    };
  }
}

export async function deleteMainCategories(ids: number[]) {
  const deletedBy = await requirePermission("equipment_main_categories", "delete");
  assertBulkLimit(ids);

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await mainCategoryService.softDelete(id, deletedBy);
      await saveTrashMetadata("equipment_main_category", id, deletedBy);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete category ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES);
  auditLog(deletedBy, "bulk deleted equipment main categories | count=" + deleted);

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
    `SELECT category_id, COUNT(*) as count FROM equipment_sub_category WHERE category_id IN (${placeholders}) AND deleted_at IS NULL GROUP BY category_id`,
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
  const name_my = (formData.get("name_my") as string)?.trim();
  const category_id = Number(formData.get("category_id"));

  if (!name?.trim()) {
    return { success: false, error: "Sub category name is required" };
  }
  if (!name_my) {
    return { success: false, error: "Burmese name is required" };
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
      name_my,
      category_id,
      image_url,
      created_by,
      display_order,
    });
    invalidateTag(CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES);
    auditLog(created_by, "created equipment sub category | name=" + name.trim());
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
  const name_my = (formData.get("name_my") as string)?.trim();
  const category_id = Number(formData.get("category_id"));

  if (!name?.trim()) {
    return { success: false, error: "Sub category name is required" };
  }
  if (!name_my) {
    return { success: false, error: "Burmese name is required" };
  }
  if (!category_id) {
    return { success: false, error: "Main category is required" };
  }

  try {
    const userId = await requirePermission("equipment_sub_categories", "edit");
    const existing = await subCategoryService.getById(id);
    const image_url = await processFileField(
      formData, "image_url", "categories/equipments/sub/", name.trim(), existing?.image_url,
    );
    await subCategoryService.update(id, {
      name: name.trim(),
      name_my,
      category_id,
      image_url,
    });
    await cleanupOldFile(existing?.image_url, image_url);
    invalidateTag(CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES);
    auditLog(userId, "updated equipment sub category | id=" + id);
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
    const deletedBy = await requirePermission("equipment_sub_categories", "delete");
    await subCategoryService.softDelete(id, deletedBy);
    await saveTrashMetadata("equipment_sub_category", id, deletedBy);
    invalidateTag(CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES);
    auditLog(deletedBy, "deleted equipment sub category | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete sub category"),
    };
  }
}

export async function deleteSubCategories(ids: number[]) {
  const deletedBy = await requirePermission("equipment_sub_categories", "delete");
  assertBulkLimit(ids);

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await subCategoryService.softDelete(id, deletedBy);
      await saveTrashMetadata("equipment_sub_category", id, deletedBy);
    }),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete sub category ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES);
  auditLog(deletedBy, "bulk deleted equipment sub categories | count=" + deleted);

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
      `SELECT sub_category_id, COUNT(*) as count FROM equipment_model WHERE sub_category_id IN (${placeholders}) AND deleted_at IS NULL GROUP BY sub_category_id`,
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

// ─── Consolidated Equipment Models Page Query ────────────────────────────────

interface EquipmentModelsPageRaw {
  models: string;
  main_categories: string;
  sub_categories: string;
  brands: string;
  sub_category_brand_links: string;
}

/** Fetch all data for the Equipment Models page in a single D1 query */
export async function getEquipmentModelsPageData() {
  const { results } = await d1.query<EquipmentModelsPageRaw>(`
    SELECT
      (SELECT json_group_array(json_object(
        'model_id', em.model_id, 'name', em.name,
        'brand_id', em.brand_id, 'sub_category_id', em.sub_category_id,
        'pdf_url', em.pdf_url, 'created_by', em.created_by,
        'created_at', em.created_at, 'updated_at', em.updated_at
      )) FROM (SELECT * FROM equipment_model WHERE deleted_at IS NULL ORDER BY created_at DESC) em
      ) AS models,

      (SELECT json_group_array(json_object(
        'category_id', mc.category_id, 'name', mc.name, 'name_my', mc.name_my,
        'image_url', mc.image_url, 'display_order', mc.display_order,
        'created_by', mc.created_by, 'created_at', mc.created_at
      )) FROM (SELECT * FROM equipment_main_category WHERE deleted_at IS NULL ORDER BY display_order) mc
      ) AS main_categories,

      (SELECT json_group_array(json_object(
        'sub_category_id', sc.sub_category_id, 'category_id', sc.category_id,
        'name', sc.name, 'name_my', sc.name_my, 'image_url', sc.image_url,
        'display_order', sc.display_order, 'created_by', sc.created_by,
        'created_at', sc.created_at
      )) FROM (SELECT * FROM equipment_sub_category WHERE deleted_at IS NULL ORDER BY display_order) sc
      ) AS sub_categories,

      -- Only brand_id + name are consumed on this page (dropdown, table name
      -- lookup, brand filter); skip the other columns to keep the payload small.
      (SELECT json_group_array(json_object(
        'brand_id', b.brand_id, 'name', b.name
      )) FROM (SELECT brand_id, name FROM product_brand WHERE deleted_at IS NULL ORDER BY name) b
      ) AS brands,

      (SELECT json_group_array(json_object(
        'sub_category_id', scb.sub_category_id, 'brand_id', scb.brand_id
      )) FROM equipment_sub_category_brand scb
      ) AS sub_category_brand_links
  `);

  const raw = results[0];
  return {
    models: raw?.models ? JSON.parse(raw.models) : [],
    mainCategories: raw?.main_categories ? JSON.parse(raw.main_categories) : [],
    subCategories: raw?.sub_categories ? JSON.parse(raw.sub_categories) : [],
    brands: raw?.brands ? JSON.parse(raw.brands) : [],
    subCategoryBrandLinks: raw?.sub_category_brand_links ? JSON.parse(raw.sub_category_brand_links) : [],
  };
}

// ─── Consolidated Equipment Sub Categories Page Query ────────────────────────

interface SubCategoryRow {
  sub_category_id: number;
  category_id: number;
  name: string;
  name_my: string | null;
  image_url: string | null;
  display_order: string;
  created_by: number | null;
  created_at: string;
  equipment_model_count: number;
  brand_count: number;
}

interface SubCategoriesPageRaw {
  sub_categories: string;
  main_categories: string;
}

/** Fetch all data for the Equipment Sub Categories page in a single D1 query */
export async function getSubCategoriesPageData() {
  const { results } = await d1.query<SubCategoriesPageRaw>(`
    SELECT
      (SELECT json_group_array(json_object(
        'sub_category_id', sc.sub_category_id, 'category_id', sc.category_id,
        'name', sc.name, 'name_my', sc.name_my, 'image_url', sc.image_url,
        'display_order', sc.display_order, 'created_by', sc.created_by,
        'created_at', sc.created_at,
        'equipment_model_count',
          (SELECT COUNT(*) FROM equipment_model em WHERE em.sub_category_id = sc.sub_category_id AND em.deleted_at IS NULL),
        'brand_count',
          (SELECT COUNT(*) FROM equipment_sub_category_brand escb WHERE escb.sub_category_id = sc.sub_category_id)
      )) FROM (SELECT * FROM equipment_sub_category WHERE deleted_at IS NULL ORDER BY display_order) sc
      ) AS sub_categories,

      (SELECT json_group_array(json_object(
        'category_id', mc.category_id, 'name', mc.name, 'name_my', mc.name_my,
        'image_url', mc.image_url, 'display_order', mc.display_order,
        'created_by', mc.created_by, 'created_at', mc.created_at
      )) FROM (SELECT * FROM equipment_main_category WHERE deleted_at IS NULL ORDER BY display_order) mc
      ) AS main_categories
  `);

  const raw = results[0];
  const scRows: SubCategoryRow[] = raw?.sub_categories ? JSON.parse(raw.sub_categories) : [];

  const subCategories = scRows.map((sc) => ({
    sub_category_id: sc.sub_category_id,
    category_id: sc.category_id,
    name: sc.name,
    name_my: sc.name_my,
    image_url: sc.image_url,
    display_order: sc.display_order,
    created_by: sc.created_by,
    created_at: sc.created_at,
    deleted_at: null as string | null,
    deleted_by: null as number | null,
  }));

  const linkedInfo: Record<number, { total: number; summary: string }> = {};
  for (const sc of scRows) {
    const eq = sc.equipment_model_count;
    const br = sc.brand_count;
    const total = eq + br;
    let summary = "";
    if (total > 0) {
      const parts: string[] = [];
      if (eq > 0) parts.push(`${eq} equipment ${eq === 1 ? "model" : "models"}`);
      if (br > 0) parts.push(`${br} ${br === 1 ? "brand" : "brands"}`);
      summary = parts.length === 1 ? parts[0] : parts.join(" and ");
    }
    linkedInfo[sc.sub_category_id] = { total, summary };
  }

  return {
    subCategories,
    categories: raw?.main_categories ? JSON.parse(raw.main_categories) : [],
    linkedInfo,
  };
}

