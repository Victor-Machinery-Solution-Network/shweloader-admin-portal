"use client";

import { Phone, Mail, MessageSquareText } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatDate } from "@/lib/utils";
import { RowActions } from "./row-actions";
import type { AppFeedbackWithUser } from "@/types/feedback";

// Tailwind classes per platform badge
const PLATFORM_STYLES: Record<string, string> = {
  ios: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  android:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
};

export function getFeedbackColumns(): ColumnDef<AppFeedbackWithUser>[] {
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

    // Date
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-sm tabular-nums whitespace-nowrap">
          {formatDate(row.original.created_at)}
        </span>
      ),
      minSize: 120,
    },

    // User — name + email + phone, or "Anonymous" when app_user_id is null
    {
      accessorKey: "user_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => {
        const { app_user_id, user_name, user_email, user_phone } = row.original;
        if (app_user_id == null) {
          return (
            <span className="text-muted-foreground text-sm italic">
              Anonymous
            </span>
          );
        }
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">
              {user_name ?? "—"}
            </span>
            {user_email && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="size-3 shrink-0" />
                <span className="max-w-48 truncate">{user_email}</span>
              </span>
            )}
            {user_phone && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="size-3 shrink-0" />
                {user_phone}
              </span>
            )}
          </div>
        );
      },
      minSize: 180,
    },

    // Platform
    {
      accessorKey: "platform",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Platform" />
      ),
      cell: ({ row }) => {
        const platform = row.original.platform;
        if (!platform) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <Badge
            variant="outline"
            className={cn("text-xs capitalize", PLATFORM_STYLES[platform])}
          >
            {platform === "ios" ? "iOS" : "Android"}
          </Badge>
        );
      },
      filterFn: (row, _columnId, value: string[]) => {
        if (!value?.length) return true;
        return value.includes(row.original.platform ?? "");
      },
    },

    // App version
    {
      accessorKey: "app_version",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="App version" />
      ),
      cell: ({ row }) => {
        const version = row.original.app_version;
        if (!version) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <span className="text-sm font-mono whitespace-nowrap">{version}</span>
        );
      },
    },

    // Message (truncate + Tooltip)
    {
      accessorKey: "message",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Message" />
      ),
      cell: ({ row }) => {
        const message = row.original.message;
        if (!message) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1.5 text-sm max-w-80 truncate cursor-help">
                  <MessageSquareText className="size-3.5 shrink-0 text-muted-foreground" />
                  {message}
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs whitespace-pre-wrap">
                {message}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },

    // Row actions
    {
      id: "actions",
      cell: ({ row }) => <RowActions feedback={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
