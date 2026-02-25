"use client";

import * as React from "react";
import { ChevronLeft, ListFilter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { FilterConfig, ActiveFilters } from "@/types/data-table-filters";
import { FacetedFilterContent } from "./filter-multi-select";
import {
  DateFilterContent,
  formatDateShort,
  getDatePresetLabel,
} from "./filter-date-range";
import { NumberRangeFilterContent } from "./filter-number-range";

// ── Types ─────────────────────────────────────────────────────────────

interface FacetedValues {
  uniqueValues: Record<string, Map<string, number>>;
  minMaxValues: Record<string, [number, number]>;
}

// ── Filter Picker (two-level: filter list → filter content) ──────────

interface FilterPickerProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilters;
  onFilterChange: (columnId: string, value: unknown) => void;
  activeCount: number;
  facetedValues: FacetedValues;
}

export function FilterPicker({
  filters,
  activeFilters,
  onFilterChange,
  activeCount,
  facetedValues,
}: FilterPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // Defer badge render until after hydration (server has no localStorage → activeCount=0)
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Reset to list view when popover closes
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setSelectedId(null), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const selectedConfig = selectedId
    ? filters.find((f) => f.columnId === selectedId)
    : null;

  // Popover always p-0; inner sections handle their own padding
  const popoverWidth = !selectedConfig
    ? "w-52"
    : selectedConfig.type === "date-range"
      ? "w-auto"
      : selectedConfig.type === "number-range"
        ? "w-72"
        : "w-52";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <ListFilter className="size-4" />
          Filter
          {mounted && activeCount > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal"
              >
                {activeCount}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", popoverWidth)} align="start">
        {!selectedConfig ? (
          <FilterList
            filters={filters}
            activeFilters={activeFilters}
            onSelect={setSelectedId}
          />
        ) : (
          <FilterContentView
            config={selectedConfig}
            activeFilters={activeFilters}
            onFilterChange={onFilterChange}
            onBack={() => setSelectedId(null)}
            facetedValues={facetedValues}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Level 1: Filter list ─────────────────────────────────────────────

function FilterList({
  filters,
  activeFilters,
  onSelect,
}: {
  filters: FilterConfig[];
  activeFilters: ActiveFilters;
  onSelect: (columnId: string) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Filter by..." />
      <CommandList>
        <CommandEmpty>No filters found.</CommandEmpty>
        <CommandGroup>
          {filters.map((config) => {
            const hasValue = activeFilters[config.columnId] != null;
            const summary = hasValue
              ? getFilterSummary(config, activeFilters[config.columnId])
              : null;
            return (
              <CommandItem
                key={config.columnId}
                onSelect={() => onSelect(config.columnId)}
              >
                <span className="flex-1">{config.label}</span>
                {summary && (
                  <Badge variant="secondary" className="ml-auto max-w-[100px] truncate rounded-sm px-1.5 text-[10px] font-normal">
                    {summary}
                  </Badge>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// ── Level 2: Filter content with back button ─────────────────────────

function FilterContentView({
  config,
  activeFilters,
  onFilterChange,
  onBack,
  facetedValues,
}: {
  config: FilterConfig;
  activeFilters: ActiveFilters;
  onFilterChange: (columnId: string, value: unknown) => void;
  onBack: () => void;
  facetedValues: FacetedValues;
}) {
  // date-range and number-range need padding around content
  const needsContentPadding =
    config.type === "date-range" || config.type === "number-range";

  return (
    <div>
      {/* Header */}
      <div className="border-b px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          <span className="font-medium">{config.label}</span>
        </button>
      </div>
      {/* Content */}
      {needsContentPadding ? (
        <div className={config.type === "date-range" ? "p-3" : "p-4"}>
          <FilterContentDispatcher
            config={config}
            activeFilters={activeFilters}
            onFilterChange={onFilterChange}
            facetedValues={facetedValues}
          />
        </div>
      ) : (
        <FilterContentDispatcher
          config={config}
          activeFilters={activeFilters}
          onFilterChange={onFilterChange}
          facetedValues={facetedValues}
        />
      )}
    </div>
  );
}

// ── Content dispatcher (routes to the right filter UI) ───────────────

function FilterContentDispatcher({
  config,
  activeFilters,
  onFilterChange,
  facetedValues,
}: {
  config: FilterConfig;
  activeFilters: ActiveFilters;
  onFilterChange: (columnId: string, value: unknown) => void;
  facetedValues: FacetedValues;
}) {
  switch (config.type) {
    case "multi-select":
      return (
        <MultiSelectInPicker
          config={config}
          value={(activeFilters[config.columnId] as string[]) ?? []}
          onChange={(v) => onFilterChange(config.columnId, v.length > 0 ? v : undefined)}
          facetedValues={facetedValues}
          activeFilters={activeFilters}
        />
      );
    case "boolean":
      return (
        <BooleanInPicker
          config={config}
          value={(activeFilters[config.columnId] as string[]) ?? []}
          onChange={(v) => onFilterChange(config.columnId, v.length > 0 ? v : undefined)}
        />
      );
    case "date-range":
      return (
        <DateFilterContent
          value={(activeFilters[config.columnId] as [Date, Date]) ?? null}
          onChange={(v) => onFilterChange(config.columnId, v)}
        />
      );
    case "number-range": {
      const [facetMin, facetMax] =
        facetedValues.minMaxValues[config.columnId] ?? [0, 100];
      return (
        <NumberRangeFilterContent
          value={(activeFilters[config.columnId] as [number, number]) ?? null}
          onChange={(v) => onFilterChange(config.columnId, v)}
          min={config.min ?? facetMin}
          max={config.max ?? facetMax}
          step={config.step}
          unit={config.unit}
        />
      );
    }
    default:
      return null;
  }
}

// ── Multi-select with options resolution (for picker) ────────────────

function MultiSelectInPicker({
  config,
  value,
  onChange,
  facetedValues,
  activeFilters,
}: {
  config: Extract<FilterConfig, { type: "multi-select" }>;
  value: string[];
  onChange: (values: string[]) => void;
  facetedValues: FacetedValues;
  activeFilters: ActiveFilters;
}) {
  const options = React.useMemo(() => {
    if (config.options) {
      const counts = facetedValues.uniqueValues[config.columnId];
      return config.options.map((o) => ({
        label: o.label,
        value: o.value,
        count: counts?.get(o.value),
      }));
    }
    const unique = facetedValues.uniqueValues[config.columnId];
    if (!unique) return [];
    let entries = Array.from(unique.entries());
    if (config.cascadeFrom && config.cascadeMap) {
      const parentValues = activeFilters[config.cascadeFrom] as string[] | undefined;
      if (parentValues && parentValues.length > 0) {
        const allowed = new Set<string>();
        for (const pv of parentValues) {
          const children = config.cascadeMap[pv];
          if (children) children.forEach((c) => allowed.add(c));
        }
        entries = entries.filter(([val]) => allowed.has(val));
      }
    }
    return entries
      .filter(([val]) => val != null && val !== "")
      .map(([val, count]) => ({ label: String(val), value: String(val), count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [config, facetedValues, activeFilters]);

  return (
    <FacetedFilterContent
      label={config.label}
      options={options}
      selected={value}
      onChange={onChange}
    />
  );
}

// ── Boolean content (for picker) ─────────────────────────────────────

function BooleanInPicker({
  config,
  value,
  onChange,
}: {
  config: Extract<FilterConfig, { type: "boolean" }>;
  value: string[];
  onChange: (values: string[]) => void;
}) {
  const options = React.useMemo(
    () => [
      { label: config.trueLabel, value: config.trueValue ?? "1" },
      { label: config.falseLabel, value: config.falseValue ?? "0" },
    ],
    [config],
  );

  return (
    <FacetedFilterContent
      label={config.label}
      options={options}
      selected={value}
      onChange={onChange}
    />
  );
}

// ── Active Filter Chips (only renders for filters with values) ───────

interface ActiveFilterChipsProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilters;
  onFilterChange: (columnId: string, value: unknown) => void;
  onRemoveFilter: (columnId: string) => void;
  onClearAll: () => void;
  activeCount: number;
  facetedValues: FacetedValues;
}

export function ActiveFilterChips({
  filters,
  activeFilters,
  onFilterChange,
  onRemoveFilter,
  onClearAll,
  activeCount,
  facetedValues,
}: ActiveFilterChipsProps) {
  const activeConfigs = React.useMemo(
    () => filters.filter((f) => activeFilters[f.columnId] != null),
    [filters, activeFilters],
  );

  if (activeConfigs.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeConfigs.map((config) => (
        <CompactFilterChipDispatcher
          key={config.columnId}
          config={config}
          value={activeFilters[config.columnId]}
          onChange={(val) => onFilterChange(config.columnId, val)}
          onRemove={() => onRemoveFilter(config.columnId)}
          facetedValues={facetedValues}
          activeFilters={activeFilters}
        />
      ))}
      {activeCount > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 px-2 text-xs"
        >
          Clear all
          <X className="ml-1 size-3" />
        </Button>
      )}
    </div>
  );
}

// ── Compact Filter Chip (the pill wrapper) ───────────────────────────

function CompactFilterChip({
  label,
  summary,
  onRemove,
  children,
  popoverClassName,
}: {
  label: string;
  summary: string;
  onRemove: () => void;
  children: React.ReactNode;
  popoverClassName?: string;
}) {
  return (
    <div className="bg-background flex items-center rounded-lg border text-xs">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted/50 flex items-center gap-1 rounded-l-lg py-1 pl-2 pr-1.5 transition-colors"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="max-w-[150px] truncate font-medium">
              {summary}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={popoverClassName}
        >
          {children}
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center rounded-r-lg border-l py-1 pl-1 pr-1.5 transition-colors"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

// ── Chip Dispatcher ──────────────────────────────────────────────────

function CompactFilterChipDispatcher({
  config,
  value,
  onChange,
  onRemove,
  facetedValues,
  activeFilters,
}: {
  config: FilterConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  onRemove: () => void;
  facetedValues: FacetedValues;
  activeFilters: ActiveFilters;
}) {
  switch (config.type) {
    case "multi-select":
      return (
        <MultiSelectChip
          config={config}
          value={(value as string[]) ?? []}
          onChange={onChange}
          onRemove={onRemove}
          facetedValues={facetedValues}
          activeFilters={activeFilters}
        />
      );
    case "boolean":
      return (
        <BooleanChip
          config={config}
          value={(value as string[]) ?? []}
          onChange={onChange}
          onRemove={onRemove}
        />
      );
    case "date-range":
      return (
        <DateChip
          config={config}
          value={value as [Date, Date] | null}
          onChange={onChange}
          onRemove={onRemove}
        />
      );
    case "number-range":
      return (
        <NumberRangeChip
          config={config}
          value={value as [number, number] | null}
          onChange={onChange}
          onRemove={onRemove}
          facetedValues={facetedValues}
        />
      );
    default:
      return null;
  }
}

// ── Multi-Select Chip ────────────────────────────────────────────────

function MultiSelectChip({
  config,
  value,
  onChange,
  onRemove,
  facetedValues,
  activeFilters,
}: {
  config: Extract<FilterConfig, { type: "multi-select" }>;
  value: string[];
  onChange: (value: unknown) => void;
  onRemove: () => void;
  facetedValues: FacetedValues;
  activeFilters: ActiveFilters;
}) {
  const options = React.useMemo(() => {
    if (config.options) {
      const counts = facetedValues.uniqueValues[config.columnId];
      return config.options.map((o) => ({
        label: o.label,
        value: o.value,
        count: counts?.get(o.value),
      }));
    }
    const unique = facetedValues.uniqueValues[config.columnId];
    if (!unique) return [];
    let entries = Array.from(unique.entries());
    if (config.cascadeFrom && config.cascadeMap) {
      const parentValues = activeFilters[config.cascadeFrom] as string[] | undefined;
      if (parentValues && parentValues.length > 0) {
        const allowed = new Set<string>();
        for (const pv of parentValues) {
          const children = config.cascadeMap[pv];
          if (children) children.forEach((c) => allowed.add(c));
        }
        entries = entries.filter(([val]) => allowed.has(val));
      }
    }
    return entries
      .filter(([val]) => val != null && val !== "")
      .map(([val, count]) => ({ label: String(val), value: String(val), count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [config, facetedValues, activeFilters]);

  const summary = getMultiSelectSummary(config, value);

  return (
    <CompactFilterChip
      label={config.label}
      summary={summary}
      onRemove={onRemove}
      popoverClassName="w-52 p-0"
    >
      <FacetedFilterContent
        label={config.label}
        options={options}
        selected={value}
        onChange={(v) => onChange(v.length > 0 ? v : undefined)}
      />
    </CompactFilterChip>
  );
}

// ── Boolean Chip ─────────────────────────────────────────────────────

function BooleanChip({
  config,
  value,
  onChange,
  onRemove,
}: {
  config: Extract<FilterConfig, { type: "boolean" }>;
  value: string[];
  onChange: (value: unknown) => void;
  onRemove: () => void;
}) {
  const options = React.useMemo(
    () => [
      { label: config.trueLabel, value: config.trueValue ?? "1" },
      { label: config.falseLabel, value: config.falseValue ?? "0" },
    ],
    [config],
  );

  const summary = value
    .map((v) => {
      const match = options.find((o) => o.value === v);
      return match?.label ?? v;
    })
    .join(", ");

  return (
    <CompactFilterChip
      label={config.label}
      summary={summary}
      onRemove={onRemove}
      popoverClassName="w-52 p-0"
    >
      <FacetedFilterContent
        label={config.label}
        options={options}
        selected={value}
        onChange={(v) => onChange(v.length > 0 ? v : undefined)}
      />
    </CompactFilterChip>
  );
}

// ── Date Chip ────────────────────────────────────────────────────────

function DateChip({
  config,
  value,
  onChange,
  onRemove,
}: {
  config: Extract<FilterConfig, { type: "date-range" }>;
  value: [Date, Date] | null;
  onChange: (value: unknown) => void;
  onRemove: () => void;
}) {
  const summary = React.useMemo(() => {
    if (!value) return "";
    return (
      getDatePresetLabel(value) ??
      `${formatDateShort(value[0])} – ${formatDateShort(value[1])}`
    );
  }, [value]);

  return (
    <CompactFilterChip
      label={config.label}
      summary={summary}
      onRemove={onRemove}
      popoverClassName="w-auto p-3"
    >
      <DateFilterContent
        value={value}
        onChange={(v) => onChange(v)}
      />
    </CompactFilterChip>
  );
}

// ── Number Range Chip ────────────────────────────────────────────────

function NumberRangeChip({
  config,
  value,
  onChange,
  onRemove,
  facetedValues,
}: {
  config: Extract<FilterConfig, { type: "number-range" }>;
  value: [number, number] | null;
  onChange: (value: unknown) => void;
  onRemove: () => void;
  facetedValues: FacetedValues;
}) {
  const [facetMin, facetMax] =
    facetedValues.minMaxValues[config.columnId] ?? [0, 100];
  const min = config.min ?? facetMin;
  const max = config.max ?? facetMax;

  const fmt = (n: number) => {
    const s = n.toLocaleString();
    return config.unit ? `${s} ${config.unit}` : s;
  };

  const summary = value ? `${fmt(value[0])} – ${fmt(value[1])}` : "";

  return (
    <CompactFilterChip
      label={config.label}
      summary={summary}
      onRemove={onRemove}
      popoverClassName="w-72 p-4"
    >
      <NumberRangeFilterContent
        value={value}
        onChange={(v) => onChange(v)}
        min={min}
        max={max}
        step={config.step}
        unit={config.unit}
      />
    </CompactFilterChip>
  );
}

// ── Summary helpers ──────────────────────────────────────────────────

function getMultiSelectSummary(
  config: Extract<FilterConfig, { type: "multi-select" }>,
  value: string[],
): string {
  if (value.length === 0) return "";
  if (value.length === 1) {
    const opt = config.options?.find((o) => o.value === value[0]);
    return opt?.label ?? value[0];
  }
  return `${value.length} selected`;
}

function getFilterSummary(config: FilterConfig, value: unknown): string | null {
  if (value == null) return null;

  switch (config.type) {
    case "multi-select": {
      const arr = value as string[];
      if (arr.length === 0) return null;
      if (arr.length === 1) {
        const opt = config.options?.find((o) => o.value === arr[0]);
        return opt?.label ?? arr[0];
      }
      return `${arr.length}`;
    }
    case "boolean": {
      const arr = value as string[];
      if (arr.length === 0) return null;
      return arr
        .map((v) => {
          if (v === (config.trueValue ?? "1")) return config.trueLabel;
          if (v === (config.falseValue ?? "0")) return config.falseLabel;
          return v;
        })
        .join(", ");
    }
    case "date-range": {
      const [from, to] = value as [Date, Date];
      return getDatePresetLabel([from, to]) ?? `${formatDateShort(from)} – ${formatDateShort(to)}`;
    }
    case "number-range": {
      const [lo, hi] = value as [number, number];
      const fmt = (n: number) => {
        const s = n.toLocaleString();
        return config.unit ? `${s} ${config.unit}` : s;
      };
      return `${fmt(lo)} – ${fmt(hi)}`;
    }
    default:
      return null;
  }
}

// Re-export sub-components
export { FacetedFilterContent } from "./filter-multi-select";
export { DateFilterContent } from "./filter-date-range";
export { NumberRangeFilterContent } from "./filter-number-range";
