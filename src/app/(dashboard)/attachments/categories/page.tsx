import { attachmentCategoryService } from "@/lib/services/attachment";
import { AttachmentCategoriesClient } from "@/components/features/attachments/categories/attachment-categories-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categories | Attachments",
  description: "Manage attachment categories",
};

export default async function AttachmentCategoriesPage() {
  const categories = await attachmentCategoryService.list({
    sort_by: "display_order",
    order: "asc",
  });

  return <AttachmentCategoriesClient categories={categories} />;
}
