import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getCarouselsWithImages } from "@/lib/cache";
import { CarouselClient } from "@/components/features/carousel/carousel-client";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "Carousel Images",
  description: "Manage carousel images",
};

export default function CarouselImagesPage() {
  return (
    <>
      <PageHeader
        title="Carousel Images"
        description="Manage carousel slideshows for the website"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="carousels">
          <CarouselContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function CarouselContent() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(CACHE_TAGS.CAROUSELS);

  const carousels = await getCarouselsWithImages();

  return <CarouselClient carousels={carousels} />;
}
