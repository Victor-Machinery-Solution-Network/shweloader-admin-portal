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
  display_order: string;
  added_by: number | null;
  active: number;
  link_url: string | null;
  added_at: string;
}

/** Carousel image with resolved image URL for display */
export interface CarouselImageWithDetails extends CarouselImage {
  image_url: string;
}
