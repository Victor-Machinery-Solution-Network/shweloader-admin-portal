/** Matches the carousel table in D1 */
export interface Carousel {
  carousel_id: number;
  name: string;
  description: string | null;
  created_at: string;
}

/** Matches the image table in D1 */
export interface Image {
  image_id: number;
  image_url: string;
  uploaded_by: number | null;
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
