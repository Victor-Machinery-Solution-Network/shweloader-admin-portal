"use server";

import { revalidatePath } from "next/cache";
import { brandService } from "@/lib/services/brand";
import { d1 } from "@/lib/api/d1-client";
import { ROUTES } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";

// ─── Attachment Category-Brand Link Helpers ─────────────────────────────────

/** Get the attachment category IDs linked to a brand */
export async function getBrandCategoryIds(brandId: number): Promise<number[]> {
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

// ─── Equipment Sub-Category-Brand Link Helpers ──────────────────────────────

/** Get the equipment sub-category IDs linked to a brand */
export async function getBrandSubCategoryIds(
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

    revalidatePath(ROUTES.BRANDS);
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

    revalidatePath(ROUTES.BRANDS);
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
    revalidatePath(ROUTES.BRANDS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete brand"),
    };
  }
}

export async function deleteBrands(ids: number[]) {
  const errors: string[] = [];
  let deleted = 0;

  for (const id of ids) {
    try {
      await brandService.delete(id);
      deleted++;
    } catch (error) {
      errors.push(getErrorMessage(error, `Failed to delete brand ${id}`));
    }
  }

  revalidatePath(ROUTES.BRANDS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
