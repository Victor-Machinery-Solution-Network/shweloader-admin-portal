"use server";

import { brandService } from "@/lib/services/brand";
import { d1 } from "@/lib/api/d1-client";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
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
    const created_by = await getCurrentUserId();
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
    await brandService.update(id, { name: name.trim() });
    const userId = await getCurrentUserId();

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

// ─── Bulk Delete ────────────────────────────────────────────────────────────

export async function deleteBrands(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map((id) => brandService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete brand ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.BRANDS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
