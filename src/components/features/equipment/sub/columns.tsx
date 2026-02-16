"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { ImageCell } from "@/components/shared/image-cell";
import { formatDate } from "@/lib/utils";
import type {
  EquipmentSubCategory,
  EquipmentMainCategory,
} from "@/types/equipment";
import { RowActions } from "./row-actions";

/** Extended type with resolved parent category name */
export type SubCategoryRow = EquipmentSubCategory & {
  category_name?: string;
};

export function getColumns(
  categories: EquipmentMainCategory[],
  linkedInfo: Record<number, { total: number; summary: string }>,
): ColumnDef<SubCategoryRow>[] {
  const categoryMap = new Map(categories.map((c) => [c.category_id, c.name]));

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
      accessorKey: "category_id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Main Category" />
      ),
      cell: ({ row }) => {
        const categoryId = row.getValue("category_id") as number;
        return (
          <span>{categoryMap.get(categoryId) ?? `ID: ${categoryId}`}</span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
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
        const info = linkedInfo[row.original.sub_category_id];
        return (
          <RowActions
            subCategory={row.original}
            categories={categories}
            linkedCount={info?.total ?? 0}
            linkedSummary={info?.summary ?? ""}
          />
        );
      },
    },
  ];
}
