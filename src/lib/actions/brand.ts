"use server";

import { brandService } from "@/lib/services/brand";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";

// ─── Attachment Category-Brand Link Helpers ─────────────────────────────────

/** Get the attachment category IDs linked to a brand */
async function getBrandCategoryIds(brandId: number): Promise<number[]> {
  const result = await d1.query<{ category_id: number }>(
    "SELECT category_id FROM attachment_category_brand WHERE brand_id = ? ORDER BY category_id",
    [brandId],
  );
  return result.results.map((r) => r.category_id);
}

/** Get category IDs for multiple brands at once */
export async function getBrandsCategoryIds(
  brandIds: number[],
): Promise<Record<number, number[]>> {
  if (brandIds.length === 0) return {};

  const placeholders = brandIds.map(() => "?").join(",");
  const result = await d1.query<{ brand_id: number; category_id: number }>(
    `SELECT brand_id, category_id FROM attachment_category_brand WHERE brand_id IN (${placeholders}) ORDER BY brand_id, category_id`,
    brandIds,
  );

  const map: Record<number, number[]> = {};
  for (const id of brandIds) {
    map[id] = [];
  }
  for (const row of result.results) {
    map[row.brand_id]?.push(row.category_id);
  }
  return map;
}

/** Sync attachment_category_brand junction table */
async function syncBrandCategories(
  brandId: number,
  categoryIds: number[],
  userId: number | null,
) {
  const existing = await getBrandCategoryIds(brandId);

  const toAdd = categoryIds.filter((id) => !existing.includes(id));
  const toRemove = existing.filter((id) => !categoryIds.includes(id));

  for (const categoryId of toAdd) {
    await d1.query(
      "INSERT INTO attachment_category_brand (category_id, brand_id, created_by) VALUES (?, ?, ?)",
      [categoryId, brandId, userId],
    );
  }

  if (toRemove.length > 0) {
    const placeholders = toRemove.map(() => "?").join(",");
    await d1.query(
      `DELETE FROM attachment_category_brand WHERE brand_id = ? AND category_id IN (${placeholders})`,
      [brandId, ...toRemove],
    );
  }
}

/** Get ALL attachment category ↔ brand links (for dependent filtering in forms) */
export async function getAllCategoryBrandLinks(): Promise<
  { category_id: number; brand_id: number }[]
> {
  const result = await d1.query<{ category_id: number; brand_id: number }>(
    "SELECT category_id, brand_id FROM attachment_category_brand",
  );
  return result.results;
}

// ─── Equipment Sub-Category-Brand Link Helpers ──────────────────────────────

/** Get ALL sub-category ↔ brand links (for dependent filtering in forms) */
export async function getAllSubCategoryBrandLinks(): Promise<
  { sub_category_id: number; brand_id: number }[]
> {
  const result = await d1.query<{ sub_category_id: number; brand_id: number }>(
    "SELECT sub_category_id, brand_id FROM equipment_sub_category_brand",
  );
  return result.results;
}

/** Get the equipment sub-category IDs linked to a brand */
async function getBrandSubCategoryIds(
  brandId: number,
): Promise<number[]> {
  const result = await d1.query<{ sub_category_id: number }>(
    "SELECT sub_category_id FROM equipment_sub_category_brand WHERE brand_id = ? ORDER BY sub_category_id",
    [brandId],
  );
  return result.results.map((r) => r.sub_category_id);
}

/** Get sub-category IDs for multiple brands at once */
export async function getBrandsSubCategoryIds(
  brandIds: number[],
): Promise<Record<number, number[]>> {
  if (brandIds.length === 0) return {};

  const placeholders = brandIds.map(() => "?").join(",");
  const result = await d1.query<{
    brand_id: number;
    sub_category_id: number;
  }>(
    `SELECT brand_id, sub_category_id FROM equipment_sub_category_brand WHERE brand_id IN (${placeholders}) ORDER BY brand_id, sub_category_id`,
    brandIds,
  );

  const map: Record<number, number[]> = {};
  for (const id of brandIds) {
    map[id] = [];
  }
  for (const row of result.results) {
    map[row.brand_id]?.push(row.sub_category_id);
  }
  return map;
}

/** Sync equipment_sub_category_brand junction table */
async function syncBrandSubCategories(
  brandId: number,
  subCategoryIds: number[],
  userId: number | null,
) {
  const existing = await getBrandSubCategoryIds(brandId);

  const toAdd = subCategoryIds.filter((id) => !existing.includes(id));
  const toRemove = existing.filter((id) => !subCategoryIds.includes(id));

  for (const subCategoryId of toAdd) {
    await d1.query(
      "INSERT INTO equipment_sub_category_brand (sub_category_id, brand_id, created_by) VALUES (?, ?, ?)",
      [subCategoryId, brandId, userId],
    );
  }

  if (toRemove.length > 0) {
    const placeholders = toRemove.map(() => "?").join(",");
    await d1.query(
      `DELETE FROM equipment_sub_category_brand WHERE brand_id = ? AND sub_category_id IN (${placeholders})`,
      [brandId, ...toRemove],
    );
  }
}

