"use server";

import { revalidatePath } from "next/cache";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, requirePermission } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { getLastDisplayOrder } from "@/lib/actions/reorder";
import { processFileWithOriginalName, deleteFile } from "@/lib/actions/upload-helpers";
import type { CarouselImageWithDetails } from "@/types/carousel";

// ─── Carousel Image Actions ─────────────────────────────────────────────────

export async function getAllCarouselImages(): Promise<CarouselImageWithDetails[]> {
  const { results } = await d1.query<CarouselImageWithDetails>(
    `SELECT ci.*, i.image_url, i.focal_x, i.focal_y
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
    // Upload file to R2
    const imageKey = await processFileWithOriginalName(
      formData, "image", "carousels/",
    );

    if (!imageKey) {
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
          "INSERT INTO image (image_url, focal_x, focal_y, uploaded_by) VALUES (?, ?, ?, ?) RETURNING image_id",
          [imageKey, focalX, focalY, null],
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
    await requirePermission("carousels", "delete");
    // Get image key for R2 cleanup
    const { results } = await d1.query<{ image_url: string }>(
      "SELECT image_url FROM image WHERE image_id = ?",
      [imageId],
    );
    const imageKey = results[0]?.image_url;

    // Delete junction record
    await d1.query(
      "DELETE FROM carousel_image WHERE carousel_id = ? AND image_id = ?",
      [carouselId, imageId],
    );

    // Delete from R2
    await deleteFile(imageKey);

    invalidateTag(CACHE_TAGS.CAROUSELS);
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
    await requirePermission("carousels", "edit");
    await d1.query(
      "UPDATE carousel_image SET link_url = ? WHERE carousel_id = ? AND image_id = ?",
      [linkUrl, carouselId, imageId],
    );
    invalidateTag(CACHE_TAGS.CAROUSELS);
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
    await requirePermission("carousels", "edit");
    await d1.query(
      "UPDATE carousel_image SET active = 1 - active WHERE carousel_id = ? AND image_id = ?",
      [carouselId, imageId],
    );
    invalidateTag(CACHE_TAGS.CAROUSELS);
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
    await requirePermission("carousels", "edit");
    await d1.query(
      "UPDATE image SET focal_x = ?, focal_y = ? WHERE image_id = ?",
      [focalX, focalY, imageId],
    );
    invalidateTag(CACHE_TAGS.CAROUSELS);
    revalidatePath("/carousel");
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to update focal point") };
  }
}

