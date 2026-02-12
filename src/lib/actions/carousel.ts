"use server";

import { revalidatePath } from "next/cache";
import { carouselService } from "@/lib/services/carousel";
import { d1 } from "@/lib/api/d1-client";
import { ROUTES } from "@/lib/constants";
import { getErrorMessage, getCurrentUserId } from "@/lib/actions/utils";
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
    revalidatePath(ROUTES.CAROUSEL_IMAGES);
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
    revalidatePath(ROUTES.CAROUSEL_IMAGES);
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
    revalidatePath(ROUTES.CAROUSEL_IMAGES);
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
     ORDER BY CAST(ci.display_order AS INTEGER) ASC, ci.added_at ASC`,
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
    // Parallel: get user, create image record, and get max display_order
    const [added_by, { results: imageResults }, { results: maxOrder }] =
      await Promise.all([
        getCurrentUserId(),
        d1.create("image", {
          image_url: imageUrl.trim(),
          uploaded_by: null, // will be set by the DB default if needed
        }),
        d1.query<{ max_order: number | null }>(
          "SELECT MAX(CAST(display_order AS INTEGER)) as max_order FROM carousel_image WHERE carousel_id = ?",
          [carouselId],
        ),
      ]);

    const imageId = (imageResults[0] as { image_id: number }).image_id;
    const nextOrder = (maxOrder[0]?.max_order ?? 0) + 1;

    // Create the junction record
    await d1.query(
      `INSERT INTO carousel_image (carousel_id, image_id, display_order, added_by, active, link_url)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [carouselId, imageId, String(nextOrder), added_by, linkUrl || null],
    );

    revalidatePath(ROUTES.CAROUSEL_IMAGES);
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
    revalidatePath(ROUTES.CAROUSEL_IMAGES);
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
    revalidatePath(ROUTES.CAROUSEL_IMAGES);
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
    revalidatePath(ROUTES.CAROUSEL_IMAGES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle active state"),
    };
  }
}

export async function reorderCarouselImages(
  carouselId: number,
  orderedImageIds: number[],
) {
  try {
    const cases = orderedImageIds
      .map((id, i) => `WHEN ${id} THEN '${i + 1}'`)
      .join(" ");
    const idList = orderedImageIds.join(", ");
    await d1.query(
      `UPDATE carousel_image SET display_order = CASE image_id ${cases} END WHERE carousel_id = ${carouselId} AND image_id IN (${idList})`,
    );
    revalidatePath(ROUTES.CAROUSEL_IMAGES);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to reorder images"),
    };
  }
}