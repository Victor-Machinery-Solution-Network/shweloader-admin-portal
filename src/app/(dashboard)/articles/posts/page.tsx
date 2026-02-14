import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import {
  getArticlesWithDetails,
  getArticleCategories,
  getArticleStatusTypes,
} from "@/lib/cache";
import { PostsClient } from "@/components/features/articles/posts/posts-client";

export const metadata = {
  title: "Posts",
  description: "Manage article posts",
};

export default function PostsPage() {
  return (
    <>
      <PageHeader
        title="Posts"
        description="Manage article posts for the website"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PostsContent />
      </Suspense>
    </>
  );
}

async function PostsContent() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(CACHE_TAGS.ARTICLES, CACHE_TAGS.ARTICLE_CATEGORIES);

  const [articles, categories, statusTypes] = await Promise.all([
    getArticlesWithDetails(),
    getArticleCategories(),
    getArticleStatusTypes(),
  ]);

  return (
    <PostsClient
      articles={articles}
      categories={categories}
      statusTypes={statusTypes}
    />
  );
}
