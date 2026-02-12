import { unstable_cache } from "next/cache";
import {
  attachmentModelService,
  attachmentCategoryService,
} from "@/lib/services/attachment";
import { brandService } from "@/lib/services/brand";
import { AttachmentModelsClient } from "@/components/features/attachments/models/attachment-models-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Models | Attachments",
  description: "Manage attachment models",
};

const getCachedAttachmentModels = unstable_cache(
  () => attachmentModelService.list({ sort_by: "name", order: "asc" }),
  ["attachment-models-list"],
  { revalidate: 120, tags: ["attachment-models"] },
);

const getCachedAttachmentCategories = unstable_cache(
  () => attachmentCategoryService.list({ sort_by: "name", order: "asc" }),
  ["attachment-categories-list"],
  { revalidate: 300, tags: ["attachment-categories"] },
);

const getCachedBrands = unstable_cache(
  () => brandService.list({ sort_by: "name", order: "asc" }),
  ["brands-list"],
  { revalidate: 300, tags: ["brands"] },
);

export default async function AttachmentModelsPage() {
  const [models, categories, brands] = await Promise.all([
    getCachedAttachmentModels(),
    getCachedAttachmentCategories(),
    getCachedBrands(),
  ]);

  return (
    <AttachmentModelsClient
      models={models}
      categories={categories}
      brands={brands}
    />
  );
}
