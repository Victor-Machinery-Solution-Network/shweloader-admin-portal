"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FileText, Plus, Clock, BookOpen, FileEdit, XCircle } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";

import { Tabs, TabsList, TabsTrigger, TabsContent, TabCount } from "@/components/ui/tabs";
import { createPublishedColumns, createPendingColumns, createDraftColumns, createReworkColumns } from "./columns";
import { deleteArticles } from "@/lib/actions/article";
import type {
  ArticleWithDetails,
  ArticleStatusType,
} from "@/types/article";

interface PostsClientProps {
  articles: ArticleWithDetails[];
  statusTypes: ArticleStatusType[];
}

export function PostsClient({
  articles,
  statusTypes,
}: PostsClientProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "published";
  const canCreate = useHasPermission("articles", "create");
  const canExport = useHasPermission("articles", "export");
  const canDelete = useHasPermission("articles", "delete");

  // One Create-Post action reused across every tab's empty state, so the button
  // is reachable from any tab when the blog is empty (previously only Drafts had
  // it, which hid it behind a non-default tab).
  const createAction = canCreate ? (
    <Button asChild>
      <Link href="/articles/posts/new">
        <Plus /> Create Post
      </Link>
    </Button>
  ) : undefined;

  // Split articles by status
  const draftArticles = useMemo(
    () => articles.filter((a) => a.status_name === "Draft"),
    [articles],
  );

  const publishedArticles = useMemo(
    () =>
      articles.filter(
        (a) => a.status_name === "Published" || a.status_name === "Hidden",
      ),
    [articles],
  );

  const pendingArticles = useMemo(
    () => articles.filter((a) => a.status_name === "Pending Review"),
    [articles],
  );

  const reworkArticles = useMemo(
    () => articles.filter((a) => a.status_name === "Rework"),
    [articles],
  );

  const draftCount = draftArticles.length;
  const pendingCount = pendingArticles.length;
  const reworkCount = reworkArticles.length;

  const draftColumns = useMemo(() => createDraftColumns(), []);

  const publishedColumns = useMemo(
    () => createPublishedColumns(statusTypes),
    [statusTypes],
  );

  const pendingColumns = useMemo(
    () => createPendingColumns(),
    [],
  );

  const reworkColumns = useMemo(() => createReworkColumns(), []);

  const draftFilterConfig = useMemo<FilterConfig[]>(
    () => [
      { columnId: "category", label: "Category", type: "multi-select" },
      { columnId: "author", label: "Author", type: "multi-select" },
      { columnId: "updated_at", label: "Last Saved", type: "date-range" },
      { columnId: "created_at", label: "Created At", type: "date-range" },
    ],
    [],
  );

  const publishedFilterConfig = useMemo<FilterConfig[]>(
    () => [
      { columnId: "category", label: "Category", type: "multi-select" },
      { columnId: "author", label: "Author", type: "multi-select" },
      { columnId: "publish_date", label: "Published", type: "date-range" },
    ],
    [],
  );

  const pendingFilterConfig = useMemo<FilterConfig[]>(
    () => [
      { columnId: "category", label: "Category", type: "multi-select" },
      { columnId: "author", label: "Author", type: "multi-select" },
      { columnId: "created_at", label: "Created At", type: "date-range" },
    ],
    [],
  );

  const reworkFilterConfig = useMemo<FilterConfig[]>(
    () => [
      { columnId: "category", label: "Category", type: "multi-select" },
      { columnId: "author", label: "Author", type: "multi-select" },
      { columnId: "updated_at", label: "Last Saved", type: "date-range" },
    ],
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: ArticleWithDetails[]) => {
      const ids = selected.map((a) => a.article_id);
      return deleteArticles(ids);
    },
    [],
  );

  const buildDescription = useCallback(
    async (selected: ArticleWithDetails[]) => {
      const count = selected.length;
      const plural = count === 1 ? "article" : "articles";
      return `${count} ${plural} will be moved to the trash. You can restore them within 30 days.`;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: ArticleWithDetails[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="article"
          />
        )}
        {canCreate && (
          <Button asChild className="ml-auto">
            <Link href="/articles/posts/new">
              <Plus /> Create Post
            </Link>
          </Button>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canCreate, canDelete],
  );

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="published">
          <BookOpen className="size-4" />
          Published
        </TabsTrigger>
        <TabsTrigger value="pending">
          <Clock className="size-4" />
          Pending
          {pendingCount > 0 && (
            <TabCount>{pendingCount}</TabCount>
          )}
        </TabsTrigger>
        <TabsTrigger value="drafts">
          <FileEdit className="size-4" />
          Drafts
          {draftCount > 0 && (
            <TabCount>{draftCount}</TabCount>
          )}
        </TabsTrigger>
        <TabsTrigger value="rework">
          <XCircle className="size-4" />
          Rework
          {reworkCount > 0 && (
            <TabCount>{reworkCount}</TabCount>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="drafts">
        {draftArticles.length > 0 ? (
          <DataTable
            columns={draftColumns}
            data={draftArticles}
            searchKeys={["title"]}
            searchPlaceholder="Search drafts"
            filterConfig={draftFilterConfig}
            filterStorageKey="articles-draft-filters"
            enableSelection
            enablePagination
            pageSize={10}
            getRowId={(row) => row.article_id}
            toolbar={renderToolbar}
            enableExport={canExport}
            exportFileName="articles-draft"
          />
        ) : (
          <EmptyState
            icon={FileEdit}
            title="No drafts yet"
            description="Create a new post to start writing."
            fullPage={false}
            action={createAction}
          />
        )}
      </TabsContent>

      <TabsContent value="published">
        {publishedArticles.length > 0 ? (
          <DataTable
            columns={publishedColumns}
            data={publishedArticles}
            searchKeys={["title"]}
            searchPlaceholder="Search articles"
            filterConfig={publishedFilterConfig}
            filterStorageKey="articles-published-filters"
            enableSelection
            enablePagination
            pageSize={10}
            getRowId={(row) => row.article_id}
            toolbar={renderToolbar}
            enableExport={canExport}
            exportFileName="articles-published"
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No published articles yet"
            description="Published articles will appear here."
            fullPage={false}
            action={createAction}
          />
        )}
      </TabsContent>

      <TabsContent value="pending">
        {pendingArticles.length > 0 ? (
          <DataTable
            columns={pendingColumns}
            data={pendingArticles}
            searchKeys={["title"]}
            searchPlaceholder="Search pending articles"
            filterConfig={pendingFilterConfig}
            filterStorageKey="articles-pending-filters"
            enablePagination
            pageSize={10}
            enableExport={canExport}
            exportFileName="articles-pending"
          />
        ) : (
          <EmptyState
            icon={Clock}
            title="No pending articles"
            description="All articles have been reviewed."
            fullPage={false}
            action={createAction}
          />
        )}
      </TabsContent>

      <TabsContent value="rework">
        {reworkArticles.length > 0 ? (
          <DataTable
            columns={reworkColumns}
            data={reworkArticles}
            searchKeys={["title"]}
            searchPlaceholder="Search articles needing rework"
            filterConfig={reworkFilterConfig}
            filterStorageKey="articles-rework-filters"
            enableSelection
            enablePagination
            pageSize={10}
            getRowId={(row) => row.article_id}
            toolbar={renderToolbar}
            enableExport={canExport}
            exportFileName="articles-rework"
          />
        ) : (
          <EmptyState
            icon={XCircle}
            title="No articles need rework"
            description="Articles sent back for rework will appear here."
            fullPage={false}
            action={createAction}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
