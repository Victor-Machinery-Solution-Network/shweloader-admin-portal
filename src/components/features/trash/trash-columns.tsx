"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate, timeAgo } from "@/lib/utils";
import { ENTITY_REGISTRY } from "@/lib/trash/entity-registry";
import { TrashRowActions } from "./trash-row-actions";
import type { TrashItem } from "@/types/trash";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function createTrashColumns(): ColumnDef<TrashItem>[] {
  return [
    {
      accessorKey: "entity_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const config = ENTITY_REGISTRY[row.original.entity_type];
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium line-clamp-1 max-w-md">
              {row.original.entity_name || "Untitled"}
            </span>
            <span className="text-xs text-muted-foreground">
              {config?.displayName ?? row.original.entity_type}
            </span>
          </div>
        );
      },
    },
    {
      id: "entity_type",
      accessorFn: (row) => ENTITY_REGISTRY[row.entity_type]?.displayName ?? row.entity_type,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const config = ENTITY_REGISTRY[row.original.entity_type];
        return (
          <span className="text-sm text-muted-foreground">
            {config?.displayName ?? row.original.entity_type}
          </span>
        );
      },
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "deleted_by_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deleted By" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.deleted_by_name ?? "System"}
        </span>
      ),
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "deleted_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Deleted" />
      ),
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-muted-foreground tabular-nums cursor-default">
                {timeAgo(row.original.deleted_at)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {formatDate(row.original.deleted_at)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      accessorKey: "expires_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Expires" />
      ),
      cell: ({ row }) => {
        const raw = row.original.expires_at;
        const expires = new Date(raw.includes("T") ? raw : raw + "Z");
        const now = new Date();
        const daysLeft = Math.max(
          0,
          Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        );
        return (
          <span className={`text-sm tabular-nums ${daysLeft <= 3 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {daysLeft === 0 ? "Today" : `${daysLeft}d left`}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <TrashRowActions item={row.original} />,
    },
  ];
}
