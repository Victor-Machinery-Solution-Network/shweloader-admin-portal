"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
): ColumnDef<SubCategoryRow>[] {
  const categoryMap = new Map(categories.map((c) => [c.category_id, c.name]));

  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        const imageUrl = row.original.image_url;
        return (
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
              <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{name}</span>
          </div>
        );
      },
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
      cell: ({ row }) => (
        <RowActions subCategory={row.original} categories={categories} />
      ),
    },
  ];
}
