import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { getListingDetail, getListingImages } from "@/lib/cache";
import { ListingDetailView } from "@/components/features/listings/detail/listing-detail-view";
import { ListingDetailSkeleton } from "@/components/features/listings/detail/listing-detail-skeleton";

export const metadata = {
  title: "Listing Details",
  description: "View listing details",
};

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ListingDetailSkeleton />}>
      <ListingDetailContent params={params} />
    </Suspense>
  );
}

async function ListingDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(CACHE_TAGS.SALE_LISTINGS, CACHE_TAGS.RENT_LISTINGS);

  const { id } = await params;
  const productListId = Number(id);
  if (isNaN(productListId) || productListId <= 0) notFound();

  const listing = await getListingDetail(productListId);
  if (!listing) notFound();

  const images = await getListingImages(listing.product_list_id);

  return <ListingDetailView listing={listing} images={images} />;
}