// ─── Brand Actions ───────────────────────────────────────────────────────────

export async function createBrand(formData: FormData) {
  const name = formData.get("name") as string;
  const categoryIdsRaw = formData.get("categoryIds") as string;
  const subCategoryIdsRaw = formData.get("subCategoryIds") as string;

  if (!name?.trim()) {
    return { success: false, error: "Brand name is required" };
  }

  try {
    const created_by = await requirePermission("brands", "create");
    await brandService.create({
      name: name.trim(),
      created_by,
    });

    // Fetch the newly created brand to get its ID
    const parsedCategoryIds = categoryIdsRaw
      ? (JSON.parse(categoryIdsRaw) as number[])
      : [];
    const parsedSubCategoryIds = subCategoryIdsRaw
      ? (JSON.parse(subCategoryIdsRaw) as number[])
      : [];

    if (parsedCategoryIds.length > 0 || parsedSubCategoryIds.length > 0) {
      const brandResult = await d1.query<{ brand_id: number }>(
        "SELECT brand_id FROM product_brand WHERE name = ?",
        [name.trim()],
      );
      const brandId = brandResult.results[0]?.brand_id;

      if (brandId) {
        // Sync attachment category links
        if (parsedCategoryIds.length > 0) {
          await syncBrandCategories(brandId, parsedCategoryIds, created_by);
        }

        // Sync equipment sub-category links
        if (parsedSubCategoryIds.length > 0) {
          await syncBrandSubCategories(
            brandId,
            parsedSubCategoryIds,
            created_by,
          );
        }
      }
    }

    invalidateTag(CACHE_TAGS.BRANDS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create brand"),
    };
  }
}

export async function updateBrand(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const categoryIdsRaw = formData.get("categoryIds") as string;
  const subCategoryIdsRaw = formData.get("subCategoryIds") as string;

  if (!name?.trim()) {
    return { success: false, error: "Brand name is required" };
  }

  try {
    const userId = await requirePermission("brands", "edit");
    await brandService.update(id, { name: name.trim() });

    // Sync attachment category links
    if (categoryIdsRaw) {
      const categoryIds = JSON.parse(categoryIdsRaw) as number[];
      await syncBrandCategories(id, categoryIds, userId);
    }

    // Sync equipment sub-category links
    if (subCategoryIdsRaw) {
      const subCategoryIds = JSON.parse(subCategoryIdsRaw) as number[];
      await syncBrandSubCategories(id, subCategoryIds, userId);
    }

    invalidateTag(CACHE_TAGS.BRANDS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update brand"),
    };
  }
}

export async function deleteBrand(id: number) {
  try {
    await requirePermission("brands", "delete");
    await brandService.delete(id);
    invalidateTag(CACHE_TAGS.BRANDS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete brand"),
    };
  }
}

// ─── Linked Count Helpers ────────────────────────────────────────────────────

export interface BrandLinkedCounts {
  equipmentModels: number;
  attachmentModels: number;
  total: number;
}

export async function getBrandLinkedCounts(
  brandIds: number[],
): Promise<Record<number, BrandLinkedCounts>> {
  if (brandIds.length === 0) return {};

  const placeholders = brandIds.map(() => "?").join(",");

  const [eqResults, atResults] = await Promise.all([
    d1.query<{ brand_id: number; count: number }>(
      `SELECT brand_id, COUNT(*) as count FROM equipment_model WHERE brand_id IN (${placeholders}) GROUP BY brand_id`,
      brandIds,
    ),
    d1.query<{ brand_id: number; count: number }>(
      `SELECT brand_id, COUNT(*) as count FROM attachment_model WHERE brand_id IN (${placeholders}) GROUP BY brand_id`,
      brandIds,
    ),
  ]);

  const eqMap = Object.fromEntries(
    eqResults.results.map((r) => [r.brand_id, r.count]),
  );
  const atMap = Object.fromEntries(
    atResults.results.map((r) => [r.brand_id, r.count]),
  );

  return Object.fromEntries(
    brandIds.map((id) => {
      const equipmentModels = eqMap[id] ?? 0;
      const attachmentModels = atMap[id] ?? 0;
      return [
        id,
        { equipmentModels, attachmentModels, total: equipmentModels + attachmentModels },
      ];
    }),
  );
}

