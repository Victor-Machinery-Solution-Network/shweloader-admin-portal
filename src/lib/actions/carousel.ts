"use server";

import { revalidatePath } from "next/cache";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { auditLog } from "@/lib/actions/audit";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { getLastDisplayOrder } from "@/lib/actions/reorder";
import {
  processImageFieldRich,
  deleteFile,
} from "@/lib/actions/upload-helpers";
import type { CarouselImageWithDetails } from "@/types/carousel";

// ─── Carousel Image Actions ─────────────────────────────────────────────────

export async function getAllCarouselImages(): Promise<CarouselImageWithDetails[]> {
  const { results } = await d1.query<CarouselImageWithDetails>(
    `SELECT ci.*,
       i.image_url, i.thumb_url, i.blurhash, i.focal_x, i.focal_y,
       mi.image_url AS mobile_image_url, mi.thumb_url AS mobile_thumb_url,
       mi.blurhash AS mobile_blurhash, mi.focal_x AS mobile_focal_x, mi.focal_y AS mobile_focal_y
     FROM carousel_image ci
     JOIN image i ON ci.image_id = i.image_id
     JOIN image mi ON ci.mobile_image_id = mi.image_id
     ORDER BY ci.carousel_id ASC, ci.display_order ASC, ci.added_at ASC`,
  );
  return results;
}

