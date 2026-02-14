import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getArticleCategories } from "@/lib/cache";
import { getArticleCount } from "@/lib/actions/article-category";
import { ArticleCategoriesClient } from "@/components/features/articles/categories/article-categories-client";

export const metadata = {
  title: "Article Categories",
  description: "Manage article categories",
};

export default function ArticleCategoriesPage() {
  return (
    <>
      <PageHeader
        title="Article Categories"
        description="Organize your articles into categories"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <ArticleCategoriesContent />
      </Suspense>
    </>
  );
}

async function ArticleCategoriesContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.ARTICLE_CATEGORIES);

  const categories = await getArticleCategories();
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
