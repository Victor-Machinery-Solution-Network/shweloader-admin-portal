"use client";

import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateArticleStatus } from "@/lib/actions/article";
import { ArticleForm } from "./article-form";
import type {
  ArticleWithDetails,
  ArticleCategory,
  ArticleStatusType,
} from "@/types/article";

interface PendingRowActionsProps {
  article: ArticleWithDetails;
  categories: ArticleCategory[];
  statusTypes: ArticleStatusType[];
}

export function PendingRowActions({
  article,
  categories,
  statusTypes,
}: PendingRowActionsProps) {
  const [showView, setShowView] = useState(false);
  const [isPending, startTransition] = useTransition();

  const publishedStatus = statusTypes.find(
    (st) => st.status_name === "Published",
  );

  function handlePublish() {
    if (!publishedStatus) return;
    startTransition(async () => {
      const result = await updateArticleStatus(
        article.article_id,
        publishedStatus.id,
      );
      if (result.success) {
        toast.success("Article published");
        setShowView(false);
      } else {
        toast.error(result.error ?? "Failed to publish");
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowView(true)}>
        <ExternalLink className="size-4" />
        View
      </Button>

      <ArticleForm
        open={showView}
        onOpenChange={setShowView}
        article={article}
        categories={categories}
        onPublish={handlePublish}
        isPublishing={isPending || !publishedStatus}
      />
    </>
  );
}
