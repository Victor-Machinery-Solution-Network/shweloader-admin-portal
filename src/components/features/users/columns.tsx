"use client";

import { UserRound, Phone, Building2, Handshake, Ban } from "lucide-react";
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
import { cn, formatDate } from "@/lib/utils";
import type { AppUser } from "@/types/app-user";

export type BusinessTypeInfo = { name: string; isListed: boolean };

export function createColumns(
  businessTypeMap: Map<number, BusinessTypeInfo>,
  onView: (user: AppUser) => void,
): ColumnDef<AppUser>[] {
  return [
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => (
        <div className={cn("flex items-center gap-2.5", row.original.deleted_at && "opacity-50")}>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
            <UserRound className="size-3.5 text-violet-500" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onView(row.original)}
                className="font-medium text-left hover:underline cursor-pointer w-fit truncate"
              >
                {row.original.username}
              </button>
              {row.original.deleted_at && (
                <Badge variant="destructive" className="text-xs shrink-0">
                  <Ban className="size-3" />
                  Blacklisted
                </Badge>
              )}
              {!row.original.deleted_at && row.original.is_approved_partner === 1 && (
                <Badge variant="success" className="text-xs shrink-0">
                  <Handshake className="size-3" />
                  Partner
                </Badge>
              )}
            </div>
            <span className="text-muted-foreground text-xs truncate">
              {row.original.full_name || row.original.phone}
            </span>
          </div>
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
        if (!phone) {
          return <span className={cn("text-muted-foreground text-sm", row.original.deleted_at && "opacity-50")}>—</span>;
        }
        return (
          <div className={cn("flex items-center gap-1.5", row.original.deleted_at && "opacity-50")}>
            <Phone className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-sm whitespace-nowrap">{phone}</span>
          </div>
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
        if (!company) {
          return <span className={cn("text-muted-foreground text-sm", row.original.deleted_at && "opacity-50")}>—</span>;
        }
        return (
          <div className={cn("flex items-center gap-1.5", row.original.deleted_at && "opacity-50")}>
            <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-sm max-w-48 truncate">{company}</span>
          </div>
        );
      },
    },
    {
      id: "business_type",
      accessorFn: (row) =>
        row.business_type_id
          ? (businessTypeMap.get(row.business_type_id)?.name ?? "")
          : "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Business Type" />
      ),
      cell: ({ row }) => {
        if (!row.original.business_type_id) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        const info = businessTypeMap.get(row.original.business_type_id);
        const name = info?.name ?? `#${row.original.business_type_id}`;
        const isListed = info?.isListed ?? false;
        return (
          <Badge
            variant={isListed ? "outline" : "secondary"}
            className="text-xs"
          >
            {isListed ? name : `${name} (Others)`}
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
          <div className={cn("flex items-center gap-2", row.original.deleted_at && "opacity-50")}>
            <div
              className={cn(
                "size-2 rounded-full",
                verified ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
            <Badge
              variant={verified ? "success" : "destructive"}
              className="text-xs"
            >
              {verified ? "Verified" : "Unverified"}
            </Badge>
          </div>
        );
      },
      meta: {
        exportValue: (row: { original: AppUser }) =>
          row.original.is_verified === 1 ? "Verified" : "Unverified",
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Joined" />
      ),
      cell: ({ row }) => (
        <span className={cn("text-muted-foreground text-sm tabular-nums whitespace-nowrap", row.original.deleted_at && "opacity-50")}>
          {formatDate(row.getValue("created_at"))}
        </span>
      ),
    },
    {
      accessorKey: "is_approved_partner",
      header: () => null,
      cell: () => null,
      enableSorting: false,
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
