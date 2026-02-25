import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import {
  getAttachmentModels,
  getAttachmentCategories,
  getBrands,
  getCategoryBrandLinks,
} from "@/lib/cache";
import { AttachmentModelsClient } from "@/components/features/attachments/models/attachment-models-client";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "Models | Attachments",
  description: "Manage attachment models",
};

export default function AttachmentModelsPage() {
  return (
    <>
      <PageHeader
        title="Attachment Models"
        description="Manage attachment models"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="attachment_models">
          <AttachmentModelsContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function AttachmentModelsContent() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(CACHE_TAGS.ATTACHMENT_MODELS, CACHE_TAGS.ATTACHMENT_CATEGORIES, CACHE_TAGS.BRANDS);

  const [models, categories, brands, categoryBrandLinks] = await Promise.all([
    getAttachmentModels(),
    getAttachmentCategories(),
    getBrands(),
    getCategoryBrandLinks(),
  ]);

  return (
    <AttachmentModelsClient
      models={models}
      categories={categories}
      brands={brands}
      categoryBrandLinks={categoryBrandLinks}
    />
  );
}
