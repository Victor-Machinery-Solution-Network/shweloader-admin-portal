"use client";

import { Wrench, Tag, Folder, FolderOpen, FileText } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import { assetUrl } from "@/lib/r2-url";
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
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
            <Wrench className="size-3.5 text-blue-500" />
          </div>
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      id: "brand",
      accessorFn: (row) => (row.brand_id ? (brandMap.get(row.brand_id) ?? "") : ""),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Brand" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("brand") as string;
        return name ? (
          <span className="flex items-center gap-1.5 text-sm">
            <Tag className="size-3.5 text-muted-foreground" />
            {name}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
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
      cell: ({ row }) => {
        const name = row.getValue("main_category") as string;
        return name ? (
          <span className="flex items-center gap-1.5 text-sm">
            <Folder className="size-3.5 text-muted-foreground" />
            {name}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
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
      cell: ({ row }) => {
        const name = row.getValue("sub_category") as string;
        return name ? (
          <span className="flex items-center gap-1.5 text-sm">
            <FolderOpen className="size-3.5 text-muted-foreground" />
            {name}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      accessorKey: "pdf_url",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="PDF" />
      ),
      cell: ({ row }) => {
        const fullUrl = assetUrl(row.getValue("pdf_url") as string | null);
        return fullUrl ? (
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
          >
            <FileText className="size-4" />
            <span>View</span>
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
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
