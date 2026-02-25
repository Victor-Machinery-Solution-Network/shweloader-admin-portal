"use client";

import { useTransition } from "react";
import { Megaphone } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { cn, formatDate } from "@/lib/utils";
import { toggleAnnouncementActive } from "@/lib/actions/announcement";
import { RowActions } from "./row-actions";
import type { AnnouncementText } from "@/types/announcement";

function ActiveToggle({ announcement }: { announcement: AnnouncementText }) {
  const [isPending, startTransition] = useTransition();
  const isActive = announcement.is_active === 1;

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleAnnouncementActive(
        announcement.announcement_id,
      );
      if (result.success) {
        toast.success(
          isActive ? "Announcement hidden" : "Announcement activated",
        );
      } else {
        toast.error(result.error ?? "Failed to update announcement");
      }
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "size-2 rounded-full",
            isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
        <span
          className={cn(
            "text-sm",
            isActive ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {isActive ? "Active" : "Hidden"}
        </span>
      </div>
      <Switch
        size="sm"
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
    </div>
  );
}

export const columns: ColumnDef<AnnouncementText>[] = [
  {
    id: "index",
    header: () => <span className="block text-center">No.</span>,
    cell: ({ row }) => (
      <span className="text-muted-foreground block text-center text-sm tabular-nums">
        {row.index + 1}
      </span>
    ),
    size: 40,
    minSize: 40,
    maxSize: 40,
    enableSorting: false,
  },
  {
    accessorKey: "text",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Announcement" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
          <Megaphone className="size-3.5 text-amber-500" />
        </div>
        <span className="font-medium line-clamp-1 max-w-3xl">
          {row.original.text ?? "—"}
        </span>
      </div>
    ),
  },
  {
    id: "is_active",
    accessorFn: (row) => row.is_active,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => <ActiveToggle announcement={row.original} />,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions announcement={row.original} />,
  },
];
