"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArticleWithDetails } from "@/types/article";

interface PendingRowActionsProps {
  article: ArticleWithDetails;
}

export function PendingRowActions({ article }: PendingRowActionsProps) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/articles/posts/${article.article_id}/edit`}>
        <ExternalLink className="size-4" />
        View
      </Link>
    </Button>
  );
}
