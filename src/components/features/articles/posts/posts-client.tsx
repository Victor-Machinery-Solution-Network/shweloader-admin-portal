"use client";

import { useState, useCallback, useMemo } from "react";
import { FileText, Plus, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArticleForm } from "./article-form";
import { createPublishedColumns, createPendingColumns } from "./columns";
import { deleteArticles } from "@/lib/actions/article";
import type {
  ArticleWithDetails,
  ArticleCategory,
  ArticleStatusType,
} from "@/types/article";

interface PostsClientProps {
  articles: ArticleWithDetails[];
  categories: ArticleCategory[];
  statusTypes: ArticleStatusType[];
}

export function PostsClient({
  articles,
  categories,
  statusTypes,
}: PostsClientProps) {
  const [showCreate, setShowCreate] = useState(false);

  // Split articles by status
  const publishedArticles = useMemo(
    () =>
      articles.filter(
        (a) => a.status_name === "Published" || a.status_name === "Hidden",
      ),
    [articles],
  );

  const pendingArticles = useMemo(
    () => articles.filter((a) => !a.status_name || a.status_name === "Pending"),
    [articles],
  );

  const pendingCount = pendingArticles.length;

  const publishedColumns = useMemo(
    () => createPublishedColumns(categories, statusTypes),
    [categories, statusTypes],
  );

  const pendingColumns = useMemo(
    () => createPendingColumns(categories, statusTypes),
    [categories, statusTypes],
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
      return `This will permanently delete ${count} ${plural}. This action cannot be undone.`;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: ArticleWithDetails[]) => (
      <>
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          buildDescription={buildDescription}
          itemLabel="article"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Create Post
        </Button>
      </>
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      <Tabs defaultValue="published">
        <TabsList>
          <TabsTrigger value="published">
            <BookOpen className="size-4" />
            Published
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="size-4" />
            Pending
            {pendingCount > 0 && (
              <Badge
                variant="outline"
                className="ml-1 size-5 justify-center border-blue-200 bg-blue-50 p-0 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
              >
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="published">
          {publishedArticles.length > 0 ? (
            <DataTable
              columns={publishedColumns}
              data={publishedArticles}
              searchKey="title"
              searchPlaceholder="Search articles…"
              enableSelection
              enablePagination
              pageSize={10}
              toolbar={renderToolbar}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No published articles yet"
              description="Published articles will appear here."
            />
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pendingArticles.length > 0 ? (
            <DataTable
              columns={pendingColumns}
              data={pendingArticles}
              searchKey="title"
              searchPlaceholder="Search pending articles…"
              enablePagination
              pageSize={10}
            />
          ) : (
            <EmptyState
              icon={Clock}
              title="No pending articles"
              description="All articles have been reviewed."
            />
          )}
        </TabsContent>
      </Tabs>

      <ArticleForm
        open={showCreate}
        onOpenChange={setShowCreate}
        categories={categories}
      />
    </>
  );
}
