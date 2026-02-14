import { getCachedAttachmentCategories } from "@/lib/cache";
import {
  getAttachmentCategoryLinkedCounts,
  formatAttachmentCategoryLinkedSummary,
} from "@/lib/actions/attachment";
import { AttachmentCategoriesClient } from "@/components/features/attachments/categories/attachment-categories-client";


export const metadata = {
  title: "Categories | Attachments",
  description: "Manage attachment categories",
};

export default async function AttachmentCategoriesPage() {
  const categories = await getCachedAttachmentCategories();

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
