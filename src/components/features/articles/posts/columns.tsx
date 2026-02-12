"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { updateArticleStatus } from "@/lib/actions/article";
import type { ArticleWithDetails } from "@/types/article";
import type { ArticleCategory, ArticleStatusType } from "@/types/article";
import { RowActions } from "./row-actions";
import { PendingRowActions } from "./pending-row-actions";

// --- Inline visibility toggle (matches listing HiddenToggle pattern) ---

function VisibilityToggle({
  articleId,
  isHidden,
  publishedStatusId,
  hiddenStatusId,
}: {
  articleId: number;
  isHidden: boolean;
  publishedStatusId: number;
  hiddenStatusId: number;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const targetId = isHidden ? publishedStatusId : hiddenStatusId;
    startTransition(async () => {
      const result = await updateArticleStatus(articleId, targetId);
      if (result.success) {
        toast.success(isHidden ? "Article published" : "Article hidden");
      } else {
        toast.error(result.error ?? "Failed to update");
      }
    });
  }

  return (
    <Button
      variant={isHidden ? "destructive" : "outline"}
      size="icon-sm"
      disabled={isPending}
      title={isHidden ? "Publish article" : "Hide article"}
      className={
        isHidden
          ? "rounded-full"
          : "text-muted-foreground rounded-full border-dashed"
      }
      onClick={handleToggle}
    >
      {isHidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </Button>
  );
}

// ─── Shared column helpers ───────────────────────────────────────────────────

const titleColumn: ColumnDef<ArticleWithDetails> = {
  accessorKey: "title",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Title" />
  ),
  cell: ({ row }) => {
    const title = row.getValue("title") as string;
    return <span className="font-medium line-clamp-1 max-w-72">{title}</span>;
  },
};

const categoryColumn: ColumnDef<ArticleWithDetails> = {
  id: "category",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Category" />
  ),
  cell: ({ row }) => {
    const name = row.original.category_name;
    if (!name) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    return (
      <Badge variant="secondary" className="text-xs">
        {name}
      </Badge>
    );
  },
};

const authorColumn: ColumnDef<ArticleWithDetails> = {
  id: "author",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Author" />
  ),
  cell: ({ row }) => {
    const author = row.original.author_name;
    return (
      <span className="text-muted-foreground text-sm">{author ?? "—"}</span>
    );
  },
};

const publishDateColumn: ColumnDef<ArticleWithDetails> = {
  accessorKey: "publish_date",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Publish Date" />
  ),
  cell: ({ row }) => {
    const date = row.getValue("publish_date") as string | null;
    if (!date) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    return (
      <span className="text-muted-foreground text-sm">{formatDate(date)}</span>
    );
  },
};

const createdAtColumn: ColumnDef<ArticleWithDetails> = {
  accessorKey: "created_at",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Created" />
  ),
  cell: ({ row }) => {
    const date = row.getValue("created_at") as string;
    return (
      <span className="text-muted-foreground text-sm">{formatDate(date)}</span>
    );
  },
};

// ─── Published tab columns ──────────────────────────────────────────────────

export function createPublishedColumns(
  categories: ArticleCategory[],
  statusTypes: ArticleStatusType[],
): ColumnDef<ArticleWithDetails>[] {
  const publishedStatus = statusTypes.find(
    (st) => st.status_name === "Published",
  );
  const hiddenStatus = statusTypes.find((st) => st.status_name === "Hidden");

  return [
    titleColumn,
    categoryColumn,
    authorColumn,
    publishDateColumn,
    createdAtColumn,
    {
      id: "actions",
      cell: ({ row }) => {
        const statusName = row.original.status_name;
        const showToggle =
          publishedStatus &&
          hiddenStatus &&
          (statusName === "Published" || statusName === "Hidden");

        return (
          <div className="flex items-center justify-end gap-1">
            {showToggle && (
              <VisibilityToggle
                articleId={row.original.article_id}
                isHidden={statusName === "Hidden"}
                publishedStatusId={publishedStatus.id}
                hiddenStatusId={hiddenStatus.id}
              />
            )}
            <RowActions article={row.original} categories={categories} />
          </div>
        );
      },
    },
  ];
}

// ─── Pending tab columns ────────────────────────────────────────────────────

export function createPendingColumns(
  categories: ArticleCategory[],
  statusTypes: ArticleStatusType[],
): ColumnDef<ArticleWithDetails>[] {
  return [
    titleColumn,
    categoryColumn,
    authorColumn,
    createdAtColumn,
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <PendingRowActions
            article={row.original}
            categories={categories}
            statusTypes={statusTypes}
          />
          <RowActions article={row.original} categories={categories} />
        </div>
      ),
    },
  ];
}
