"use server";

import { d1 } from "@/lib/api/d1-client";
import { popupPromotionService } from "@/lib/services/popup-promotion";
import {
  getErrorMessage,
  requirePermission,
  assertBulkLimit,
} from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { saveTrashMetadata } from "@/lib/actions/trash";
import { auditLog } from "@/lib/actions/audit";
import {
  processImageFieldRich,
  deleteFile,
} from "@/lib/actions/upload-helpers";
import { slugify } from "@/lib/api/r2-client";
import type { PopupTargetScreen, PopupTriggerType } from "@/types/popup-promotion";

interface FormPayload {
  name: string;
  ctaLabel: string | null;
  triggerType: PopupTriggerType;
  triggerDelay: number;
  triggerScroll: number;
  startAt: string | null;
  endAt: string | null;
  active: 0 | 1;
  screen: PopupTargetScreen | null;
  listingIds: number[];
}

const VALID_SCREENS: PopupTargetScreen[] = ["home", "browse", "subcategory"];

function parseFormData(formData: FormData): FormPayload {
  const screenRaw = ((formData.get("screen") as string) ?? "").trim();
  const listingsRaw = (formData.get("listing_ids") as string) ?? "";
  return {
    name: ((formData.get("name") as string) ?? "").trim(),
    ctaLabel: (((formData.get("cta_label") as string) ?? "").trim()) || null,
    triggerType: (formData.get("trigger_type") as PopupTriggerType) ?? "screen_entry",
    triggerDelay: parseInt((formData.get("trigger_delay_seconds") as string) ?? "0", 10),
    triggerScroll: parseInt((formData.get("trigger_scroll_percent") as string) ?? "50", 10),
    startAt: ((formData.get("start_at") as string) ?? "") || null,
    endAt: ((formData.get("end_at") as string) ?? "") || null,
    active: (formData.get("active") === "1" ? 1 : 0),
    screen: VALID_SCREENS.includes(screenRaw as PopupTargetScreen)
      ? (screenRaw as PopupTargetScreen)
      : null,
    listingIds: listingsRaw.split(",").filter(Boolean).map(Number),
  };
}

function validate(p: FormPayload): string | null {
  if (!p.name) return "Promotion name is required";
  if (!p.screen) return "Pick a target screen for this promo";
  if (p.triggerType === "screen_entry" && (p.triggerDelay < 0 || p.triggerDelay > 30)) {
    return "Trigger delay must be 0–30 seconds";
  }
  if (p.triggerType === "scroll" && (p.triggerScroll < 0 || p.triggerScroll > 100)) {
    return "Trigger scroll percent must be 0–100";
  }
  if (p.listingIds.length > 0 && !p.ctaLabel) {
    return "CTA label is required when products are linked";
  }
  return null;
}

export async function createPopupPromotion(formData: FormData) {
  try {
    const payload = parseFormData(formData);
    const error = validate(payload);
    if (error) return { success: false, error };

    const created_by = await requirePermission("popup_promotions", "create");

    const entityName = slugify(payload.name) || "popup";
    const uploaded = await processImageFieldRich(
      formData,
      "image",
      "popup-promotions/",
      entityName,
    );
    if (!uploaded) {
      return { success: false, error: "Failed to upload image" };
    }

    // Insert image record
    const { results: imageRows } = await d1.query<{ image_id: number }>(
      "INSERT INTO image (image_url, thumb_url, blurhash, focal_x, focal_y, uploaded_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING image_id",
      [uploaded.key, uploaded.thumbKey, uploaded.blurhash, 0.5, 0.5, created_by],
    );
    const imageId = imageRows[0].image_id;

    // Insert popup_promotion
    const { results: promoRows } = await d1.query<{ popup_promotion_id: number }>(
      `INSERT INTO popup_promotion
        (name, image_id, cta_label, screen, trigger_type, trigger_delay_seconds,
         trigger_scroll_percent, start_at, end_at, active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING popup_promotion_id`,
      [
        payload.name,
        imageId,
        payload.ctaLabel,
        payload.screen,
        payload.triggerType,
        payload.triggerDelay,
        payload.triggerScroll,
        payload.startAt,
        payload.endAt,
        payload.active,
        created_by,
      ],
    );
    const promoId = promoRows[0].popup_promotion_id;

    // Insert linked listings (display_order plain "0" — admin can reorder later)
    for (const lid of payload.listingIds) {
      await d1.query(
        "INSERT INTO popup_promotion_listing (popup_promotion_id, product_list_id, display_order) VALUES (?, ?, '0')",
        [promoId, lid],
      );
    }

    invalidateTag(CACHE_TAGS.POPUP_PROMOTIONS);
    auditLog(created_by, "created popup_promotion | id=" + promoId);
    return { success: true, id: promoId };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create popup promotion"),
    };
  }
}

