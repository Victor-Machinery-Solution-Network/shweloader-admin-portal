"use server";

import { promotionPushService } from "@/lib/services/promotion";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission, assertBulkLimit } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";
import { sendBroadcast } from "@/lib/services/push-notification";
import { assetUrl } from "@/lib/r2-url";

// ─── Device Count ─────────────────────────────────────────────────────────

export async function getDeviceCount(): Promise<number> {
  const result = await d1.query<{ count: number }>(
    "SELECT COUNT(*) as count FROM device_token",
  );
  return result.results[0]?.count ?? 0;
}

// ─── Promotion Push Actions ────────────────────────────────────────────────

export async function sendPromotionPush(formData: FormData) {
  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const productListId = formData.get("productListId") as string;

  if (!title?.trim()) {
    return { success: false, error: "Title is required" };
  }
  if (!body?.trim()) {
    return { success: false, error: "Body is required" };
  }

  try {
    const created_by = await requirePermission("promotions", "create");

    // Fetch listing thumbnail if a listing is linked
    let imageUrl: string | null = null;
    if (productListId) {
      const result = await d1.query<{ thumbnail_url: string | null }>(
        "SELECT thumbnail_url FROM product_list WHERE id = ?",
        [Number(productListId)],
      );
      const thumbnailKey = result.results[0]?.thumbnail_url;
      if (thumbnailKey) {
        imageUrl = assetUrl(thumbnailKey);
      }
    }

    // Count total device tokens for tracking
    const countResult = await d1.query<{ total: number }>(
      "SELECT COUNT(*) as total FROM device_token",
    );
    const device_count = countResult.results[0]?.total ?? 0;

    // Save the promotion record
    await promotionPushService.create({
      title: title.trim(),
      body: body.trim(),
      image_url: imageUrl,
      listing_id: productListId ? Number(productListId) : null,
      device_count,
      created_by,
    });

    // Send push to all devices — must await so the serverless function
    // doesn't terminate before FCM accepts all messages
    await sendBroadcast({
      type: "promotion",
      title: title.trim(),
      body: body.trim(),
      ...(imageUrl && { imageUrl }),
      ...(productListId && { referenceId: productListId }),
    });

    invalidateTag(CACHE_TAGS.PROMOTION_PUSHES);
    auditLog(created_by, "sent promotion push");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to send promotion"),
    };
  }
}

export async function resendPromotionPush(id: number) {
  try {
    const created_by = await requirePermission("promotions", "create");

    // Fetch the original promotion
    const original = await promotionPushService.getByIdOrThrow(id);

    // Re-fetch thumbnail in case it changed
    let imageUrl: string | null = original.image_url;
    if (original.listing_id) {
      const result = await d1.query<{ thumbnail_url: string | null }>(
        "SELECT thumbnail_url FROM product_list WHERE id = ?",
        [original.listing_id],
      );
      const thumbnailKey = result.results[0]?.thumbnail_url;
      imageUrl = thumbnailKey ? assetUrl(thumbnailKey) : null;
    }

    // Count current device tokens
    const countResult = await d1.query<{ total: number }>(
      "SELECT COUNT(*) as total FROM device_token",
    );
    const device_count = countResult.results[0]?.total ?? 0;

    // Save as a new promotion record
    await promotionPushService.create({
      title: original.title,
      body: original.body,
      image_url: imageUrl,
      listing_id: original.listing_id,
      device_count,
      created_by,
    });

    await sendBroadcast({
      type: "promotion",
      title: original.title,
      body: original.body,
      ...(imageUrl && { imageUrl }),
      ...(original.listing_id && { referenceId: String(original.listing_id) }),
    });

    invalidateTag(CACHE_TAGS.PROMOTION_PUSHES);
    auditLog(created_by, "resent promotion push | original_id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to resend promotion"),
    };
  }
}

export async function deletePromotionPush(id: number) {
  try {
    const deletedBy = await requirePermission("promotions", "delete");
    await promotionPushService.softDelete(id, deletedBy);
    saveTrashMetadata("promotion_push", id, deletedBy).catch(() => {});
    invalidateTag(CACHE_TAGS.PROMOTION_PUSHES);
    auditLog(deletedBy, "deleted promotion push | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete promotion"),
    };
  }
}

export async function deletePromotionPushes(ids: number[]) {
  try {
    const deletedBy = await requirePermission("promotions", "delete");
    assertBulkLimit(ids);
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        await promotionPushService.softDelete(id, deletedBy);
        saveTrashMetadata("promotion_push", id, deletedBy).catch(() => {});
      }),
    );

    const errors = results
      .map((r, i) =>
        r.status === "rejected"
          ? getErrorMessage(r.reason, `Failed to delete promotion ${ids[i]}`)
          : null,
      )
      .filter(Boolean) as string[];
    const deleted = results.filter((r) => r.status === "fulfilled").length;
    invalidateTag(CACHE_TAGS.PROMOTION_PUSHES);
    auditLog(deletedBy, "bulk deleted promotions | count=" + deleted);

    if (errors.length > 0) {
      return {
        success: false,
        error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
      };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete promotions"),
    };
  }
}
