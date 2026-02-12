import { unstable_cache } from "next/cache";
import { attachmentCategoryService } from "@/lib/services/attachment";
import { AttachmentCategoriesClient } from "@/components/features/attachments/categories/attachment-categories-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categories | Attachments",
  description: "Manage attachment categories",
};

const getCachedAttachmentCategories = unstable_cache(
  () => attachmentCategoryService.list({ sort_by: "display_order", order: "asc" }),
  ["attachment-categories-list"],
  { revalidate: 300, tags: ["attachment-categories"] },
);

export default async function AttachmentCategoriesPage() {
  const categories = await getCachedAttachmentCategories();

  return <AttachmentCategoriesClient categories={categories} />;
}
