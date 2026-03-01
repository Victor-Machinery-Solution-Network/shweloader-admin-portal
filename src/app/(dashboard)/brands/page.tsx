import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { BrandCardSkeleton } from "@/components/shared/loading-skeleton";
import { getBrandsPageData } from "@/lib/actions/brand";
import { BrandsClient } from "@/components/features/brands/brands-client";
import { PermissionGate } from "@/components/shared/permission-gate";


export const metadata = {
  title: "Brands",
  description: "Manage equipment & attachment mappings",
};

export default function BrandsPage() {
  return (
    <>
      <PageHeader title="Brands" description="Manage equipment & attachment mappings" />
      <Suspense fallback={<BrandCardSkeleton />}>
        <PermissionGate feature="brands">
          <BrandsContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function BrandsContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(
    CACHE_TAGS.BRANDS,
    CACHE_TAGS.ATTACHMENT_CATEGORIES,
    CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES,
    CACHE_TAGS.EQUIPMENT_MAIN_CATEGORIES,
  );

  const { brands, categories, subCategories, mainCategories, linkedInfo } =
    await getBrandsPageData();

  return (
    <BrandsClient
      brands={brands}
      categories={categories}
      subCategories={subCategories}
      mainCategories={mainCategories}
      linkedInfo={linkedInfo}
    />
  );
}
