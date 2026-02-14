import { getCachedAttachmentCategories } from "@/lib/cache";
import { AttachmentCategoriesClient } from "@/components/features/attachments/categories/attachment-categories-client";


export const metadata = {
  title: "Categories | Attachments",
  description: "Manage attachment categories",
};

export default async function AttachmentCategoriesPage() {
  const categories = await getCachedAttachmentCategories();

  return <AttachmentCategoriesClient categories={categories} />;
}
