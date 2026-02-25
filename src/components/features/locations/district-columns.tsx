"use client";

import { Landmark, Map, Building2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { formatDate } from "@/lib/utils";
import type { DistrictWithParent, StateRegion } from "@/types/location";
import { DistrictRowActions } from "./district-row-actions";

export function getDistrictColumns(
  linkedCounts: Record<number, number>,
  stateRegions: StateRegion[],
): ColumnDef<DistrictWithParent>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="District" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-teal-500/10">
            <Landmark className="size-3.5 text-teal-500" />
          </div>
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
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
      id: "townships",
      header: "Townships",
      cell: ({ row }) => {
        const count = linkedCounts[row.original.district_id] ?? 0;
        return (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
            <Building2 className="size-3.5" />
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
        <DistrictRowActions
          district={row.original}
          linkedCount={linkedCounts[row.original.district_id] ?? 0}
          stateRegions={stateRegions}
        />
      ),
    },
  ];
}
