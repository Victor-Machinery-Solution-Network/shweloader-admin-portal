import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getArticleById,
  getArticleCategories,
  getArticleStatusTypes,
} from "@/lib/cache";
import { ArticleEditor } from "@/components/features/articles/posts/article-editor";
import { EditorSkeleton } from "../../new/skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "Edit Article",
  description: "Edit an existing article post",
};

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PermissionGate feature="articles">
        <EditArticleContent params={params} />
      </PermissionGate>
    </Suspense>
  );
}

async function EditArticleContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [article, categories, statusTypes] = await Promise.all([
    getArticleById(Number(id)),
    getArticleCategories(),
    getArticleStatusTypes(),
  ]);

  if (!article) notFound();

  return (
    <ArticleEditor
      article={article}
      categories={categories}
      statusTypes={statusTypes}
    />
  );
}
