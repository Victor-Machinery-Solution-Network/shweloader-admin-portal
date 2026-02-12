import { createService } from "@/lib/api/create-service";
import type { Carousel } from "@/types/carousel";

export const carouselService = createService<Carousel>("carousel", {
  primaryKey: "carousel_id",
});
