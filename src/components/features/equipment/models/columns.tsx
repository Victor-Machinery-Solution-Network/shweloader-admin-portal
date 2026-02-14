"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { RowActions } from "./row-actions";
import type { EquipmentModel, EquipmentMainCategory, EquipmentSubCategory } from "@/types/equipment";
import type { ProductBrand } from "@/types/brand";

export function createColumns(
  mainCategories: EquipmentMainCategory[],
  subCategories: EquipmentSubCategory[],
  brands: ProductBrand[],
  subCategoryBrandLinks: { sub_category_id: number; brand_id: number }[],
): ColumnDef<EquipmentModel>[] {
  const mainCategoryMap = new Map(
    mainCategories.map((mc) => [mc.category_id, mc.name]),
  );
  const subCategoryMap = new Map(
    subCategories.map((sc) => [sc.sub_category_id, sc]),
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
      id: "main_category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Main Category" />
      ),
      cell: ({ row }) => {
        const sc = subCategoryMap.get(row.original.sub_category_id);
        const name = sc
          ? (mainCategoryMap.get(sc.category_id) ?? `#${sc.category_id}`)
          : "—";
        return (
          <Badge variant="outline" className="text-xs">
            {name}
          </Badge>
        );
      },
    },
    {
      id: "sub_category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sub Category" />
      ),
      cell: ({ row }) => {
        const sc = subCategoryMap.get(row.original.sub_category_id);
        const name = sc?.name ?? `#${row.original.sub_category_id}`;
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
          <span className="text-muted-foreground text-sm tabular-nums">
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
          subCategoryBrandLinks={subCategoryBrandLinks}
        />
      ),
    },
  ];
}
