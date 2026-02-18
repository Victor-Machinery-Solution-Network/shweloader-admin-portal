"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { formatDate } from "@/lib/utils";
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

  const label = isActive ? "Hide announcement" : "Activate announcement";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? "outline" : "destructive"}
          size="icon-sm"
          onClick={handleToggle}
          disabled={isPending}
          aria-label={label}
          className={
            isActive
              ? "text-muted-foreground rounded-full border-dashed"
              : "rounded-full"
          }
        >
          {isActive ? <Eye aria-hidden="true" className="size-5" /> : <EyeOff aria-hidden="true" className="size-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
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
      <span className="font-medium line-clamp-1 max-w-3xl">
        {row.original.text ?? "—"}
      </span>
    ),
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
    cell: ({ row }) => (
      <TooltipProvider>
        <div className="flex items-center justify-end gap-1">
          <ActiveToggle announcement={row.original} />
          <RowActions announcement={row.original} />
        </div>
      </TooltipProvider>
    ),
  },
];
