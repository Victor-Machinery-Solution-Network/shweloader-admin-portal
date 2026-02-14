import { getCachedCarouselsWithImages } from "@/lib/cache";
import { CarouselClient } from "@/components/features/carousel/carousel-client";

export const metadata = {
  title: "Carousel Images",
  description: "Manage carousel images",
};

export default async function CarouselImagesPage() {
  const carousels = await getCachedCarouselsWithImages();

  return <CarouselClient carousels={carousels} />;
}
