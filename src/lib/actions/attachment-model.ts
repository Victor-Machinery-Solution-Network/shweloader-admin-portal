"use server";

import { attachmentModelService } from "@/lib/services/attachment";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";

// ─── Attachment Model Actions ───────────────────────────────────────────────

export async function createAttachmentModel(formData: FormData) {
  const name = formData.get("name") as string;
  const category_id = Number(formData.get("category_id"));
  const brand_id = formData.get("brand_id")
    ? Number(formData.get("brand_id"))
    : null;
  const pdf_url = (formData.get("pdf_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Model name is required" };
  }
  if (!category_id) {
    return { success: false, error: "Category is required" };
  }

  try {
    const created_by = await getCurrentUserId();
    await attachmentModelService.create({
      name: name.trim(),
      category_id,
      brand_id,
      pdf_url,
      created_by,
    });
    invalidateTag(CACHE_TAGS.ATTACHMENT_MODELS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create attachment model"),
    };
  }
}

export async function updateAttachmentModel(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const category_id = Number(formData.get("category_id"));
  const brand_id = formData.get("brand_id")
    ? Number(formData.get("brand_id"))
    : null;
  const pdf_url = (formData.get("pdf_url") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Model name is required" };
  }
  if (!category_id) {
    return { success: false, error: "Category is required" };
  }

  try {
    await attachmentModelService.update(id, {
      name: name.trim(),
      category_id,
      brand_id,
      pdf_url,
    });
    invalidateTag(CACHE_TAGS.ATTACHMENT_MODELS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update attachment model"),
    };
  }
}

export async function deleteAttachmentModel(id: number) {
  try {
    await attachmentModelService.delete(id);
    invalidateTag(CACHE_TAGS.ATTACHMENT_MODELS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete attachment model"),
    };
  }
}

export async function deleteAttachmentModels(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map((id) => attachmentModelService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete attachment model ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  invalidateTag(CACHE_TAGS.ATTACHMENT_MODELS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
