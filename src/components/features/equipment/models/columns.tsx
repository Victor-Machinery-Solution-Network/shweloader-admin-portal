"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
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
      id: "brand",
      accessorFn: (row) => (row.brand_id ? (brandMap.get(row.brand_id) ?? "") : ""),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Brand" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("brand") as string;
        return name
          ? <span className="text-sm">{name}</span>
          : <span className="text-muted-foreground text-sm">—</span>;
      },
    },
    {
      id: "main_category",
      accessorFn: (row) => {
        const sc = subCategoryMap.get(row.sub_category_id);
        return sc ? (mainCategoryMap.get(sc.category_id) ?? "") : "";
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Main Category" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("main_category") || "—"}</span>
      ),
    },
    {
      id: "sub_category",
      accessorFn: (row) => {
        const sc = subCategoryMap.get(row.sub_category_id);
        return sc?.name ?? "";
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sub Category" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("sub_category") || "—"}</span>
      ),
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
          mainCategories={mainCategories}
          subCategories={subCategories}
          brands={brands}
          subCategoryBrandLinks={subCategoryBrandLinks}
        />
      ),
    },
  ];
}
