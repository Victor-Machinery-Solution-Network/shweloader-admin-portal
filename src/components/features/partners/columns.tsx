"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { RowActions } from "./row-actions";
import type { PartnerWithDetails } from "@/types/partner";

// ─── Shared column helpers ───────────────────────────────────────────────────

const customerColumn: ColumnDef<PartnerWithDetails> = {
  accessorKey: "customer_name",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Customer" />
  ),
  cell: ({ row }) => {
    const name = row.original.customer_name;
    const email = row.original.customer_email;
    return (
      <div>
        <span className="font-medium">{name ?? "—"}</span>
        {email && <p className="text-muted-foreground text-xs">{email}</p>}
      </div>
    );
  },
};

const companyColumn: ColumnDef<PartnerWithDetails> = {
  accessorKey: "customer_company",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Company" />
  ),
  cell: ({ row }) => {
    const company = row.original.customer_company;
    return company ? (
      <span className="text-sm">{company}</span>
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
      <Badge variant="secondary" className="text-xs">
        {type}
      </Badge>
    ) : (
      <span className="text-muted-foreground text-sm">—</span>
    );
  },
};

const appliedAtColumn: ColumnDef<PartnerWithDetails> = {
  accessorKey: "applied_at",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Applied" />
  ),
  cell: ({ row }) => {
    const date = row.getValue("applied_at") as string;
    return (
      <span className="text-muted-foreground text-sm">{formatDate(date)}</span>
    );
  },
};

const reviewedAtColumn: ColumnDef<PartnerWithDetails> = {
  accessorKey: "reviewed_at",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Approved At" />
  ),
  cell: ({ row }) => {
    const date = row.original.reviewed_at;
    return date ? (
      <span className="text-muted-foreground text-sm">{formatDate(date)}</span>
    ) : (
      <span className="text-muted-foreground text-sm">—</span>
    );
  },
};

const rejectedAtColumn: ColumnDef<PartnerWithDetails> = {
  accessorKey: "reviewed_at",
  header: ({ column }) => (
    <DataTableColumnHeader column={column} title="Rejected At" />
  ),
  cell: ({ row }) => {
    const date = row.original.reviewed_at;
    return date ? (
      <span className="text-muted-foreground text-sm">{formatDate(date)}</span>
    ) : (
      <span className="text-muted-foreground text-sm">—</span>
    );
  },
};

// ─── Approved (Partners tab) ─────────────────────────────────────────────────

export const approvedColumns: ColumnDef<PartnerWithDetails>[] = [
  customerColumn,
  companyColumn,
  partnerTypeColumn,
  appliedAtColumn,
  reviewedAtColumn,
];

// ─── Pending tab ─────────────────────────────────────────────────────────────

export const pendingColumns: ColumnDef<PartnerWithDetails>[] = [
  customerColumn,
  companyColumn,
  partnerTypeColumn,
  appliedAtColumn,
  {
    id: "actions",
    cell: ({ row }) => <RowActions partner={row.original} />,
  },
];

// ─── Rejected tab ────────────────────────────────────────────────────────────

export const rejectedColumns: ColumnDef<PartnerWithDetails>[] = [
  customerColumn,
  companyColumn,
  partnerTypeColumn,
  {
    accessorKey: "rejection_reason",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Rejection Reason" />
    ),
    cell: ({ row }) => {
      const reason = row.original.rejection_reason;
      return reason ? (
        <span className="text-sm">{reason}</span>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      );
    },
  },
  appliedAtColumn,
  rejectedAtColumn,
];
