"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { RowActions } from "./row-actions";
import type { EquipmentModel, EquipmentSubCategory } from "@/types/equipment";
import type { ProductBrand } from "@/types/brand";

export function createColumns(
  subCategories: EquipmentSubCategory[],
  brands: ProductBrand[],
): ColumnDef<EquipmentModel>[] {
  const subCategoryMap = new Map(
    subCategories.map((sc) => [sc.sub_category_id, sc.name]),
  );
  const brandMap = new Map(brands.map((b) => [b.brand_id, b.name]));

  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return <span className="font-medium">{name}</span>;
      },
    },
    {
      id: "sub_category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sub Category" />
      ),
      cell: ({ row }) => {
        const name =
          subCategoryMap.get(row.original.sub_category_id) ??
          `#${row.original.sub_category_id}`;
        return (
          <Badge variant="secondary" className="text-xs">
            {name}
          </Badge>
        );
      },
    },
    {
      id: "brand",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Brand" />
      ),
      cell: ({ row }) => {
        if (!row.original.brand_id) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        const name =
          brandMap.get(row.original.brand_id) ?? `#${row.original.brand_id}`;
        return (
          <Badge variant="outline" className="text-xs">
            {name}
          </Badge>
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
          <span className="text-muted-foreground text-sm">
            {formatDate(date)}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActions
          model={row.original}
          subCategories={subCategories}
          brands={brands}
        />
      ),
    },
  ];
}
