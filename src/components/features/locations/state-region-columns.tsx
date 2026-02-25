"use client";

import { Map, Landmark } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import type { StateRegion } from "@/types/location";
import { StateRegionRowActions } from "./state-region-row-actions";

const TYPE_LABELS: Record<string, string> = {
  state: "State",
  region: "Region",
  union_territory: "Union Territory",
};

export function getStateRegionColumns(
  linkedCounts: Record<number, number>,
): ColumnDef<StateRegion>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
            <Map className="size-3.5 text-blue-500" />
          </div>
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return <Badge variant="secondary">{TYPE_LABELS[type] ?? type}</Badge>;
      },
    },
    {
      id: "districts",
      header: "Districts",
      cell: ({ row }) => {
        const count = linkedCounts[row.original.state_region_id] ?? 0;
        return (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
            <Landmark className="size-3.5" />
            {count}
          </span>
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
        <StateRegionRowActions
          stateRegion={row.original}
          linkedCount={linkedCounts[row.original.state_region_id] ?? 0}
        />
      ),
    },
  ];
}
