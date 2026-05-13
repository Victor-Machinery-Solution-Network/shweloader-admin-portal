"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/r2-url";
import {
  TARGET_SCREEN_LABELS,
  TRIGGER_LABELS,
} from "@/types/popup-promotion";
import type { PopupPromotion } from "@/types/popup-promotion";
import { RowActions } from "./row-actions";
import { LinkedProductsCell } from "./linked-products-cell";

function ActiveToggle({ promotion }: { promotion: PopupPromotion }) {
  const [isPending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(promotion.active === 1);

  function handleToggle() {
    startTransition(async () => {
      // UI-only prototype — backend not wired
      const next = !isActive;
      setIsActive(next);
      await new Promise((resolve) => setTimeout(resolve, 250));
      toast.success(
        next
          ? `"${promotion.name}" activated`
          : `"${promotion.name}" deactivated`,
      );
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
          {isActive ? "Active" : "Inactive"}
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

function formatTriggerSummary(p: PopupPromotion) {
  if (p.trigger_type === "screen_entry") {
    return p.trigger_delay_seconds === 0
      ? "Immediate"
      : `After ${p.trigger_delay_seconds}s`;
  }
  return `Scroll ≥ ${p.trigger_scroll_percent}%`;
}

function formatScheduleRange(p: PopupPromotion) {
  if (!p.start_at && !p.end_at) return "No schedule";
  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "—";
  return `${fmt(p.start_at)} → ${fmt(p.end_at)}`;
}

export const columns: ColumnDef<PopupPromotion>[] = [
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
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Promotion" />
    ),
    cell: ({ row }) => {
      const p = row.original;
      const src = assetUrl(p.image_thumb_url ?? p.image_url);
      const initial = p.name.charAt(0).toUpperCase();
      return (
        <div className="flex items-center gap-3">
          {src ? (
            <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border bg-muted">
              <Image
                src={src}
                alt={p.name}
                fill
                className="object-cover"
                sizes="44px"
              />
            </div>
          ) : (
            <div className="size-11 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">
                {initial}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-medium">{p.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              CTA: {p.cta_label || <span className="italic">not set</span>}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "target_screens",
    accessorFn: (row) => row.target_screens.join(","),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Screens" />
    ),
    cell: ({ row }) => {
      const screens = row.original.target_screens;
      if (screens.length === 0) {
        return (
          <span className="text-xs text-muted-foreground italic">none</span>
        );
      }
      return (
        <div className="flex flex-wrap gap-1">
          {screens.map((s) => (
            <Badge key={s} variant="outline" className="font-normal">
              {TARGET_SCREEN_LABELS[s]}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "trigger",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Trigger" />
    ),
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="text-sm">
          <div>{TRIGGER_LABELS[p.trigger_type]}</div>
          <div className="text-xs text-muted-foreground">
            {formatTriggerSummary(p)}
          </div>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "linked",
    accessorFn: (row) => row.linked_listing_ids.length,
    header: ({ column }) => (
      <div className="flex justify-center">
        <DataTableColumnHeader column={column} title="Linked products" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <LinkedProductsCell promotion={row.original} />
      </div>
    ),
  },
  {
    id: "schedule",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Schedule" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatScheduleRange(row.original)}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: "active",
    accessorFn: (row) => row.active,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => <ActiveToggle promotion={row.original} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions promotion={row.original} />,
  },
];
