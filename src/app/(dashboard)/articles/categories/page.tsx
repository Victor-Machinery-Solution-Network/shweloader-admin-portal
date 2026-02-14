import { getCachedArticleCategories } from "@/lib/cache";
import { getArticleCount } from "@/lib/actions/article-category";
import { ArticleCategoriesClient } from "@/components/features/articles/categories/article-categories-client";

export const metadata = {
  title: "Article Categories",
  description: "Manage article categories",
};

export default async function ArticleCategoriesPage() {
  const categories = await getCachedArticleCategories();
  const linkedCounts = await getArticleCount(
    categories.map((c) => c.category_id),
  );

  return (
    <ArticleCategoriesClient
      categories={categories}
      linkedCounts={linkedCounts}
    />
  );
}
