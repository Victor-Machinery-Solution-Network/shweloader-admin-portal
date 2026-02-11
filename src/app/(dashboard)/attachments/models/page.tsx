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

export default async function AttachmentModelsPage() {
  const [models, categories, brands] = await Promise.all([
    attachmentModelService.list({ sort_by: "name", order: "asc" }),
    attachmentCategoryService.list({ sort_by: "name", order: "asc" }),
    brandService.list({ sort_by: "name", order: "asc" }),
  ]);

  return (
    <AttachmentModelsClient
      models={models}
      categories={categories}
      brands={brands}
    />
  );
}
