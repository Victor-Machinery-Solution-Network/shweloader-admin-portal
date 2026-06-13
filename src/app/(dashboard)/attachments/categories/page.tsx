import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getAttachmentCategoriesPageData } from "@/lib/actions/attachment";
import { AttachmentCategoriesClient } from "@/components/features/attachments/categories/attachment-categories-client";
import { PermissionGate } from "@/components/shared/permission-gate";


export const metadata = {
  title: "Categories | Attachments",
  description: "Manage attachment categories",
};

export default function AttachmentCategoriesPage() {
  return (
    <>
      <PageHeader
        title="Attachment Categories"
        description="Manage attachment categories"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="attachment_categories">
          <AttachmentCategoriesContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function AttachmentCategoriesContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(
    CACHE_TAGS.ATTACHMENT_CATEGORIES,
    CACHE_TAGS.EQUIPMENT_SUB_CATEGORIES,
  );

  const { categories, subCategories, linkedInfo } =
    await getAttachmentCategoriesPageData();

  return (
    <AttachmentCategoriesClient
      categories={categories}
      subCategories={subCategories}
      linkedInfo={linkedInfo}
    />
  );
}
