"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  StickyNote,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROUTES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { RowActions } from "./row-actions";
import { EnquiryUserCell } from "./enquiry-user-cell";
import { EnquiryPartnerCell } from "./enquiry-partner-cell";
import type { BusinessTypeInfo } from "@/components/features/users/columns";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";

// Tailwind classes for the three statuses + Won/Lost outcome variants
const STATUS_STYLES: Record<string, string> = {
  New: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  Contacted: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  Closed: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20",
};

const OUTCOME_STYLES: Record<string, string> = {
  won: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  lost: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
};

export function getEnquiryColumns(
  statusTypes: EnquiryStatusType[],
  businessTypeMap: Map<number, BusinessTypeInfo>,
): ColumnDef<EnquiryWithDetails>[] {
  return [
    // No. — sequential display position (1-based) across the current view
    {
      id: "no",
      header: "No.",
      cell: ({ row, table }) =>
        table.getRowModel().rows.indexOf(row) +
        1 +
        table.getState().pagination.pageIndex *
          table.getState().pagination.pageSize,
      enableSorting: false,
      enableHiding: false,
      size: 48,
    },

    // Inquiry Date
    {
      accessorKey: "enquired_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Inquiry Date" />
      ),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums whitespace-nowrap">
          {formatDate(row.original.enquired_at)}
        </span>
      ),
      minSize: 120,
    },

    // User — stacked username + full name (click opens UserDetailDialog)
    {
      accessorKey: "user_username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => (
        <EnquiryUserCell
          appUserId={row.original.app_user_id}
          username={row.original.user_username}
          fullName={row.original.user_name}
          businessTypeMap={businessTypeMap}
        />
      ),
      minSize: 180,
    },

    // Contact Number
    {
      accessorKey: "user_phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact Number" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Phone className="size-3.5 shrink-0 text-muted-foreground" />
          <a
            href={`tel:${row.original.user_phone}`}
            className="text-sm whitespace-nowrap hover:underline"
          >
            {row.original.user_phone}
          </a>
        </div>
      ),
    },

    // Email
    {
      accessorKey: "user_email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const email = row.original.user_email;
        if (!email) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <Mail className="size-3.5 shrink-0 text-muted-foreground" />
            <a
              href={`mailto:${email}`}
              className="text-sm hover:underline max-w-48 truncate"
            >
              {email}
            </a>
          </div>
        );
      },
    },

    // Location
    {
      accessorKey: "user_location",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Location" />
      ),
      cell: ({ row }) => {
        const loc = row.original.user_location;
        if (!loc) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-sm max-w-52 truncate" title={loc}>{loc}</span>
          </div>
        );
      },
    },

    // Product Type
    {
      accessorKey: "product_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product Type" />
      ),
      cell: ({ row }) => {
        const type = row.original.product_type;
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-xs capitalize",
              type === "sale"
                ? "border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/5"
                : "border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-500/5",
            )}
          >
            {type === "sale" ? "Sale" : "Rental"}
          </Badge>
        );
      },
    },

    // Product Code (clickable → listing detail)
    {
      accessorKey: "product_code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product Code" />
      ),
      cell: ({ row }) => {
        const { product_code, product_list_id } = row.original;
        if (!product_code) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <Link
            href={`${ROUTES.LISTINGS}/${product_list_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-foreground hover:underline whitespace-nowrap"
          >
            {product_code}
          </Link>
        );
      },
    },

    // Brand
    {
      accessorKey: "brand_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Brand" />
      ),
      cell: ({ row }) => {
        const brand = row.original.brand_name;
        return brand ? (
          <Badge variant="outline" className="text-xs">{brand}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },

    // Model
    {
      accessorKey: "model_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Model" />
      ),
      cell: ({ row }) => (
        <span className="text-sm max-w-48 truncate block">
          {row.original.model_name ?? "—"}
        </span>
      ),
    },

    // Price (sale = lump sum, rent = "/ <unit>" suffix to differentiate)
    {
      id: "price",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" />
      ),
      cell: ({ row }) => {
        const { mmk_price, usd_price, rental_unit, product_type } = row.original;
        if (mmk_price == null && usd_price == null) {
          return <span className="text-muted-foreground">—</span>;
        }
        // rental_unit comes in as 'per_day', 'per_week', etc. → '/ day' for inline display.
        const unitSuffix =
          product_type === "rent" && rental_unit
            ? ` / ${rental_unit.replace(/^per_/, "").replace(/_/g, " ")}`
            : "";
        return (
          <div className="tabular-nums">
            {mmk_price != null && (
              <p className="text-sm font-medium whitespace-nowrap">
                {Number(mmk_price).toLocaleString()}{" "}
                <span className="text-muted-foreground font-normal">
                  MMK{unitSuffix}
                </span>
              </p>
            )}
            {usd_price != null && (
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                ${Number(usd_price).toLocaleString()}{unitSuffix}
              </p>
            )}
          </div>
        );
      },
    },

    // Partner (Owner) — stacked partner_username + partner_name (click opens PartnerReviewDialog)
    {
      accessorKey: "partner_username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Partner" />
      ),
      cell: ({ row }) => (
        <EnquiryPartnerCell
          partnerId={row.original.partner_id}
          partnerUsername={row.original.partner_username}
          partnerName={row.original.partner_name}
        />
      ),
      minSize: 180,
    },

    // Status (with optional Won/Lost outcome chip)
    {
      accessorKey: "status_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const { status_name, close_outcome } = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={cn("text-xs", STATUS_STYLES[status_name])}>
              {status_name}
            </Badge>
            {close_outcome && (
              <Badge variant="outline" className={cn("text-xs capitalize", OUTCOME_STYLES[close_outcome])}>
                {close_outcome}
              </Badge>
            )}
          </div>
        );
      },
      filterFn: (row, _columnId, value: string[]) => {
        if (!value?.length) return true;
        return value.includes(row.original.status_name);
      },
    },

    // Notes (preview / indicator)
    {
      accessorKey: "notes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Notes" />
      ),
      cell: ({ row }) => {
        const notes = row.original.notes;
        if (!notes) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1.5 text-sm max-w-40 truncate cursor-help">
                  <StickyNote className="size-3.5 shrink-0 text-muted-foreground" />
                  {notes}
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs whitespace-pre-wrap">
                {notes}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },

    // Row actions
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActions enquiry={row.original} statusTypes={statusTypes} />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
