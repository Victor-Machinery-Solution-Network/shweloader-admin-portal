import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { getArticleCategories, getArticleStatusTypes } from "@/lib/cache";
import { ArticleEditor } from "@/components/features/articles/posts/article-editor";
import { EditorSkeleton } from "./skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "New Article",
  description: "Create a new article post",
};

export default function NewArticlePage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PermissionGate feature="articles" permission="create">
        <NewArticleContent />
      </PermissionGate>
    </Suspense>
  );
}

async function NewArticleContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.ARTICLE_CATEGORIES);

  const [categories, statusTypes] = await Promise.all([
    getArticleCategories(),
    getArticleStatusTypes(),
  ]);
  return <ArticleEditor categories={categories} statusTypes={statusTypes} />;
}
