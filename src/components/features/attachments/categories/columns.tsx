"use client";

import { Box, Folder } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { ImageCell } from "@/components/shared/image-cell";
import { formatDate } from "@/lib/utils";
import type { AttachmentCategoryWithSubCategories } from "@/types/attachment";
import type { EquipmentSubCategory } from "@/types/equipment";
import { RowActions } from "./row-actions";

export function getColumns(
  linkedInfo: Record<number, { total: number; summary: string }>,
  subCategories: EquipmentSubCategory[],
): ColumnDef<AttachmentCategoryWithSubCategories>[] {
  const subCategoryNameMap = new Map(
    subCategories.map((sc) => [sc.sub_category_id, sc.name]),
  );
  /** Resolve a category's tagged sub-category IDs to their names (ordered). */
  const subCategoryNames = (row: AttachmentCategoryWithSubCategories) =>
    row.subCategoryIds
      .map((id) => subCategoryNameMap.get(id))
      .filter((name): name is string => Boolean(name));

  return [
    {
      id: "index",
      header: () => <span className="block text-center">No.</span>,
      cell: ({ row }) => (
        <span className="text-muted-foreground block text-center text-sm tabular-nums">
          {row.index + 1}
        </span>
      ),
      size: 40,
      minSize: 40,
      maxSize: 40,
      enableSorting: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <ImageCell
          name={row.getValue("name") as string}
          imageUrl={row.original.image_url}
        />
      ),
    },
    {
      id: "subcategories",
      // Return the array of tagged sub-category names so the multi-select
      // filter (array-aware) can match on any selected sub-category.
      accessorFn: (row) => subCategoryNames(row),
      enableSorting: false,
      meta: {
        exportValue: (row: { original: AttachmentCategoryWithSubCategories }) =>
          subCategoryNames(row.original).join(", "),
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Equipment Subcategory" />
      ),
      cell: ({ row }) => {
        const names = subCategoryNames(row.original);
        if (names.length === 0) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <div className="flex flex-col gap-0.5">
            {names.map((name) => (
              <span key={name} className="flex items-center gap-1.5 text-sm">
                <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                {name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: "models",
      accessorFn: (row) => linkedInfo[row.category_id]?.total ?? 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Models" />
      ),
      cell: ({ row }) => {
        const count = row.getValue("models") as number;
        return (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
            <Box className="size-3.5" />
            {count}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" />
      ),
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string;
        return (
          <span className="text-muted-foreground text-sm tabular-nums">
            {formatDate(date)}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const info = linkedInfo[row.original.category_id];
        return (
          <RowActions
            category={row.original}
            subCategories={subCategories}
            linkedCount={info?.total ?? 0}
            linkedSummary={info?.summary ?? ""}
          />
        );
      },
    },
  ];
}
