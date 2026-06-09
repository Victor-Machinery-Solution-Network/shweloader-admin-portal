"use client";

import { Handshake, Building2, Phone } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { RowActions } from "./row-actions";
import type { PartnerWithDetails } from "@/types/partner";

// ─── Shared column helpers ──────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  approved: "bg-emerald-500",
  pending: "bg-amber-500",
  rejected: "bg-rose-500",
};

function partnerColumn(title: string): ColumnDef<PartnerWithDetails> {
  return {
    accessorKey: "user_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => {
      const { user_name, user_email } = row.original;
      return (
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
            <Handshake className="size-3.5 text-emerald-500" />
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
          </div>
        </div>
      );
    },
    minSize: 160,
  };
}

const companyColumn: ColumnDef<PartnerWithDetails> = {
  accessorKey: "user_company",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Company" />
  ),
  cell: ({ row }) => {
    const company = row.original.user_company;
    if (!company) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    return (
      <div className="flex items-center gap-1.5">
        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm max-w-48 truncate">{company}</span>
      </div>
    );
  },
};

const phoneColumn: ColumnDef<PartnerWithDetails> = {
  accessorKey: "user_phone",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Phone" />
  ),
  cell: ({ row }) => {
    const phone = row.original.user_phone;
    if (!phone) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    return (
      <div className="flex items-center gap-1.5">
        <Phone className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm whitespace-nowrap">{phone}</span>
      </div>
    );
  },
};

const businessTypeColumn: ColumnDef<PartnerWithDetails> = {
  id: "business",
  accessorFn: (row) => row.business_type_name ?? "",
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
};

const partnerTypeColumn: ColumnDef<PartnerWithDetails> = {
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
};

const statusColumn: ColumnDef<PartnerWithDetails> = {
  accessorKey: "status_name",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Status" />
  ),
  cell: ({ row }) => {
    const status = row.original.status_name;
    if (!status) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }

    const variant =
      status === "Approved"
        ? "success"
        : status === "Pending"
          ? "warning"
          : "destructive";

    const dotColor = STATUS_DOT[status.toLowerCase()] ?? "bg-muted-foreground/40";

    return (
      <div className="flex items-center gap-2">
        <div className={cn("size-2 rounded-full", dotColor)} />
        <Badge variant={variant} className="text-xs">
          {status}
        </Badge>
      </div>
    );
  },
};

function appliedAtColumn(): ColumnDef<PartnerWithDetails> {
  return {
    accessorKey: "applied_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Applied" />
    ),
    cell: ({ row }) => {
      const date = row.original.applied_at;
      return (
        <div className="text-sm tabular-nums whitespace-nowrap">
          <span>{formatDate(date)}</span>
          <span className="text-muted-foreground text-xs ml-1">
            ({timeAgo(date)})
          </span>
        </div>
      );
    },
  };
}

function reviewedAtColumn(title: string): ColumnDef<PartnerWithDetails> {
  return {
    accessorKey: "reviewed_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => {
      const date = row.original.reviewed_at;
      return date ? (
        <div className="text-sm tabular-nums whitespace-nowrap">
          <span>{formatDate(date)}</span>
          <span className="text-muted-foreground text-xs ml-1">
            ({timeAgo(date)})
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  };
}

function makeActionsColumn(
  partnerTypes: { id: number; name: string }[],
): ColumnDef<PartnerWithDetails> {
  return {
    id: "actions",
    cell: ({ row }) => (
      <RowActions partner={row.original} partnerTypes={partnerTypes} />
    ),
  };
}

// ─── All (Master table) ─────────────────────────────────────────────────────

export function allColumns(
  partnerTypes: { id: number; name: string }[],
): ColumnDef<PartnerWithDetails>[] {
  return [
    partnerColumn("Partner"),
    companyColumn,
    phoneColumn,
    businessTypeColumn,
    partnerTypeColumn,
    statusColumn,
    appliedAtColumn(),
    makeActionsColumn(partnerTypes),
  ];
}

// ─── Approved (Partners tab) ────────────────────────────────────────────────

export function approvedColumns(
  partnerTypes: { id: number; name: string }[],
): ColumnDef<PartnerWithDetails>[] {
  return [
    partnerColumn("Partner"),
    companyColumn,
    phoneColumn,
    businessTypeColumn,
    partnerTypeColumn,
    reviewedAtColumn("Approved"),
    makeActionsColumn(partnerTypes),
  ];
}

// ─── Pending tab ────────────────────────────────────────────────────────────

export function pendingColumns(
  partnerTypes: { id: number; name: string }[],
): ColumnDef<PartnerWithDetails>[] {
  return [
    partnerColumn("Applicant"),
    companyColumn,
    phoneColumn,
    businessTypeColumn,
    partnerTypeColumn,
    appliedAtColumn(),
    makeActionsColumn(partnerTypes),
  ];
}

// ─── Rejected tab ───────────────────────────────────────────────────────────

export function rejectedColumns(
  partnerTypes: { id: number; name: string }[],
): ColumnDef<PartnerWithDetails>[] {
  return [
    partnerColumn("Applicant"),
    companyColumn,
    partnerTypeColumn,
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
    appliedAtColumn(),
    reviewedAtColumn("Rejected"),
    makeActionsColumn(partnerTypes),
  ];
}
