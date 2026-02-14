"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { RowActions } from "./row-actions";
import type { AttachmentModel, AttachmentCategory } from "@/types/attachment";
import type { ProductBrand } from "@/types/brand";

export function createColumns(
  categories: AttachmentCategory[],
  brands: ProductBrand[],
  categoryBrandLinks: { category_id: number; brand_id: number }[],
): ColumnDef<AttachmentModel>[] {
  const categoryMap = new Map(categories.map((c) => [c.category_id, c.name]));
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
      id: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => {
        const name =
          categoryMap.get(row.original.category_id) ??
          `#${row.original.category_id}`;
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
          categories={categories}
          brands={brands}
          categoryBrandLinks={categoryBrandLinks}
        />
      ),
    },
  ];
}
