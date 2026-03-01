"use client";

import { useState, useCallback, useMemo } from "react";
import { ChevronDown, FileSpreadsheet, FileText, Layers, Plus } from "lucide-react";
import Link from "next/link";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { CategoryForm } from "./category-form";
import { getColumns } from "./columns";
import {
  deleteMainCategories,
  getSubCategoryCount,
} from "@/lib/actions/equipment";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import type { EquipmentMainCategory } from "@/types/equipment";

interface MainCategoriesClientProps {
  categories: EquipmentMainCategory[];
  linkedCounts: Record<number, number>;
}

export function MainCategoriesClient({
  categories,
  linkedCounts,
}: MainCategoriesClientProps) {
  const canCreate = useHasPermission("equipment_main_categories", "create");
  const canDelete = useHasPermission("equipment_main_categories", "delete");
  const [showCreate, setShowCreate] = useState(false);
  const { data, handleReorder, handleMoveToPosition } = useDragReorder(
    categories,
    {
      getRowId: (r) => r.category_id,
      tableName: "equipment_main_category",
      feature: "equipment_main_categories",
    },
  );
  const columns = useMemo(() => getColumns(linkedCounts), [linkedCounts]);

  const filterConfig = useMemo<FilterConfig[]>(
    () => [{ columnId: "created_at", label: "Created", type: "date-range" }],
    [],
  );

  const buildDescription = useCallback(
    async (selected: EquipmentMainCategory[]) => {
      const ids = selected.map((c) => c.category_id);
      const counts = await getSubCategoryCount(ids);
      const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

      const names = selected.map((c) => `"${c.name}"`).join(", ");
      let msg = `${selected.length === 1 ? names : `${selected.length} categories (${names})`} will be moved to the trash.`;

      if (totalLinked > 0) {
        msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} sub ${totalLinked === 1 ? "category" : "categories"} linked to ${selected.length === 1 ? "this category" : "these categories"} that must be removed first.`;
      }

      return msg;
    },
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: EquipmentMainCategory[]) => {
      const ids = selected.map((c) => c.category_id);
      return deleteMainCategories(ids);
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: EquipmentMainCategory[]) => (
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
                <Plus /> Add Category <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreate(true)}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/equipment-main-categories">
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
      {data.length > 0 ? (
        <DataTable
          columns={columns}
          data={data}
          searchKeys={["name"]}
          searchPlaceholder="Search categories"
          filterConfig={filterConfig}
          filterStorageKey="equipment-main-filters"
          enableSelection
          enablePagination
          enableDragSort
          getRowId={(row) => row.category_id}
          onReorder={handleReorder}
          onMoveToPosition={handleMoveToPosition}
          pageSize={10}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Layers}
          title="No categories yet"
          description="Get started by creating your first equipment main category."
          action={
            canCreate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus /> Add Category <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => setShowCreate(true)}>
                    <FileText /> Fill Form
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bulk-upload/equipment-main-categories">
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
