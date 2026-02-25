"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, FileText, FileSpreadsheet, FolderOpen, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FilterConfig } from "@/types/data-table-filters";
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
  const canCreate = useHasPermission("article_categories", "create");
  const canDelete = useHasPermission("article_categories", "delete");
  const [showCreate, setShowCreate] = useState(false);
  const columns = useMemo(() => getColumns(linkedCounts), [linkedCounts]);

  const filterConfig = useMemo<FilterConfig[]>(
    () => [{ columnId: "created_at", label: "Created", type: "date-range" }],
    [],
  );

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
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="category"
          />
        )}
        {canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus /> Create Category <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreate(true)}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/article-categories">
                  <FileSpreadsheet /> Excel Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canCreate, canDelete],
  );

  return (
    <>
      {categories.length > 0 ? (
        <DataTable
          columns={columns}
          data={categories}
          searchKeys={["name"]}
          searchPlaceholder="Search categories"
          filterConfig={filterConfig}
          filterStorageKey="article-categories-filters"
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
            canCreate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus /> Create Category <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => setShowCreate(true)}>
                    <FileText /> Fill Form
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bulk-upload/article-categories">
                      <FileSpreadsheet /> Excel Upload
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
      )}

      <CategoryForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
