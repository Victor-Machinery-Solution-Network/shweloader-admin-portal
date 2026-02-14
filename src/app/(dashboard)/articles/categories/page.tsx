import { getCachedArticleCategories } from "@/lib/cache";
import { ArticleCategoriesClient } from "@/components/features/articles/categories/article-categories-client";

export const metadata = {
  title: "Article Categories",
  description: "Manage article categories",
};

export default async function ArticleCategoriesPage() {
  const categories = await getCachedArticleCategories();

  return <ArticleCategoriesClient categories={categories} />;
}
