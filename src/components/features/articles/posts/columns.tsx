"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { assetUrl } from "@/lib/r2-url";
import { Tag, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useHasPermission } from "@/hooks/use-permissions";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn, formatDate } from "@/lib/utils";
import { updateArticleStatus } from "@/lib/actions/article";
import type { ArticleWithDetails, ArticleStatusType } from "@/types/article";
import { RowActions } from "./row-actions";
import { PendingRowActions } from "./pending-row-actions";

// --- Inline visibility toggle (Published/Hidden status) ---

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
  const canEdit = useHasPermission("articles", "edit");
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
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "size-2 rounded-full",
            isHidden ? "bg-muted-foreground/40" : "bg-emerald-500",
          )}
        />
        <span
          className={cn(
            "text-sm",
            isHidden ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {isHidden ? "Hidden" : "Published"}
        </span>
      </div>
      {canEdit && (
        <Switch
          size="sm"
          checked={!isHidden}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
      )}
    </div>
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
    const src = assetUrl(row.original.cover_image_url);
    return (
      <div className="flex items-center gap-2.5">
        {src ? (
          <img
            src={src}
            alt=""
            className="size-9 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-cyan-500/10">
            <Tag className="size-3.5 text-cyan-500" />
          </div>
        )}
        <span className="font-medium line-clamp-1 max-w-72">{title}</span>
      </div>
    );
  },
};

const categoryColumn: ColumnDef<ArticleWithDetails> = {
  id: "category",
  accessorFn: (row) => row.category_name ?? "",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Category" />
  ),
  cell: ({ row }) => {
    const name = row.original.category_name;
    if (!name) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    return (
      <Badge variant="outline" className="text-xs">
        <Tag className="size-3" />
        {name}
      </Badge>
    );
  },
};

const authorColumn: ColumnDef<ArticleWithDetails> = {
  id: "author",
  accessorFn: (row) => row.author_name ?? "",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Author" />
  ),
  cell: ({ row }) => {
    const author = row.original.author_name;
    if (!author) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    return (
      <div className="flex items-center gap-1.5">
        <UserRound className="size-3.5 text-muted-foreground" />
        <span className="text-sm">{author}</span>
      </div>
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
      <span className="text-muted-foreground text-sm tabular-nums">{formatDate(date)}</span>
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
      <span className="text-muted-foreground text-sm tabular-nums">{formatDate(date)}</span>
    );
  },
};

const updatedAtColumn: ColumnDef<ArticleWithDetails> = {
  accessorKey: "updated_at",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Last Saved" />
  ),
  cell: ({ row }) => {
    const date = row.getValue("updated_at") as string;
    return (
      <span className="text-muted-foreground text-sm tabular-nums">{formatDate(date)}</span>
    );
  },
};

const readTimeColumn: ColumnDef<ArticleWithDetails> = {
  accessorKey: "estimated_read_time",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Read Time" />
  ),
  cell: ({ row }) => {
    const minutes = row.getValue("estimated_read_time") as number | null;
    if (!minutes) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    return (
      <span className="text-muted-foreground text-sm tabular-nums">
        {minutes} min read
      </span>
    );
  },
};

// ─── Published tab columns ──────────────────────────────────────────────────

export function createPublishedColumns(
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
    readTimeColumn,
    publishDateColumn,
    {
      id: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      accessorFn: (row) => row.status_name,
      cell: ({ row }) => {
        const statusName = row.original.status_name;
        const showToggle =
          publishedStatus &&
          hiddenStatus &&
          (statusName === "Published" || statusName === "Hidden");

        if (!showToggle) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }

        return (
          <VisibilityToggle
            articleId={row.original.article_id}
            isHidden={statusName === "Hidden"}
            publishedStatusId={publishedStatus.id}
            hiddenStatusId={hiddenStatus.id}
          />
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <RowActions article={row.original} />,
    },
  ];
}

// ─── Pending tab columns ────────────────────────────────────────────────────

export function createPendingColumns(): ColumnDef<ArticleWithDetails>[] {
  return [
    titleColumn,
    categoryColumn,
    authorColumn,
    readTimeColumn,
    createdAtColumn,
    {
      id: "actions",
      cell: ({ row }) => <PendingRowActions article={row.original} />,
    },
  ];
}

// ─── Draft tab columns ─────────────────────────────────────────────────────

export function createDraftColumns(): ColumnDef<ArticleWithDetails>[] {
  return [
    titleColumn,
    categoryColumn,
    authorColumn,
    readTimeColumn,
    updatedAtColumn,
    createdAtColumn,
    {
      id: "actions",
      cell: ({ row }) => <RowActions article={row.original} />,
    },
  ];
}

// ─── Rework tab columns ───────────────────────────────────────────────────

const reworkReasonColumn: ColumnDef<ArticleWithDetails> = {
  accessorKey: "rejection_reason",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Reason" />
  ),
  cell: ({ row }) => {
    const reason = row.getValue("rejection_reason") as string | null;
    if (!reason) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    return (
      <span className="text-sm text-muted-foreground line-clamp-2 max-w-60">{reason}</span>
    );
  },
};

export function createReworkColumns(): ColumnDef<ArticleWithDetails>[] {
  return [
    titleColumn,
    categoryColumn,
    authorColumn,
    reworkReasonColumn,
    updatedAtColumn,
    {
      id: "actions",
      cell: ({ row }) => <RowActions article={row.original} />,
    },
  ];
}
