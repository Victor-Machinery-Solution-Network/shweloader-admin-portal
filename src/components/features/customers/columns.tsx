"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";
import type { Customer } from "@/types/customer";

export type BusinessTypeInfo = { name: string; isListed: boolean };

export function createColumns(
  businessTypeMap: Map<number, BusinessTypeInfo>,
  onView: (customer: Customer) => void,
): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onView(row.original)}
              className="font-medium text-left hover:underline cursor-pointer w-fit"
            >
              {row.original.username}
            </button>
            {row.original.is_approved_partner === 1 && (
              <Badge className="text-xs h-5 px-1.5 bg-blue-600/10 text-blue-700 border-blue-600/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30">
                Partner
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground text-xs">
            {row.original.email}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string | null;
        return (
          <span className={`text-sm whitespace-nowrap ${phone ? "" : "text-muted-foreground"}`}>
            {phone ?? "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "company_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Company" />
      ),
      cell: ({ row }) => {
        const company = row.getValue("company_name") as string | null;
        return (
          <span className={`text-sm max-w-48 truncate block ${company ? "" : "text-muted-foreground"}`}>
            {company ?? "—"}
          </span>
        );
      },
    },
    {
      id: "business_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Business Type" />
      ),
      cell: ({ row }) => {
        if (!row.original.business_type_id) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        const info = businessTypeMap.get(row.original.business_type_id);
        const name = info?.name ?? `#${row.original.business_type_id}`;
        return (
          <Badge
            variant={info?.isListed ? "outline" : "secondary"}
            className="text-xs"
          >
            {name}
          </Badge>
        );
      },
    },
    {
      accessorKey: "is_verified",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const verified = row.getValue("is_verified") === 1;
        return (
          <Badge
            variant={verified ? "success" : "destructive"}
            className="text-xs"
          >
            {verified ? "Verified" : "Unverified"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Joined" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
          {formatDate(row.getValue("created_at"))}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onView(row.original)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Eye className="size-4" aria-hidden="true" />
                  <span className="sr-only">View details</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">View details</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      size: 48,
      enableSorting: false,
    },
  ];
}
