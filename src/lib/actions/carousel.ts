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
import { slugify } from "@/lib/api/r2-client";
import type { CarouselImageWithDetails } from "@/types/carousel";

// ─── Carousel Image Actions ─────────────────────────────────────────────────

export async function getAllCarouselImages(): Promise<CarouselImageWithDetails[]> {
  const { results } = await d1.query<CarouselImageWithDetails>(
    `SELECT ci.*, i.image_url, i.thumb_url, i.blurhash, i.focal_x, i.focal_y
     FROM carousel_image ci
     JOIN image i ON ci.image_id = i.image_id
     ORDER BY ci.carousel_id ASC, ci.display_order ASC, ci.added_at ASC`,
  );
  return results;
}

export async function addCarouselImage(
  carouselId: number,
  formData: FormData,
) {
  try {
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Image file is required" };
    }
    const entityName = slugify(file.name.replace(/\.[^.]+$/, "")) || "carousel";
    const uploaded = await processImageFieldRich(
      formData,
      "image",
      "carousels/",
      entityName,
    );

    if (!uploaded) {
      return { success: false, error: "Image file is required" };
    }

    const linkUrl = (formData.get("link_url") as string) || null;
    const focalX = parseFloat(formData.get("focal_x") as string) || 0.5;
    const focalY = parseFloat(formData.get("focal_y") as string) || 0.5;

    // Parallel: get user, create image record, and get next display_order
    const [added_by, { results: imageRows }, nextOrder] =
      await Promise.all([
        requirePermission("carousels", "create"),
        d1.query<{ image_id: number }>(
          "INSERT INTO image (image_url, thumb_url, blurhash, focal_x, focal_y, uploaded_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING image_id",
          [uploaded.key, uploaded.thumbKey, uploaded.blurhash, focalX, focalY, null],
        ),
        getLastDisplayOrder("carousel_image", "carousel_id", carouselId),
      ]);

    const imageId = imageRows[0].image_id;

    // Create the junction record
    await d1.query(
      `INSERT INTO carousel_image (carousel_id, image_id, display_order, added_by, active, link_url)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [carouselId, imageId, nextOrder, added_by, linkUrl],
    );

    invalidateTag(CACHE_TAGS.CAROUSELS);
    auditLog(added_by, "added carousel image | carousel=" + carouselId);
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
    // Get image keys for R2 cleanup
    const { results } = await d1.query<{ image_url: string; thumb_url: string | null }>(
      "SELECT image_url, thumb_url FROM image WHERE image_id = ?",
      [imageId],
    );
    const imageKey = results[0]?.image_url;
    const thumbKey = results[0]?.thumb_url;

    // Delete junction record
    await d1.query(
      "DELETE FROM carousel_image WHERE carousel_id = ? AND image_id = ?",
      [carouselId, imageId],
    );

    // Delete from R2 (both full + thumb variant if present)
    await deleteFile(imageKey);
    if (thumbKey) await deleteFile(thumbKey);

    // Delete the `image` table row IFF no other carousel_image still references
    // it. carousel_image is many-to-many, so an image could in principle be
    // linked to multiple carousels — only orphan if this was the last link.
    // Without this cleanup, the image table accumulates dead rows pointing at
    // now-deleted R2 keys.
    const refs = await d1.query<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM carousel_image WHERE image_id = ?",
      [imageId],
    );
    if ((refs.results[0]?.cnt ?? 0) === 0) {
      await d1.query("DELETE FROM image WHERE image_id = ?", [imageId]);
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

