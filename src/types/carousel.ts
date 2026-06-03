/** Matches the carousel table in D1 */
export interface Carousel {
  carousel_id: number;
  name: string;
  description: string | null;
  created_at: string;
}

/** Matches the carousel_image junction table in D1 */
export interface CarouselImage {
  carousel_id: number;
  image_id: number;
  /** Mobile (16:9) image row id — desktop is `image_id` (21:9). */
  mobile_image_id: number;
  display_order: string;
  added_by: number | null;
  active: number;
  link_url: string | null;
  added_at: string;
}

/** Carousel image with both resolved image variants for display. */
export interface CarouselImageWithDetails extends CarouselImage {
  // Desktop (21:9)
  image_url: string;
  thumb_url: string | null;
  blurhash: string | null;
  focal_x: number;
  focal_y: number;
  // Mobile (16:9)
  mobile_image_url: string;
  mobile_thumb_url: string | null;
  mobile_blurhash: string | null;
  mobile_focal_x: number;
  mobile_focal_y: number;
}