export async function formatBrandLinkedSummary(
  c: BrandLinkedCounts,
): Promise<string> {
  const parts: string[] = [];
  if (c.equipmentModels > 0) {
    parts.push(
      `${c.equipmentModels} equipment ${c.equipmentModels === 1 ? "model" : "models"}`,
    );
  }
  if (c.attachmentModels > 0) {
    parts.push(
      `${c.attachmentModels} attachment ${c.attachmentModels === 1 ? "model" : "models"}`,
    );
  }
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

// ─── Consolidated Brands Page Query ─────────────────────────────────────────

interface BrandRow {
  brand_id: number;
  name: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  category_ids: string;
  sub_category_ids: string;
  equipment_model_count: number;
  attachment_model_count: number;
}

interface BrandsPageRaw {
  brands: string;
  attachment_categories: string;
  sub_categories: string;
  main_categories: string;
}

/** Fetch all data for the Brands page in a single D1 query */
export async function getBrandsPageData() {
  const { results } = await d1.query<BrandsPageRaw>(`
    SELECT
      (SELECT json_group_array(json_object(
        'brand_id', b.brand_id,
        'name', b.name,
        'created_by', b.created_by,
        'created_at', b.created_at,
        'updated_at', b.updated_at,
        'category_ids', COALESCE(
          (SELECT json_group_array(acb.category_id)
           FROM attachment_category_brand acb WHERE acb.brand_id = b.brand_id), '[]'),
        'sub_category_ids', COALESCE(
          (SELECT json_group_array(escb.sub_category_id)
           FROM equipment_sub_category_brand escb WHERE escb.brand_id = b.brand_id), '[]'),
        'equipment_model_count',
          (SELECT COUNT(*) FROM equipment_model em WHERE em.brand_id = b.brand_id),
        'attachment_model_count',
          (SELECT COUNT(*) FROM attachment_model am WHERE am.brand_id = b.brand_id)
      )) FROM (SELECT * FROM product_brand ORDER BY name) b
      ) AS brands,

      (SELECT json_group_array(json_object(
        'category_id', ac.category_id, 'name', ac.name,
        'image_url', ac.image_url, 'display_order', ac.display_order,
        'created_by', ac.created_by, 'created_at', ac.created_at
      )) FROM (SELECT * FROM attachment_category ORDER BY display_order) ac
      ) AS attachment_categories,

      (SELECT json_group_array(json_object(
        'sub_category_id', sc.sub_category_id, 'category_id', sc.category_id,
        'name', sc.name, 'image_url', sc.image_url,
        'display_order', sc.display_order, 'created_by', sc.created_by,
        'created_at', sc.created_at
      )) FROM (SELECT * FROM equipment_sub_category ORDER BY display_order) sc
      ) AS sub_categories,

      (SELECT json_group_array(json_object(
        'category_id', mc.category_id, 'name', mc.name,
        'image_url', mc.image_url, 'display_order', mc.display_order,
        'created_by', mc.created_by, 'created_at', mc.created_at
      )) FROM (SELECT * FROM equipment_main_category ORDER BY display_order) mc
      ) AS main_categories
  `);

  const raw = results[0];

  const brandRows: BrandRow[] = raw?.brands ? JSON.parse(raw.brands) : [];
  const brands = brandRows.map((b) => ({
    brand_id: b.brand_id,
    name: b.name,
    created_by: b.created_by,
    created_at: b.created_at,
    updated_at: b.updated_at,
    categoryIds: typeof b.category_ids === "string"
      ? (JSON.parse(b.category_ids) as number[])
      : b.category_ids,
    subCategoryIds: typeof b.sub_category_ids === "string"
      ? (JSON.parse(b.sub_category_ids) as number[])
      : b.sub_category_ids,
  }));

  const linkedInfo: Record<number, { total: number; summary: string }> = {};
  for (const b of brandRows) {
    const eq = b.equipment_model_count;
    const at = b.attachment_model_count;
    const total = eq + at;
    let summary = "";
    if (total > 0) {
      const parts: string[] = [];
      if (eq > 0) parts.push(`${eq} equipment ${eq === 1 ? "model" : "models"}`);
      if (at > 0) parts.push(`${at} attachment ${at === 1 ? "model" : "models"}`);
      summary = parts.length === 1 ? parts[0] : parts.join(" and ");
    }
    linkedInfo[b.brand_id] = { total, summary };
  }

  return {
    brands,
    categories: raw?.attachment_categories
      ? JSON.parse(raw.attachment_categories)
      : [],
    subCategories: raw?.sub_categories
      ? JSON.parse(raw.sub_categories)
      : [],
    mainCategories: raw?.main_categories
      ? JSON.parse(raw.main_categories)
      : [],
    linkedInfo,
  };
}

