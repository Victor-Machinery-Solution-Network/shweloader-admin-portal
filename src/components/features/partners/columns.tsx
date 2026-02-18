"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate, timeAgo } from "@/lib/utils";
import { RowActions } from "./row-actions";
import type { PartnerWithDetails } from "@/types/partner";

// ─── Approved (Partners tab) ─────────────────────────────────────────────────

export const approvedColumns: ColumnDef<PartnerWithDetails>[] = [
  {
    accessorKey: "customer_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Partner" />
    ),
    cell: ({ row }) => {
      const { customer_name, customer_email } = row.original;
      return (
        <div className="min-w-0">
          <span className="font-medium block truncate">
            {customer_name ?? "—"}
          </span>
          {customer_email && (
            <span className="text-muted-foreground text-xs block truncate">
              {customer_email}
            </span>
          )}
        </div>
      );
    },
    minSize: 160,
  },
  {
    accessorKey: "customer_company",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: ({ row }) => {
      const company = row.original.customer_company;
      return (
        <span className={`text-sm max-w-48 truncate block ${company ? "" : "text-muted-foreground"}`}>
          {company ?? "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "customer_phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => {
      const phone = row.original.customer_phone;
      return (
        <span className={`text-sm whitespace-nowrap ${phone ? "" : "text-muted-foreground"}`}>
          {phone ?? "—"}
        </span>
      );
    },
  },
  {
    id: "business",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Business Type" />
    ),
    cell: ({ row }) => {
      const type = row.original.business_type_name;
      return type ? (
        <Badge variant="outline" className="text-xs">
          {type}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    accessorKey: "partner_type_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Partner Type" />
    ),
    cell: ({ row }) => {
      const type = row.original.partner_type_name;
      return type ? (
        <Badge variant="outline" className="text-xs">
          {type}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    accessorKey: "reviewed_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Approved" />
    ),
    cell: ({ row }) => {
      const date = row.original.reviewed_at;
      return date ? (
        <span className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
          {formatDate(date)}
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions partner={row.original} />,
  },
];

// ─── Pending tab ─────────────────────────────────────────────────────────────

export const pendingColumns: ColumnDef<PartnerWithDetails>[] = [
  {
    accessorKey: "customer_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Applicant" />
    ),
    cell: ({ row }) => {
      const { customer_name, customer_email } = row.original;
      return (
        <div className="min-w-0">
          <span className="font-medium block truncate">
            {customer_name ?? "—"}
          </span>
          {customer_email && (
            <span className="text-muted-foreground text-xs block truncate">
              {customer_email}
            </span>
          )}
        </div>
      );
    },
    minSize: 160,
  },
  {
    accessorKey: "customer_company",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: ({ row }) => {
      const company = row.original.customer_company;
      return (
        <span className={`text-sm max-w-48 truncate block ${company ? "" : "text-muted-foreground"}`}>
          {company ?? "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "customer_phone",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => {
      const phone = row.original.customer_phone;
      return (
        <span className={`text-sm whitespace-nowrap ${phone ? "" : "text-muted-foreground"}`}>
          {phone ?? "—"}
        </span>
      );
    },
  },
  {
    id: "business",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Business Type" />
    ),
    cell: ({ row }) => {
      const type = row.original.business_type_name;
      return type ? (
        <Badge variant="outline" className="text-xs">
          {type}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    accessorKey: "partner_type_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Partner Type" />
    ),
    cell: ({ row }) => {
      const type = row.original.partner_type_name;
      return type ? (
        <Badge variant="outline" className="text-xs">
          {type}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    accessorKey: "applied_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Waiting" />
    ),
    cell: ({ row }) => {
      const date = row.original.applied_at;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm tabular-nums whitespace-nowrap cursor-default">
                {timeAgo(date)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{formatDate(date)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions partner={row.original} />,
  },
];

// ─── Rejected tab ────────────────────────────────────────────────────────────

export const rejectedColumns: ColumnDef<PartnerWithDetails>[] = [
  {
    accessorKey: "customer_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Applicant" />
    ),
    cell: ({ row }) => {
      const { customer_name, customer_email } = row.original;
      return (
        <div className="min-w-0">
          <span className="font-medium block truncate">
            {customer_name ?? "—"}
          </span>
          {customer_email && (
            <span className="text-muted-foreground text-xs block truncate">
              {customer_email}
            </span>
          )}
        </div>
      );
    },
    minSize: 160,
  },
  {
    accessorKey: "customer_company",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: ({ row }) => {
      const company = row.original.customer_company;
      return (
        <span className={`text-sm max-w-48 truncate block ${company ? "" : "text-muted-foreground"}`}>
          {company ?? "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "partner_type_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Partner Type" />
    ),
    cell: ({ row }) => {
      const type = row.original.partner_type_name;
      return type ? (
        <Badge variant="outline" className="text-xs">
          {type}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    accessorKey: "rejection_reason",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reason" />
    ),
    cell: ({ row }) => {
      const reason = row.original.rejection_reason;
      if (!reason) {
        return <span className="text-muted-foreground text-sm italic">No reason provided</span>;
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm line-clamp-2 max-w-xs cursor-default">
                {reason}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm">
              {reason}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
    minSize: 200,
  },
  {
    accessorKey: "applied_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Applied" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
        {formatDate(row.original.applied_at)}
      </span>
    ),
  },
  {
    accessorKey: "reviewed_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rejected" />
    ),
    cell: ({ row }) => {
      const date = row.original.reviewed_at;
      return date ? (
        <span className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
          {formatDate(date)}
        </span>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions partner={row.original} />,
  },
];
