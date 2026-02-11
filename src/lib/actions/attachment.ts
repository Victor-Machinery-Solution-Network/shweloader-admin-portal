"use server";

import { revalidatePath } from "next/cache";
import { attachmentCategoryService } from "@/lib/services/attachment";
import { d1 } from "@/lib/api/d1-client";
import { ROUTES } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";

// ─── Attachment Category Actions ─────────────────────────────────────────────

export async function createAttachmentCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const image_url = (formData.get("image_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    const created_by = await getCurrentUserId();
    await attachmentCategoryService.create({
      name: name.trim(),
      image_url,
      created_by,
    });
    revalidatePath(ROUTES.ATTACHMENT_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create category"),
    };
  }
}

export async function updateAttachmentCategory(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const image_url = (formData.get("image_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Category name is required" };
  }

  try {
    await attachmentCategoryService.update(id, {
      name: name.trim(),
      image_url,
    });
    revalidatePath(ROUTES.ATTACHMENT_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update category"),
    };
  }
}

export async function deleteAttachmentCategory(id: number) {
  try {
    await attachmentCategoryService.delete(id);
    revalidatePath(ROUTES.ATTACHMENT_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete category"),
    };
  }
}

export async function deleteAttachmentCategories(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map((id) => attachmentCategoryService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete category ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  revalidatePath(ROUTES.ATTACHMENT_CATEGORIES);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

// ─── Linked Count Helpers ─────────────────────────────────────────────────────

export interface AttachmentCategoryLinkedCounts {
  attachmentModels: number;
  brands: number;
  total: number;
}

export async function getAttachmentCategoryLinkedCounts(
  categoryIds: number[],
): Promise<Record<number, AttachmentCategoryLinkedCounts>> {
  const entries = await Promise.all(
    categoryIds.map(async (id) => {
      const [atModels, brands] = await Promise.all([
        d1.query<{ count: number }>(
          "SELECT COUNT(*) as count FROM attachment_model WHERE category_id = ?",
          [id],
        ),
        d1.query<{ count: number }>(
          "SELECT COUNT(*) as count FROM attachment_category_brand WHERE category_id = ?",
          [id],
        ),
      ]);

      const attachmentModels = atModels.results[0]?.count ?? 0;
      const brandsCount = brands.results[0]?.count ?? 0;

      return [
        id,
        {
          attachmentModels,
          brands: brandsCount,
          total: attachmentModels + brandsCount,
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function formatAttachmentCategoryLinkedSummary(
  c: AttachmentCategoryLinkedCounts,
): Promise<string> {
  const parts: string[] = [];
  if (c.attachmentModels > 0) {
    parts.push(
      `${c.attachmentModels} attachment ${c.attachmentModels === 1 ? "model" : "models"}`,
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

export async function reorderAttachmentCategories(orderedIds: number[]) {
  try {
    const cases = orderedIds
      .map((id, i) => `WHEN ${id} THEN '${i + 1}'`)
      .join(" ");
    const idList = orderedIds.join(", ");
    await d1.query(
      `UPDATE attachment_category SET display_order = CASE category_id ${cases} END WHERE category_id IN (${idList})`,
    );
    revalidatePath(ROUTES.ATTACHMENT_CATEGORIES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reorder categories"),
    };
  }
}
