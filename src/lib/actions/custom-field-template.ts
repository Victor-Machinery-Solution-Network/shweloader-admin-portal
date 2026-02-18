"use server";

import { customFieldTemplateService } from "@/lib/services/custom-field-template";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import type {
  CustomFieldDefinition,
  CustomFieldTemplateWithFields,
} from "@/types/custom-field";

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getCustomFieldTemplates(): Promise<
  CustomFieldTemplateWithFields[]
> {
  const templates = await customFieldTemplateService.list({
    sort_by: "name",
    order: "asc",
  });
  return templates.map((t) => ({
    ...t,
    fields: JSON.parse(t.fields || "[]") as CustomFieldDefinition[],
  }));
}

export async function getCustomFieldTemplateById(
  id: number,
): Promise<CustomFieldTemplateWithFields | null> {
  const template = await customFieldTemplateService.getById(id);
  if (!template) return null;
  return {
    ...template,
    fields: JSON.parse(template.fields || "[]") as CustomFieldDefinition[],
  };
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createCustomFieldTemplate(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const fieldsJson = formData.get("fields") as string;

  if (!name) {
    return { success: false, error: "Template name is required" };
  }

  try {
    const fields: CustomFieldDefinition[] = JSON.parse(fieldsJson || "[]");
    if (fields.length === 0) {
      return { success: false, error: "At least one field is required" };
    }

    const created_by = await getCurrentUserId();
    await customFieldTemplateService.create({
      name,
      fields: JSON.stringify(fields),
      created_by,
    });

    invalidateTag(CACHE_TAGS.CUSTOM_FIELD_TEMPLATES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create template"),
    };
  }
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateCustomFieldTemplate(
  id: number,
  formData: FormData,
) {
  const name = (formData.get("name") as string)?.trim();
  const fieldsJson = formData.get("fields") as string;

  if (!name) {
    return { success: false, error: "Template name is required" };
  }

  try {
    const fields: CustomFieldDefinition[] = JSON.parse(fieldsJson || "[]");
    if (fields.length === 0) {
      return { success: false, error: "At least one field is required" };
    }

    await customFieldTemplateService.update(id, {
      name,
      fields: JSON.stringify(fields),
    });

    invalidateTag(CACHE_TAGS.CUSTOM_FIELD_TEMPLATES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update template"),
    };
  }
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteCustomFieldTemplate(id: number) {
  try {
    await customFieldTemplateService.delete(id);
    invalidateTag(CACHE_TAGS.CUSTOM_FIELD_TEMPLATES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete template"),
    };
  }
}

// ─── Bulk Delete ────────────────────────────────────────────────────────────

export async function deleteCustomFieldTemplates(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map((id) => customFieldTemplateService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete template ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.CUSTOM_FIELD_TEMPLATES);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
