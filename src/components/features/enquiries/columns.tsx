"use client";

import { MessageSquare, Package } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { EnquiryRowActions } from "./row-actions";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";

const STATUS_DOT: Record<string, string> = {
  resolved: "bg-emerald-500",
  pending: "bg-amber-500",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "outline"> = {
  resolved: "success",
  pending: "warning",
};

export function createEnquiryColumns(
  statusTypes: EnquiryStatusType[],
): ColumnDef<EnquiryWithDetails>[] {
  return [
    {
      accessorKey: "user_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => {
        const { user_name, user_email, user_company } = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
              <MessageSquare className="size-3.5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <span className="font-medium block truncate">
                {user_name ?? "—"}
              </span>
              {user_email && (
                <span className="text-muted-foreground text-xs block truncate">
                  {user_email}
                </span>
              )}
              {user_company && (
                <span className="text-muted-foreground text-xs block truncate">
                  {user_company}
                </span>
              )}
            </div>
          </div>
        );
      },
      minSize: 160,
    },
    {
      id: "product",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product" />
      ),
      cell: ({ row }) => {
        const { model_name, listing_type } = row.original;
        return (
          <div className="flex items-center gap-2">
            <Package className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-sm truncate">
              {model_name ?? "—"}
            </span>
            {listing_type && (
              <Badge variant="secondary" className="text-xs capitalize shrink-0">
                {listing_type}
              </Badge>
            )}
          </div>
        );
      },
      minSize: 140,
    },
    {
      accessorKey: "listing_type",
      header: "Listing Type",
      enableHiding: true,
    },
    {
      accessorKey: "message",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Message" />
      ),
      cell: ({ row }) => {
        const message = row.original.message;
        return (
          <span className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
            {message || "—"}
          </span>
        );
      },
      minSize: 200,
    },
    {
      accessorKey: "status_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.status_name;
        if (!status) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }

        const key = status.toLowerCase();
        const dotColor = STATUS_DOT[key] ?? "bg-muted-foreground/40";
        const variant = STATUS_VARIANT[key] ?? "outline";

        return (
          <div className="flex items-center gap-2">
            <div className={cn("size-2 rounded-full", dotColor)} />
            <Badge variant={variant} className="text-xs">
              {status}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <EnquiryRowActions
          enquiry={row.original}
          statusTypes={statusTypes}
        />
      ),
    },
  ];
}
