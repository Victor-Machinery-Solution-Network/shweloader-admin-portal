"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { EnquiryRowActions } from "./row-actions";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";

export function createEnquiryColumns(
  statusTypes: EnquiryStatusType[],
): ColumnDef<EnquiryWithDetails>[] {
  return [
    {
      accessorKey: "customer_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => {
        const { customer_name, customer_email, customer_company } =
          row.original;
        return (
          <div className="min-w-0">
            <span className="font-medium block truncate">
              {customer_name ?? "\u2014"}
            </span>
            {customer_email && (
              <span className="text-muted-foreground text-xs block truncate">
                {customer_email}
              </span>
            )}
            {customer_company && (
              <span className="text-muted-foreground text-xs block truncate">
                {customer_company}
              </span>
            )}
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
            <span className="text-sm truncate">
              {model_name ?? "\u2014"}
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
      accessorKey: "message",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Message" />
      ),
      cell: ({ row }) => {
        const message = row.original.message;
        return (
          <span className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
            {message || "\u2014"}
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
        if (!status) return <span className="text-muted-foreground text-sm">{"\u2014"}</span>;

        const variant =
          status === "Resolved"
            ? "default"
            : status === "Pending"
              ? "secondary"
              : "outline";

        return <Badge variant={variant}>{status}</Badge>;
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