export async function addCarouselImage(
  carouselId: number,
  formData: FormData,
) {
  try {
    const added_by = await requirePermission("carousels", "create");

    // Two required images per slide: desktop (21:9, field `image`) and mobile
    // (16:9, field `mobile_image`). ImageInput direct-uploads to R2 and ships
    // `<name>_pending_key`; processImageFieldRich commits each to its final key.
    const desktop = await processImageFieldRich(
      formData,
      "image",
      "carousels/",
      "carousel",
    );
    const mobile = await processImageFieldRich(
      formData,
      "mobile_image",
      "carousels/",
      "carousel-mobile",
    );
    if (!desktop || !mobile) {
      return {
        success: false,
        error: "Both desktop (21:9) and mobile (16:9) images are required",
      };
    }

    const linkUrl = (formData.get("link_url") as string) || null;
    const dFocalX = parseFloat(formData.get("focal_x") as string) || 0.5;
    const dFocalY = parseFloat(formData.get("focal_y") as string) || 0.5;
    const mFocalX = parseFloat(formData.get("mobile_focal_x") as string) || 0.5;
    const mFocalY = parseFloat(formData.get("mobile_focal_y") as string) || 0.5;

    // Insert both image rows + resolve display order in parallel.
    const [{ results: dRows }, { results: mRows }, nextOrder] =
      await Promise.all([
        d1.query<{ image_id: number }>(
          "INSERT INTO image (image_url, thumb_url, blurhash, focal_x, focal_y, uploaded_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING image_id",
          [desktop.key, desktop.thumbKey, desktop.blurhash, dFocalX, dFocalY, added_by],
        ),
        d1.query<{ image_id: number }>(
          "INSERT INTO image (image_url, thumb_url, blurhash, focal_x, focal_y, uploaded_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING image_id",
          [mobile.key, mobile.thumbKey, mobile.blurhash, mFocalX, mFocalY, added_by],
        ),
        getLastDisplayOrder("carousel_image", "carousel_id", carouselId),
      ]);

    const imageId = dRows[0].image_id;
    const mobileImageId = mRows[0].image_id;

    await d1.query(
      `INSERT INTO carousel_image (carousel_id, image_id, mobile_image_id, display_order, added_by, active, link_url)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [carouselId, imageId, mobileImageId, nextOrder, added_by, linkUrl],
    );

    invalidateTag(CACHE_TAGS.CAROUSELS);
    auditLog(added_by, "added carousel image (dual) | carousel=" + carouselId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to add image"),
    };
  }
}

export async function removeCarouselImage(
  carouselId: number,
  imageId: number,
) {
  try {
    const userId = await requirePermission("carousels", "delete");

    // A slide now owns TWO image rows (desktop image_id + mobile_image_id).
    // Resolve the paired mobile image so we clean up both.
    const { results: junction } = await d1.query<{ mobile_image_id: number | null }>(
      "SELECT mobile_image_id FROM carousel_image WHERE carousel_id = ? AND image_id = ?",
      [carouselId, imageId],
    );
    const mobileImageId = junction[0]?.mobile_image_id ?? null;
    const ids = [imageId, ...(mobileImageId ? [mobileImageId] : [])];

    // Gather R2 keys for both image rows.
    const placeholders = ids.map(() => "?").join(",");
    const { results: imgs } = await d1.query<{
      image_id: number;
      image_url: string;
      thumb_url: string | null;
    }>(
      `SELECT image_id, image_url, thumb_url FROM image WHERE image_id IN (${placeholders})`,
      ids,
    );

    // Delete the junction record first (removes both references atomically).
    await d1.query(
      "DELETE FROM carousel_image WHERE carousel_id = ? AND image_id = ?",
      [carouselId, imageId],
    );

    // For each image row: drop its R2 objects, then orphan-clean the row IFF no
    // other slide still references it as a desktop (image_id) OR mobile
    // (mobile_image_id) image.
    for (const img of imgs) {
      await deleteFile(img.image_url);
      if (img.thumb_url) await deleteFile(img.thumb_url);
      const refs = await d1.query<{ cnt: number }>(
        "SELECT (SELECT COUNT(*) FROM carousel_image WHERE image_id = ?) + (SELECT COUNT(*) FROM carousel_image WHERE mobile_image_id = ?) AS cnt",
        [img.image_id, img.image_id],
      );
      if ((refs.results[0]?.cnt ?? 0) === 0) {
        await d1.query("DELETE FROM image WHERE image_id = ?", [img.image_id]);
      }
    }

    invalidateTag(CACHE_TAGS.CAROUSELS);
    auditLog(userId, "removed carousel image | carousel=" + carouselId + " | image=" + imageId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to remove image"),
    };
  }
}

export async function updateCarouselImageLink(
  carouselId: number,
  imageId: number,
  linkUrl: string | null,
) {
  try {
    const userId = await requirePermission("carousels", "edit");
    await d1.query(
      "UPDATE carousel_image SET link_url = ? WHERE carousel_id = ? AND image_id = ?",
      [linkUrl, carouselId, imageId],
    );
    invalidateTag(CACHE_TAGS.CAROUSELS);
    auditLog(userId, "updated carousel image link | carousel=" + carouselId + " | image=" + imageId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update link"),
    };
  }
}

export async function toggleCarouselImageActive(
  carouselId: number,
  imageId: number,
) {
  try {
    const userId = await requirePermission("carousels", "edit");
    await d1.query(
      "UPDATE carousel_image SET active = 1 - active WHERE carousel_id = ? AND image_id = ?",
      [carouselId, imageId],
    );
    invalidateTag(CACHE_TAGS.CAROUSELS);
    auditLog(userId, "toggled carousel image active | carousel=" + carouselId + " | image=" + imageId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle active state"),
    };
  }
}

export async function updateImageFocalPoint(
  imageId: number,
  focalX: number,
  focalY: number,
) {
  if (focalX < 0 || focalX > 1 || focalY < 0 || focalY > 1) {
    return { success: false, error: "Invalid focal point values" };
  }

  try {
    const userId = await requirePermission("carousels", "edit");
    await d1.query(
      "UPDATE image SET focal_x = ?, focal_y = ? WHERE image_id = ?",
      [focalX, focalY, imageId],
    );
    invalidateTag(CACHE_TAGS.CAROUSELS);
    revalidatePath("/carousel");
    auditLog(userId, "updated image focal point | image=" + imageId);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to update focal point") };
  }
}

