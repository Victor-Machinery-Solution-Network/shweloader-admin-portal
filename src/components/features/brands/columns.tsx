"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProductBrandWithCategories } from "@/types/brand";
import type { AttachmentCategory } from "@/types/attachment";
import type { EquipmentSubCategory } from "@/types/equipment";
import { RowActions } from "./row-actions";

const MAX_VISIBLE_BADGES = 2;

/** Render a list of badges with a "+X more" tooltip for overflow */
function BadgeList({
  names,
  variant = "secondary",
}: {
  names: string[];
  variant?: "secondary" | "outline";
}) {
  if (names.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const visible = names.slice(0, MAX_VISIBLE_BADGES);
  const remaining = names.slice(MAX_VISIBLE_BADGES);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((name) => (
        <Badge key={name} variant={variant} className="text-xs">
          {name}
        </Badge>
      ))}
      {remaining.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={variant} className="cursor-default text-xs">
                +{remaining.length} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-64">
              <ul className="space-y-1">
                {remaining.map((name) => (
                  <li key={name} className="flex items-center gap-1.5">
                    <span className="size-1 rounded-full bg-current shrink-0" />
                    <span className="text-sm">{name}</span>
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

/** Factory to create columns with category/sub-category lookup + pass-through */
export function createColumns(
  categories: AttachmentCategory[],
  subCategories: EquipmentSubCategory[],
  linkedInfo: Record<number, { total: number; summary: string }>,
): ColumnDef<ProductBrandWithCategories>[] {
  const categoryMap = new Map(categories.map((c) => [c.category_id, c.name]));
  const subCategoryMap = new Map(
    subCategories.map((sc) => [sc.sub_category_id, sc.name]),
  );

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
      id: "categories",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Attachment Categories" />
      ),
      cell: ({ row }) => {
        const ids = row.original.categoryIds;
        const names = (ids ?? []).map((id) => categoryMap.get(id) ?? `#${id}`);
        return <BadgeList names={names} variant="secondary" />;
      },
    },
    {
      id: "subCategories",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Equipment Sub-Categories"
        />
      ),
      cell: ({ row }) => {
        const ids = row.original.subCategoryIds;
        const names = (ids ?? []).map(
          (id) => subCategoryMap.get(id) ?? `#${id}`,
        );
        return <BadgeList names={names} variant="outline" />;
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
        const info = linkedInfo[row.original.brand_id];
        return (
          <RowActions
            brand={row.original}
            categories={categories}
            subCategories={subCategories}
            linkedCount={info?.total ?? 0}
            linkedSummary={info?.summary ?? ""}
          />
        );
      },
    },
  ];
}
