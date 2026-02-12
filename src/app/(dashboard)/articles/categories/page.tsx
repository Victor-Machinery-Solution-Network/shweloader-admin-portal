import { articleCategoryService } from "@/lib/services/article";
import { ArticleCategoriesClient } from "@/components/features/articles/categories/article-categories-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Article Categories",
  description: "Manage article categories",
};

export default async function ArticleCategoriesPage() {
  const categories = await articleCategoryService.list({
    sort_by: "name",
    order: "asc",
  });

  return <ArticleCategoriesClient categories={categories} />;
}