export async function updatePopupPromotion(id: number, formData: FormData) {
  try {
    const payload = parseFormData(formData);
    const error = validate(payload);
    if (error) return { success: false, error };

    const userId = await requirePermission("popup_promotions", "edit");

    // Optional image swap
    let newImageId: number | null = null;
    let oldImageKey: string | null = null;
    let oldThumbKey: string | null = null;

    const pendingKey = formData.get("image_pending_key");
    const hasNewImage = typeof pendingKey === "string" && pendingKey.length > 0;
    if (hasNewImage) {
      // Look up the current image so we can delete it from R2 after the swap
      const { results: cur } = await d1.query<{
        image_id: number;
        image_url: string;
        thumb_url: string | null;
      }>(
        `SELECT p.image_id, i.image_url, i.thumb_url
           FROM popup_promotion p JOIN image i ON p.image_id = i.image_id
          WHERE p.popup_promotion_id = ?`,
        [id],
      );
      if (cur.length === 0) {
        return { success: false, error: "Popup promotion not found" };
      }
      oldImageKey = cur[0].image_url;
      oldThumbKey = cur[0].thumb_url;

      const entityName = slugify(payload.name) || "popup";
      const uploaded = await processImageFieldRich(
        formData,
        "image",
        "popup-promotions/",
        entityName,
      );
      if (!uploaded) return { success: false, error: "Failed to upload image" };

      const { results: imageRows } = await d1.query<{ image_id: number }>(
        "INSERT INTO image (image_url, thumb_url, blurhash, focal_x, focal_y, uploaded_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING image_id",
        [uploaded.key, uploaded.thumbKey, uploaded.blurhash, 0.5, 0.5, userId],
      );
      newImageId = imageRows[0].image_id;
    }

    // Update popup_promotion row
    const setClauses: string[] = [
      "name = ?",
      "cta_label = ?",
      "screen = ?",
      "trigger_type = ?",
      "trigger_delay_seconds = ?",
      "trigger_scroll_percent = ?",
      "start_at = ?",
      "end_at = ?",
      "active = ?",
      "updated_at = CURRENT_TIMESTAMP",
    ];
    const params: (string | number | boolean | null)[] = [
      payload.name,
      payload.ctaLabel,
      payload.screen,
      payload.triggerType,
      payload.triggerDelay,
      payload.triggerScroll,
      payload.startAt,
      payload.endAt,
      payload.active,
    ];
    if (newImageId !== null) {
      setClauses.push("image_id = ?");
      params.push(newImageId);
    }
    params.push(id);

    await d1.query(
      `UPDATE popup_promotion SET ${setClauses.join(", ")} WHERE popup_promotion_id = ?`,
      params,
    );

    // Replace linked listings
    await d1.query(
      "DELETE FROM popup_promotion_listing WHERE popup_promotion_id = ?",
      [id],
    );
    for (const lid of payload.listingIds) {
      await d1.query(
        "INSERT INTO popup_promotion_listing (popup_promotion_id, product_list_id, display_order) VALUES (?, ?, '0')",
        [id, lid],
      );
    }

    // Best-effort cleanup of the old R2 image (after DB swap so we don't orphan)
    if (oldImageKey) await deleteFile(oldImageKey);
    if (oldThumbKey) await deleteFile(oldThumbKey);

    invalidateTag(CACHE_TAGS.POPUP_PROMOTIONS);
    auditLog(userId, "updated popup_promotion | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update popup promotion"),
    };
  }
}

export async function deletePopupPromotion(id: number) {
  try {
    const deletedBy = await requirePermission("popup_promotions", "delete");
    await popupPromotionService.softDelete(id, deletedBy);
    await saveTrashMetadata("popup_promotion", id, deletedBy);
    invalidateTag(CACHE_TAGS.POPUP_PROMOTIONS);
    auditLog(deletedBy, "deleted popup_promotion | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete popup promotion"),
    };
  }
}

export async function deletePopupPromotions(ids: number[]) {
  const deletedBy = await requirePermission("popup_promotions", "delete");
  assertBulkLimit(ids);
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await popupPromotionService.softDelete(id, deletedBy);
      await saveTrashMetadata("popup_promotion", id, deletedBy);
    }),
  );
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r, i) =>
      getErrorMessage(r.reason, `Failed to delete popup promotion ${ids[i]}`),
    );
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  invalidateTag(CACHE_TAGS.POPUP_PROMOTIONS);
  auditLog(deletedBy, "bulk deleted popup_promotions | count=" + deleted);
  if (errors.length > 0) {
    return {
      success: false,
      error: `Deleted ${deleted} of ${ids.length}. ${errors[0]}`,
    };
  }
  return { success: true };
}

export async function togglePopupPromotionActive(id: number) {
  try {
    const userId = await requirePermission("popup_promotions", "edit");
    await d1.query(
      "UPDATE popup_promotion SET active = 1 - active, updated_at = CURRENT_TIMESTAMP WHERE popup_promotion_id = ?",
      [id],
    );
    invalidateTag(CACHE_TAGS.POPUP_PROMOTIONS);
    auditLog(userId, "toggled popup_promotion active | id=" + id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle popup promotion"),
    };
  }
}
