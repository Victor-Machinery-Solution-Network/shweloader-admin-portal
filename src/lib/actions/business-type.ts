"use server";

import { revalidatePath } from "next/cache";
import { businessTypeService } from "@/lib/services/customer";
import { d1 } from "@/lib/api/d1-client";
import { ROUTES } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";

// ─── Business Type Actions ───────────────────────────────────────────────────

export async function createBusinessType(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Business type name is required" };
  }

  try {
    const created_by = await getCurrentUserId();
    await businessTypeService.create({
      name: name.trim(),
      is_listed: 1,
      created_by,
    });
    revalidatePath(ROUTES.CUSTOMERS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create business type"),
    };
  }
}

export async function updateBusinessType(id: number, formData: FormData) {
  const name = formData.get("name") as string;

  if (!name?.trim()) {
    return { success: false, error: "Business type name is required" };
  }

  try {
    await businessTypeService.update(id, { name: name.trim() });
    revalidatePath(ROUTES.CUSTOMERS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update business type"),
    };
  }
}

export async function deleteBusinessType(id: number) {
  try {
    await businessTypeService.delete(id);
    revalidatePath(ROUTES.CUSTOMERS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete business type"),
    };
  }
}

// ─── Linked Count Helpers ────────────────────────────────────────────────────

export async function getCustomerCount(
  businessTypeIds: number[],
): Promise<Record<number, number>> {
  const entries = await Promise.all(
    businessTypeIds.map(async (id) => {
      const result = await d1.query<{ count: number }>(
        "SELECT COUNT(*) as count FROM customer WHERE business_type_id = ?",
        [id],
      );
      return [id, result.results[0]?.count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// ─── Bulk Delete ─────────────────────────────────────────────────────────────

export async function deleteBusinessTypes(ids: number[]) {
  const results = await Promise.allSettled(
    ids.map((id) => businessTypeService.delete(id)),
  );

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete business type ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;

  revalidatePath(ROUTES.CUSTOMERS);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}
