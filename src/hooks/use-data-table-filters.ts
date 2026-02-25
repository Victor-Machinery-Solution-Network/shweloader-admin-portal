"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type {
  FilterConfig,
  ActiveFilters,
} from "@/types/data-table-filters";
import type { ColumnFiltersState } from "@tanstack/react-table";

// ── Serialization helpers ─────────────────────────────────────────────

function serializeValue(config: FilterConfig, value: unknown): string | null {
  if (value == null) return null;

  switch (config.type) {
    case "multi-select":
    case "boolean": {
      const arr = value as string[];
      return arr.length > 0 ? arr.join(",") : null;
    }
    case "date-range": {
      const [from, to] = value as [Date, Date];
      return `${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;
    }
    case "number-range": {
      const [lo, hi] = value as [number, number];
      return `${lo}_${hi}`;
    }
    default:
      return null;
  }
}

function deserializeValue(
  config: FilterConfig,
  raw: string
): unknown | undefined {
  if (!raw) return undefined;

  switch (config.type) {
    case "multi-select":
    case "boolean": {
      const arr = raw.split(",").filter(Boolean);
      return arr.length > 0 ? arr : undefined;
    }
    case "date-range": {
      const parts = raw.split("_");
      if (parts.length !== 2) return undefined;
      const from = new Date(parts[0] + "T00:00:00");
      const to = new Date(parts[1] + "T23:59:59.999");
      if (isNaN(from.getTime()) || isNaN(to.getTime())) return undefined;
      return [from, to] as [Date, Date];
    }
    case "number-range": {
      const parts = raw.split("_");
      if (parts.length !== 2) return undefined;
      const lo = Number(parts[0]);
      const hi = Number(parts[1]);
      if (isNaN(lo) || isNaN(hi)) return undefined;
      return [lo, hi] as [number, number];
    }
    default:
      return undefined;
  }
}

// ── localStorage helpers ──────────────────────────────────────────────

function loadFromStorage(
  storageKey: string,
  filters: FilterConfig[]
): ActiveFilters {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`dt-filter:${storageKey}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const configMap = new Map(filters.map((f) => [f.columnId, f]));
    const result: ActiveFilters = {};
    for (const [key, value] of Object.entries(parsed)) {
      const config = configMap.get(key);
      if (config) {
        const deserialized = deserializeValue(config, value);
        if (deserialized !== undefined) {
          result[key] = deserialized as ActiveFilters[string];
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}

function saveToStorage(
  storageKey: string,
  filters: FilterConfig[],
  activeFilters: ActiveFilters
) {
  if (typeof window === "undefined") return;
  try {
    const configMap = new Map(filters.map((f) => [f.columnId, f]));
    const serialized: Record<string, string> = {};
    for (const [key, value] of Object.entries(activeFilters)) {
      const config = configMap.get(key);
      if (config) {
        const s = serializeValue(config, value);
        if (s) serialized[key] = s;
      }
    }
    if (Object.keys(serialized).length > 0) {
      localStorage.setItem(`dt-filter:${storageKey}`, JSON.stringify(serialized));
    } else {
      localStorage.removeItem(`dt-filter:${storageKey}`);
    }
  } catch {
    // Ignore storage errors
  }
}

// ── URL param helpers ─────────────────────────────────────────────────

function loadFromUrl(
  searchParams: URLSearchParams,
  filters: FilterConfig[]
): ActiveFilters {
  const result: ActiveFilters = {};
  for (const config of filters) {
    const raw = searchParams.get(`f_${config.columnId}`);
    if (raw) {
      const value = deserializeValue(config, raw);
      if (value !== undefined) {
        result[config.columnId] = value as ActiveFilters[string];
      }
    }
  }
  return result;
}

function filtersToUrlParams(
  filters: FilterConfig[],
  activeFilters: ActiveFilters
): Record<string, string> {
  const configMap = new Map(filters.map((f) => [f.columnId, f]));
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(activeFilters)) {
    const config = configMap.get(key);
    if (config) {
      const s = serializeValue(config, value);
      if (s) params[`f_${config.columnId}`] = s;
    }
  }
  return params;
}

// ── Convert ActiveFilters → TanStack ColumnFiltersState ───────────────

function toColumnFilters(
  filters: FilterConfig[],
  activeFilters: ActiveFilters
): ColumnFiltersState {
  const result: ColumnFiltersState = [];
  const configMap = new Map(filters.map((f) => [f.columnId, f]));

  for (const [columnId, value] of Object.entries(activeFilters)) {
    if (value == null) continue;
    const config = configMap.get(columnId);
    if (!config) continue;

    // Store the raw value — custom filterFns in DataTable will handle matching
    result.push({ id: columnId, value });
  }

  return result;
}

// ── Hook ──────────────────────────────────────────────────────────────

interface UseDataTableFiltersOptions {
  filters: FilterConfig[];
  storageKey?: string;
}

interface UseDataTableFiltersReturn {
  activeFilters: ActiveFilters;
  columnFilters: ColumnFiltersState;
  setFilter: (columnId: string, value: unknown) => void;
  removeFilter: (columnId: string) => void;
  clearAllFilters: () => void;
  activeFilterCount: number;
}

export function useDataTableFilters({
  filters,
  storageKey,
}: UseDataTableFiltersOptions): UseDataTableFiltersReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initializedRef = useRef(false);

  // Initialize: URL params first, then localStorage, then empty
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(() => {
    // SSR safety
    if (typeof window === "undefined") return {};

    // 1. Try URL params
    const fromUrl = loadFromUrl(searchParams, filters);
    if (Object.keys(fromUrl).length > 0) return fromUrl;

    // 2. Try localStorage
    if (storageKey) {
      const fromStorage = loadFromStorage(storageKey, filters);
      if (Object.keys(fromStorage).length > 0) return fromStorage;
    }

    return {};
  });

  // Sync URL params when filters change (skip initial mount)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      // On first mount, if we loaded from localStorage, sync to URL
      if (Object.keys(activeFilters).length > 0) {
        const filterParams = filtersToUrlParams(filters, activeFilters);
        const hasFilterInUrl = filters.some((f) =>
          searchParams.has(`f_${f.columnId}`)
        );
        if (!hasFilterInUrl && Object.keys(filterParams).length > 0) {
          const params = new URLSearchParams(searchParams.toString());
          for (const [k, v] of Object.entries(filterParams)) params.set(k, v);
          router.replace(`?${params.toString()}`, { scroll: false });
        }
      }
      return;
    }

    // Normal update: sync to URL + localStorage
    const params = new URLSearchParams(searchParams.toString());

    // Remove all existing filter params
    for (const f of filters) {
      params.delete(`f_${f.columnId}`);
    }

    // Add active filter params
    const filterParams = filtersToUrlParams(filters, activeFilters);
    for (const [k, v] of Object.entries(filterParams)) {
      params.set(k, v);
    }

    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });

    // Save to localStorage
    if (storageKey) {
      saveToStorage(storageKey, filters, activeFilters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  const setFilter = useCallback((columnId: string, value: unknown) => {
    setActiveFilters((prev) => {
      if (value == null || (Array.isArray(value) && value.length === 0)) {
        const next = { ...prev };
        delete next[columnId];
        return next;
      }
      return { ...prev, [columnId]: value as ActiveFilters[string] };
    });
  }, []);

  const removeFilter = useCallback((columnId: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  const activeFilterCount = Object.keys(activeFilters).length;

  const columnFilters = useMemo(
    () => toColumnFilters(filters, activeFilters),
    [filters, activeFilters]
  );

  return {
    activeFilters,
    columnFilters,
    setFilter,
    removeFilter,
    clearAllFilters,
    activeFilterCount,
  };
}
