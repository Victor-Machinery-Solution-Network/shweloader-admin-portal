"use client";

import * as React from "react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

// ── Helpers ──────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

const DATE_PRESETS = [
  {
    label: "Today",
    getRange: (): [Date, Date] => {
      const now = new Date();
      return [startOfDay(now), endOfDay(now)];
    },
  },
  {
    label: "Last 7 days",
    getRange: (): [Date, Date] => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return [startOfDay(from), endOfDay(now)];
    },
  },
  {
    label: "Last 30 days",
    getRange: (): [Date, Date] => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return [startOfDay(from), endOfDay(now)];
    },
  },
  {
    label: "This month",
    getRange: (): [Date, Date] => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return [startOfDay(from), endOfDay(now)];
    },
  },
  {
    label: "This year",
    getRange: (): [Date, Date] => {
      const now = new Date();
      const from = new Date(now.getFullYear(), 0, 1);
      return [startOfDay(from), endOfDay(now)];
    },
  },
] as const;

/** Resolve active preset label from a date range value */
export function getDatePresetLabel(value: [Date, Date]): string | null {
  return (
    DATE_PRESETS.find((p) => {
      const [from, to] = p.getRange();
      return (
        from.toDateString() === value[0].toDateString() &&
        to.toDateString() === value[1].toDateString()
      );
    })?.label ?? null
  );
}

// ── Popover content (reusable with any trigger) ───────────────────────

export function DateFilterContent({
  value,
  onChange,
}: {
  value: [Date, Date] | null;
  onChange: (range: [Date, Date] | null) => void;
}) {
  const dateRange: DateRange | undefined = value
    ? { from: value[0], to: value[1] }
    : undefined;

  const activePreset = React.useMemo(
    () => (value ? getDatePresetLabel(value) : null),
    [value],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.getRange())}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              activePreset === preset.label
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted text-muted-foreground",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <Calendar
        mode="range"
        selected={dateRange}
        onSelect={(range) => {
          if (range?.from && range?.to) {
            onChange([startOfDay(range.from), endOfDay(range.to)]);
          }
        }}
        numberOfMonths={2}
        disabled={{ after: new Date() }}
        captionLayout="dropdown"
      />

      {value && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full text-xs"
          onClick={() => onChange(null)}
        >
          Clear filter
        </Button>
      )}
    </div>
  );
}
