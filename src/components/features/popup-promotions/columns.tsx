"use client";

import { useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ImageCell } from "@/components/shared/image-cell";
import { cn } from "@/lib/utils";
import {
  TARGET_SCREEN_LABELS,
  TRIGGER_LABELS,
} from "@/types/popup-promotion";
import type { PopupPromotion } from "@/types/popup-promotion";
import type { PopupListingOption } from "@/lib/cache";
import { togglePopupPromotionActive } from "@/lib/actions/popup-promotion";
import { RowActions } from "./row-actions";
import { LinkedProductsCell } from "./linked-products-cell";

function ActiveToggle({ promotion }: { promotion: PopupPromotion }) {
  const [isPending, startTransition] = useTransition();
  const isActive = promotion.active === 1;

  function handleToggle() {
    startTransition(async () => {
      const result = await togglePopupPromotionActive(promotion.popup_promotion_id);
      if (result.success) {
        toast.success(isActive ? `"${promotion.name}" deactivated` : `"${promotion.name}" activated`);
      } else {
        toast.error(result.error ?? "Failed to toggle status");
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

export function getColumns(
  listings: PopupListingOption[],
): ColumnDef<PopupPromotion>[] {
  return [
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
      return (
        <ImageCell
          name={p.name}
          imageUrl={p.image_thumb_url ?? p.image_url}
          previewUrl={p.image_url}
          subtitle={
            <>
              CTA: {p.cta_label || <span className="italic">not set</span>}
            </>
          }
        />
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
        <LinkedProductsCell promotion={row.original} listings={listings} />
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
}
