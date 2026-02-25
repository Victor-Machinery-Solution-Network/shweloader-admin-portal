"use client";

import { Building2, Landmark, Map } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import type { TownshipWithParents, StateRegion, District } from "@/types/location";
import { RowActions } from "./row-actions";

export function getColumns(
  linkedCounts: Record<number, number>,
  stateRegions: StateRegion[],
  districts: District[],
): ColumnDef<TownshipWithParents>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Township" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10">
            <Building2 className="size-3.5 text-indigo-500" />
          </div>
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "district_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="District" />
      ),
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <Landmark className="size-3.5" />
          {row.getValue("district_name")}
        </span>
      ),
    },
    {
      accessorKey: "state_region_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="State / Region" />
      ),
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <Map className="size-3.5" />
          {row.getValue("state_region_name")}
        </span>
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
          township={row.original}
          linkedCount={linkedCounts[row.original.township_id] ?? 0}
          stateRegions={stateRegions}
          districts={districts}
        />
      ),
    },
  ];
}
