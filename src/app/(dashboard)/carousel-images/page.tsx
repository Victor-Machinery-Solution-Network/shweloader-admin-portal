import { carouselService } from "@/lib/services/carousel";
import { getCarouselImages } from "@/lib/actions/carousel";
import { CarouselClient } from "@/components/features/carousel/carousel-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Carousel Images",
  description: "Manage carousel images",
};

export default async function CarouselImagesPage() {
  const carousels = await carouselService.list({
    sort_by: "created_at",
    order: "asc",
  });

  const carouselData = await Promise.all(
    carousels.map(async (carousel) => ({
      carousel,
      images: await getCarouselImages(carousel.carousel_id),
    })),
  );

  return <CarouselClient carousels={carouselData} />;
}
