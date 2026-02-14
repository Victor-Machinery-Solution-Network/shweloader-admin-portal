import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getAttachmentCategories } from "@/lib/cache";
import {
  getAttachmentCategoryLinkedCounts,
  formatAttachmentCategoryLinkedSummary,
} from "@/lib/actions/attachment";
import { AttachmentCategoriesClient } from "@/components/features/attachments/categories/attachment-categories-client";


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
        <AttachmentCategoriesContent />
      </Suspense>
    </>
  );
}

async function AttachmentCategoriesContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.ATTACHMENT_CATEGORIES);

  const categories = await getAttachmentCategories();

  const countsMap = await getAttachmentCategoryLinkedCounts(
    categories.map((c) => c.category_id),
  );

  const linkedInfo: Record<number, { total: number; summary: string }> = {};
  for (const [id, c] of Object.entries(countsMap)) {
    linkedInfo[Number(id)] = {
      total: c.total,
      summary: c.total > 0 ? await formatAttachmentCategoryLinkedSummary(c) : "",
    };
  }

  return (
    <AttachmentCategoriesClient
      categories={categories}
      linkedInfo={linkedInfo}
    />
  );
}
