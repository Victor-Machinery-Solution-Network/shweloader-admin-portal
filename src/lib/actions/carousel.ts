"use server";

import { carouselService } from "@/lib/services/carousel";
import { d1 } from "@/lib/api/d1-client";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
import { invalidateTag } from "@/lib/cache-invalidation";
import { CACHE_TAGS } from "@/lib/constants";
import { getNextDisplayOrder } from "@/lib/actions/reorder";
import type { CarouselImageWithDetails } from "@/types/carousel";

// ─── Carousel Actions ───────────────────────────────────────────────────────

export async function createCarousel(formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Carousel name is required" };
  }

  try {
    await carouselService.create({
      name: name.trim(),
      description,
    });
    invalidateTag(CACHE_TAGS.CAROUSELS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create carousel"),
    };
  }
}

export async function updateCarousel(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!name?.trim()) {
    return { success: false, error: "Carousel name is required" };
  }

  try {
    await carouselService.update(id, { name: name.trim(), description });
    invalidateTag(CACHE_TAGS.CAROUSELS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update carousel"),
    };
  }
}

export async function deleteCarousel(id: number) {
  try {
    await carouselService.delete(id);
    invalidateTag(CACHE_TAGS.CAROUSELS);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to delete carousel"),
    };
  }
}

// ─── Carousel Image Actions ─────────────────────────────────────────────────

export async function getCarouselImages(
  carouselId: number,
): Promise<CarouselImageWithDetails[]> {
  const { results } = await d1.query<CarouselImageWithDetails>(
    `SELECT ci.*, i.image_url
     FROM carousel_image ci
     JOIN image i ON ci.image_id = i.image_id
     WHERE ci.carousel_id = ?
     ORDER BY ci.display_order ASC, ci.added_at ASC`,
    [carouselId],
  );
  return results;
}

export async function addCarouselImage(
  carouselId: number,
  imageUrl: string,
  linkUrl?: string,
) {
  if (!imageUrl?.trim()) {
    return { success: false, error: "Image URL is required" };
  }

  try {
    // Parallel: get user, create image record, and get next display_order
    const [added_by, { results: imageResults }, nextOrder] =
      await Promise.all([
        getCurrentUserId(),
        d1.create("image", {
          image_url: imageUrl.trim(),
          uploaded_by: null, // will be set by the DB default if needed
        }),
        getNextDisplayOrder("carousel_image", "carousel_id", carouselId),
      ]);

    const imageId = (imageResults[0] as { image_id: number }).image_id;

    // Create the junction record
    await d1.query(
      `INSERT INTO carousel_image (carousel_id, image_id, display_order, added_by, active, link_url)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [carouselId, imageId, nextOrder, added_by, linkUrl || null],
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
    await d1.query(
      "DELETE FROM carousel_image WHERE carousel_id = ? AND image_id = ?",
      [carouselId, imageId],
    );
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

