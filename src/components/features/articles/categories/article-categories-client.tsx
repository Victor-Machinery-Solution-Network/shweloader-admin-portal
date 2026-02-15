"use client";

import { useState, useCallback, useMemo } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { CategoryForm } from "./category-form";
import { getColumns } from "./columns";
import { deleteArticleCategories } from "@/lib/actions/article-category";
import type { ArticleCategory } from "@/types/article";

interface ArticleCategoriesClientProps {
  categories: ArticleCategory[];
  linkedCounts: Record<number, number>;
}

export function ArticleCategoriesClient({
  categories,
  linkedCounts,
}: ArticleCategoriesClientProps) {
  const [showCreate, setShowCreate] = useState(false);
  const columns = useMemo(() => getColumns(linkedCounts), [linkedCounts]);

  const handleBulkDelete = useCallback(async (selected: ArticleCategory[]) => {
    const ids = selected.map((c) => c.category_id);
    return deleteArticleCategories(ids);
  }, []);

  const buildDescription = useCallback(async (selected: ArticleCategory[]) => {
    const count = selected.length;
    const plural = count === 1 ? "category" : "categories";
    return `This will permanently delete ${count} ${plural}. This action cannot be undone.`;
  }, []);

  const renderToolbar = useCallback(
    (selected: ArticleCategory[]) => (
      <>
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          buildDescription={buildDescription}
          itemLabel="category"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Create Category
        </Button>
      </>
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      {categories.length > 0 ? (
        <DataTable
          columns={columns}
          data={categories}
          searchKey="name"
          searchPlaceholder="Search categories"
          enableSelection
          enablePagination
          pageSize={10}
          getRowId={(row) => row.category_id}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="No categories yet"
          description="Get started by creating your first article category."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Create Category
            </Button>
          }
        />
      )}

      <CategoryForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
