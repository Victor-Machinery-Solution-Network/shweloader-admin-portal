"use server";

import { attachmentModelService } from "@/lib/services/attachment";
import { CACHE_TAGS } from "@/lib/constants";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { processFileField, cleanupOldFile } from "@/lib/actions/upload-helpers";
import { saveTrashMetadata } from "@/lib/actions/trash";

// ─── Attachment Model Actions ───────────────────────────────────────────────

export async function createAttachmentModel(formData: FormData) {
  const name = formData.get("name") as string;
  const category_id = Number(formData.get("category_id"));
  const brand_id = formData.get("brand_id")
    ? Number(formData.get("brand_id"))
    : null;

  if (!name?.trim()) {
    return { success: false, error: "Model name is required" };
  }
  if (!category_id) {
    return { success: false, error: "Category is required" };
  }

  try {
    const pdf_url = await processFileField(
      formData, "pdf_url", "pdfs/attachments/", name.trim(),
    );
    const created_by = await requirePermission("attachment_models", "create");
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

  if (!name?.trim()) {
    return { success: false, error: "Model name is required" };
  }
  if (!category_id) {
    return { success: false, error: "Category is required" };
  }

  try {
    await requirePermission("attachment_models", "edit");
    const existing = await attachmentModelService.getById(id);
    const pdf_url = await processFileField(
      formData, "pdf_url", "pdfs/attachments/", name.trim(), existing?.pdf_url,
    );
    await attachmentModelService.update(id, {
      name: name.trim(),
      category_id,
      brand_id,
      pdf_url,
    });
    await cleanupOldFile(existing?.pdf_url, pdf_url);
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
    const deletedBy = await requirePermission("attachment_models", "delete");
    await attachmentModelService.softDelete(id, deletedBy);
    saveTrashMetadata("attachment_model", id, deletedBy).catch(() => {});
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
  const deletedBy = await requirePermission("attachment_models", "delete");
  assertBulkLimit(ids);

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await attachmentModelService.softDelete(id, deletedBy);
      saveTrashMetadata("attachment_model", id, deletedBy).catch(() => {});
    }),
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
