"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { TemplateRowActions } from "./row-actions";
import { FIELD_TYPE_LABELS } from "@/types/custom-field";
import type { CustomFieldTemplateWithFields } from "@/types/custom-field";

export function createColumns(): ColumnDef<CustomFieldTemplateWithFields>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      id: "field_count",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fields" />
      ),
      accessorFn: (row) => row.fields.length,
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.fields.length}{" "}
          {row.original.fields.length === 1 ? "field" : "fields"}
        </Badge>
      ),
    },
    {
      id: "field_types",
      header: "Types",
      cell: ({ row }) => {
        const types = [...new Set(row.original.fields.map((f) => f.type))];
        return (
          <div className="flex flex-wrap gap-1">
            {types.map((type) => (
              <Badge key={type} variant="secondary" className="text-xs">
                {FIELD_TYPE_LABELS[type]}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDate(row.getValue("created_at"))}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => <TemplateRowActions template={row.original} />,
    },
  ];
}
