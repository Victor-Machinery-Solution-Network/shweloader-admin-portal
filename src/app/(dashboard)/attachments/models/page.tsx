import {
  getCachedAttachmentModels,
  getCachedAttachmentCategories,
  getCachedBrands,
} from "@/lib/cache";
import { AttachmentModelsClient } from "@/components/features/attachments/models/attachment-models-client";

export const metadata = {
  title: "Models | Attachments",
  description: "Manage attachment models",
};

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
