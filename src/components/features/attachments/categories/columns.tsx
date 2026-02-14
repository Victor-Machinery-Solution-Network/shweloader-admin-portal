"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { ImageCell } from "@/components/shared/image-cell";
import { formatDate } from "@/lib/utils";
import type { AttachmentCategory } from "@/types/attachment";
import { RowActions } from "./row-actions";

export const columns: ColumnDef<AttachmentCategory>[] = [
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
    cell: ({ row }) => <RowActions category={row.original} />,
  },
];
