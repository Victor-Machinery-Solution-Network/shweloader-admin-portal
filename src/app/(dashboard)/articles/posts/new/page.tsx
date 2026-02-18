import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { getArticleCategories } from "@/lib/cache";
import { ArticleEditor } from "@/components/features/articles/posts/article-editor";
import { EditorSkeleton } from "./skeleton";

export const metadata = {
  title: "New Article",
  description: "Create a new article post",
};

export default function NewArticlePage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <NewArticleContent />
    </Suspense>
  );
}

async function NewArticleContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.ARTICLE_CATEGORIES);

  const categories = await getArticleCategories();
  return <ArticleEditor categories={categories} />;
}
