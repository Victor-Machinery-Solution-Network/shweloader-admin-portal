"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type VisibilityState,
  type FilterFn,
  type Row,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  X,
} from "lucide-react";
import type { DraggableAttributes } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { EditableOrderCell } from "@/components/ui/editable-order-cell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { FilterConfig } from "@/types/data-table-filters";
import { useDataTableFilters } from "@/hooks/use-data-table-filters";
import {
  FilterPicker,
  ActiveFilterChips,
} from "@/components/ui/data-table-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Lazy-load the dnd table module (only loaded when enableDragSort is true)
const LazyDndTable = React.lazy(() => import("./data-table-dnd"));

// Lazy-load the export button (only loaded when enableExport is true)
const LazyExportExcelButton = React.lazy(() =>
  import("@/components/shared/export-excel-button").then((m) => ({
    default: m.ExportExcelButton,
  })),
);

// --- Internal registry: maps column ID → display title (populated by DataTableColumnHeader) ---
const ColumnTitleRegistry = React.createContext<Map<string, string>>(new Map());

// --- Helper: sortable header ---
function DataTableColumnHeader<TData>({
  column,
  title,
  className,
}: {
  column: import("@tanstack/react-table").Column<TData, unknown>;
  title: string;
  className?: string;
}) {
  "use no memo"; // TanStack Table column is a mutable object — React Compiler must not cache method results
  // Register display title so the sort chip can show it
  const titleRegistry = React.useContext(ColumnTitleRegistry);
  titleRegistry.set(column.id, title);

  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8", sorted && "text-foreground", className)}
      onClick={() => {
        if (sorted === "desc") {
          column.clearSorting();
        } else {
          column.toggleSorting(sorted === "asc");
        }
      }}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 size-3.5" />
      ) : (
        <ArrowUpDown className="ml-1 size-3.5" />
      )}
    </Button>
  );
}

// --- Helper: select column ---
function getSelectColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomeRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => {
          if (value) {
            table.toggleAllPageRowsSelected(true);
          } else {
            table.toggleAllRowsSelected(false);
          }
        }}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    size: 32,
    minSize: 32,
    maxSize: 32,
    enableSorting: false,
    enableHiding: false,
  };
}

// --- Drag handle context (shared with data-table-dnd.tsx) ---
const SortableRowContext = React.createContext<{
  attributes: DraggableAttributes;
  listeners: Record<string, unknown> | undefined;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
}>({
  attributes: {} as DraggableAttributes,
  listeners: undefined,
  setActivatorNodeRef: () => {},
});

/** Drag handle rendered in each row when enableDragSort is true */
function DragHandle() {
  const { attributes, listeners, setActivatorNodeRef } =
    React.useContext(SortableRowContext);
  return (
    <button
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Reorder row"
      className="text-muted-foreground hover:text-foreground flex cursor-grab items-center touch-none active:cursor-grabbing"
    >
      <GripVertical className="size-4" aria-hidden="true" />
    </button>
  );
}

function getDragHandleColumn<TData>(): ColumnDef<TData> {
  return {
    id: "drag-handle",
    header: () => null,
    cell: () => <DragHandle />,
    size: 32,
    minSize: 32,
    maxSize: 32,
    enableSorting: false,
    enableHiding: false,
  };
}

// --- Pinned column helpers ---

/** Column IDs pinned to the left edge of the scroll container */
const PINNED_LEFT = new Set(["drag-handle", "select"]);
/** Column IDs pinned to the right edge */
const PINNED_RIGHT = new Set(["actions"]);
/** Rendered width (px) of each left-pinned column (content + padding) */
const PINNED_LEFT_WIDTH = 48;

function getStickyStyles(
  columnId: string,
  allColumnIds: string[],
  isHeader: boolean,
): React.CSSProperties | undefined {
  if (PINNED_LEFT.has(columnId)) {
    let offset = 0;
    for (const id of allColumnIds) {
      if (id === columnId) break;
      if (PINNED_LEFT.has(id)) offset += PINNED_LEFT_WIDTH;
    }
    return {
      position: "sticky",
      left: offset,
      zIndex: isHeader ? 3 : 2,
      width: PINNED_LEFT_WIDTH,
      minWidth: PINNED_LEFT_WIDTH,
    };
  }
  if (PINNED_RIGHT.has(columnId)) {
    return {
      position: "sticky",
      right: 0,
      zIndex: isHeader ? 3 : 2,
    };
  }
  return undefined;
}

/** Returns "left" | "right" for edge pinned columns (last left-pin, any right-pin) */
function getPinEdge(columnId: string, allColumnIds: string[]): string | undefined {
  if (PINNED_LEFT.has(columnId)) {
    const idx = allColumnIds.indexOf(columnId);
    const hasMoreLeft = allColumnIds.slice(idx + 1).some((id) => PINNED_LEFT.has(id));
    if (!hasMoreLeft) return "left";
  }
  if (PINNED_RIGHT.has(columnId)) return "right";
  return undefined;
}

// --- Context for child access to table actions ---
const DataTableContext = React.createContext<{ clearSelection: () => void }>({
  clearSelection: () => {},
});

/** Hook to access DataTable actions (e.g. clearSelection) from toolbar children */
function useDataTable() {
  return React.useContext(DataTableContext);
}

// --- Custom filter functions for the filter system ---

const multiSelectFilterFn: FilterFn<unknown> = (
  row: Row<unknown>,
  columnId: string,
  filterValue: unknown
) => {
  const selected = filterValue as string[];
  if (!selected || selected.length === 0) return true;
  const cellValue = row.getValue(columnId);
  // One-to-many columns expose an array of values (e.g. a row tagged with
  // multiple equipment sub-categories); match when any selected value overlaps.
  if (Array.isArray(cellValue)) {
    const cellSet = new Set(cellValue.map((v) => String(v)));
    return selected.some((s) => cellSet.has(s));
  }
  return selected.includes(String(cellValue ?? ""));
};

const dateRangeFilterFn: FilterFn<unknown> = (
  row: Row<unknown>,
  columnId: string,
  filterValue: unknown
) => {
  const [from, to] = filterValue as [Date, Date];
  if (!from || !to) return true;
  const cellValue = row.getValue(columnId);
  if (!cellValue) return false;
  const date = new Date(cellValue as string);
  if (isNaN(date.getTime())) return false;
  return date >= from && date <= to;
};

const numberRangeFilterFn: FilterFn<unknown> = (
  row: Row<unknown>,
  columnId: string,
  filterValue: unknown
) => {
  const [min, max] = filterValue as [number, number];
  const cellValue = row.getValue(columnId) as number;
  if (cellValue == null) return false;
  return cellValue >= min && cellValue <= max;
};

// --- Main DataTable ---
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Columns to search across simultaneously */
  searchKeys?: string[];
  searchPlaceholder?: string;
  enableSelection?: boolean;
  enablePagination?: boolean;
  /** Enable drag-and-drop row reordering. Requires getRowId. Column sorting is supported — clicking a sortable header temporarily hides drag handles; clicking the header a third time clears the sort and restores drag mode. */
  enableDragSort?: boolean;
  /** Unique ID getter for each row (required when enableDragSort is true) */
  getRowId?: (row: TData) => string | number;
  /** Called with the full data array in new order after a drag-and-drop reorder */
  onReorder?: (
    data: TData[],
    dragInfo: { activeId: string | number; newIndex: number },
  ) => void;
  /** Called when user edits position via inline edit on the No. column. Receives row ID + 1-indexed target position. */
  onMoveToPosition?: (
    itemId: string | number,
    targetPosition: number,
  ) => void;
  pageSize?: number;
  toolbar?: React.ReactNode | ((selectedRows: TData[]) => React.ReactNode);
  /** Declarative filter configuration — enables the filter popover */
  filterConfig?: FilterConfig[];
  /** localStorage key for persisting filter state across sessions */
  filterStorageKey?: string;
  /** Initial column visibility — use to hide filter-only columns */
  initialColumnVisibility?: VisibilityState;
  /** Enable Excel export button in the toolbar */
  enableExport?: boolean;
  /** File name for the exported Excel file (without extension) */
  exportFileName?: string;
  /** Called when a row is clicked. Receives the row data. */
  onRowClick?: (row: TData) => void;
  /**
   * When true, the table fills its flex parent's height instead of using a viewport-based max-height.
   * The parent must be a flex-col container with min-h-0 and a constrained height.
   */
  fillHeight?: boolean;
}

function DataTable<TData, TValue>({
  columns,
  data,
  searchKeys,
  searchPlaceholder = "Search",
  enableSelection = false,
  enablePagination = true,
  enableDragSort = false,
  getRowId,
  onReorder,
  onMoveToPosition,
  pageSize = 10,
  toolbar,
  filterConfig,
  filterStorageKey,
  initialColumnVisibility,
  enableExport = false,
  exportFileName,
  onRowClick,
  fillHeight = false,
}: DataTableProps<TData, TValue>) {
  "use no memo"; // TanStack Table uses a mutable table instance — React Compiler must not cache method results
  const columnTitlesRef = React.useRef(new Map<string, string>());
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility ?? {});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Global search state (for multi-column search)
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Custom global filter: case-insensitive substring match across EVERY
  // column's value, not just searchKeys — typing "caterpillar" matches the
  // Brand column even though it was never listed as a search key.
  // ponytail: date columns are skipped (DATE_COL) because a raw date string is
  // ambiguous to type/match; add per-table overrides only if a date search is
  // ever requested.
  const globalFilterFn = React.useCallback(
    (row: Row<TData>, _columnId: string, filterValue: string) => {
      if (!filterValue) return true;
      const term = String(filterValue).toLowerCase();
      const DATE_COL = /(^|_)(created|updated|deleted)(_|$)|_at$|date/i;
      return row.getAllCells().some((cell) => {
        if (DATE_COL.test(cell.column.id)) return false;
        const val = cell.getValue();
        return val != null && String(val).toLowerCase().includes(term);
      });
    },
    [],
  );

  // Filter system hook (always called, no-op when filterConfig is empty)
  const filterHook = useDataTableFilters({
    filters: filterConfig ?? [],
    storageKey: filterStorageKey,
  });

  // Column filters: hook-managed when filterConfig present, otherwise internal
  const columnFilters = filterConfig
    ? filterHook.columnFilters
    : internalColumnFilters;

  // Compute global position map for inline order editing (O(n) once, O(1) per cell)
  const globalPositionMap = React.useMemo(() => {
    if (!getRowId || !onMoveToPosition) return undefined;
    const map = new Map<string, number>();
    data.forEach((item, i) => map.set(String(getRowId(item)), i + 1));
    return map;
  }, [data, getRowId, onMoveToPosition]);

  // Auto-enhance the index column with inline editing when onMoveToPosition is provided
  const processedColumns = React.useMemo(() => {
    if (!onMoveToPosition || !enableDragSort) return columns;

    return columns.map((col) => {
      if (!("id" in col) || col.id !== "index") return col;
      return {
        ...col,
        cell: ({
          row,
          table: tbl,
        }: import("@tanstack/react-table").CellContext<TData, unknown>) => {
          const meta = tbl.options.meta as
            | {
                globalPositionMap?: Map<string, number>;
                totalItems?: number;
                onMoveToPosition?: (
                  id: string | number,
                  pos: number,
                ) => void;
              }
            | undefined;

          const position =
            meta?.globalPositionMap?.get(row.id) ?? row.index + 1;
          const totalItems = meta?.totalItems ?? 0;

          return (
            <EditableOrderCell
              position={position}
              totalItems={totalItems}
              onMove={(newPos) => meta?.onMoveToPosition?.(row.id, newPos)}
            />
          );
        },
      } as ColumnDef<TData, TValue>;
    });
  }, [columns, onMoveToPosition, enableDragSort]);

  // Inject custom filterFn into columns that have a filterConfig entry
  const filterConfigMap = React.useMemo(
    () =>
      filterConfig
        ? new Map(filterConfig.map((f) => [f.columnId, f]))
        : new Map<string, FilterConfig>(),
    [filterConfig],
  );

  const filteredColumns = React.useMemo(() => {
    if (!filterConfig || filterConfig.length === 0) return processedColumns;

    return processedColumns.map((col) => {
      const colId =
        "accessorKey" in col
          ? String(col.accessorKey)
          : "id" in col
            ? col.id
            : undefined;
      if (!colId) return col;

      const config = filterConfigMap.get(colId);
      if (!config) return col;

      let filterFn: FilterFn<TData> | undefined;
      switch (config.type) {
        case "multi-select":
        case "boolean":
          filterFn = multiSelectFilterFn as FilterFn<TData>;
          break;
        case "date-range":
          filterFn = dateRangeFilterFn as FilterFn<TData>;
          break;
        case "number-range":
          filterFn = numberRangeFilterFn as FilterFn<TData>;
          break;
      }

      if (!filterFn) return col;
      return { ...col, filterFn } as ColumnDef<TData, TValue>;
    });
  }, [processedColumns, filterConfig, filterConfigMap]);

  const allColumns = React.useMemo(() => {
    const cols: ColumnDef<TData, TValue>[] = [];
    if (enableDragSort)
      cols.push(getDragHandleColumn<TData>() as ColumnDef<TData, TValue>);
    if (enableSelection)
      cols.push(getSelectColumn<TData>() as ColumnDef<TData, TValue>);
    cols.push(...filteredColumns);
    return cols;
  }, [filteredColumns, enableSelection, enableDragSort]);

  const hasFilters = filterConfig && filterConfig.length > 0;

  const table = useReactTable({
    data,
    columns: allColumns,
    ...(getRowId && {
      getRowId: (row: TData) => String(getRowId(row)),
    }),
    meta: {
      globalPositionMap,
      totalItems: data.length,
      onMoveToPosition,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(hasFilters && {
      getFacetedUniqueValues: getFacetedUniqueValues(),
      getFacetedMinMaxValues: getFacetedMinMaxValues(),
    }),
    ...(searchKeys && {
      globalFilterFn: globalFilterFn as FilterFn<TData>,
    }),
    onSortingChange: setSorting,
    onColumnFiltersChange: filterConfig ? undefined : setInternalColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(searchKeys && { globalFilter }),
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const selectedRows = React.useMemo(
    () => table.getFilteredSelectedRowModel().rows.map((row) => row.original),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowSelection, data],
  );

  const resolvedToolbar =
    typeof toolbar === "function" ? toolbar(selectedRows) : toolbar;

  // --- Export support ---
  // Columns use `meta.exportValue(row)` for custom display values in exports.
  // Falls back to `row.getValue(col.id)` for simple accessor columns.
  // The "index" column auto-generates 1-based row numbers.
  // NOTE: computed via getters (not useMemo) so columnTitlesRef is read at
  // export-click time, after headers have rendered and registered their titles.
  const getExportColumns = React.useCallback(() => {
    if (!enableExport) return [];
    const SKIP_IDS = new Set(["select", "actions", "drag-handle"]);
    return table
      .getAllColumns()
      .filter((col) => !SKIP_IDS.has(col.id) && col.getIsVisible())
      .map((col) => ({
        key: col.id,
        header: columnTitlesRef.current.get(col.id)
          ?? (col.id === "index" ? "No." : col.id.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())),
        exportValue: (col.columnDef.meta as Record<string, unknown>)?.exportValue as
          | ((row: Row<TData>) => unknown)
          | undefined,
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableExport, columnVisibility]);

  const getExportData = React.useCallback(() => {
    if (!enableExport) return [];
    const cols = getExportColumns();
    return table.getFilteredRowModel().rows.map((row, rowIndex) => {
      const obj: Record<string, unknown> = {};
      for (const col of cols) {
        if (col.exportValue) {
          obj[col.key] = col.exportValue(row);
        } else if (col.key === "index") {
          obj[col.key] = rowIndex + 1;
        } else {
          obj[col.key] = row.getValue(col.key);
        }
      }
      return obj;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableExport, getExportColumns, data, globalFilter, columnFilters]);

  // Allow parent to clear selection by resetting when data changes
  const clearSelection = React.useCallback(() => setRowSelection({}), []);

  // Scroll-aware pinned column shadows
  const tableWrapperRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;
    const scrollEl = wrapper.querySelector<HTMLElement>('[data-slot="table-container"]');
    if (!scrollEl) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollEl;
      wrapper.toggleAttribute("data-scrolled-left", scrollLeft > 1);
      wrapper.toggleAttribute("data-scrolled-right", scrollLeft + clientWidth < scrollWidth - 1);
    };

    update();
    scrollEl.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(scrollEl);

    return () => {
      scrollEl.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  // Collect faceted values for filter popover
  const facetedValues = React.useMemo(() => {
    if (!hasFilters) return { uniqueValues: {}, minMaxValues: {} };

    const uniqueValues: Record<string, Map<string, number>> = {};
    const minMaxValues: Record<string, [number, number]> = {};

    for (const config of filterConfig!) {
      const col = table.getColumn(config.columnId);
      if (!col) continue;

      // Guard: skip columns without an accessor (getFacetedUniqueValues
      // internally calls getUniqueValues which returns undefined for
      // display-only columns, causing a "Cannot read 'length'" crash)
      if (!col.accessorFn) continue;

      if (
        config.type === "multi-select" ||
        config.type === "boolean"
      ) {
        const faceted = col.getFacetedUniqueValues();
        // Convert all keys to strings for consistency
        const stringMap = new Map<string, number>();
        faceted.forEach((count, key) => {
          if (key != null) stringMap.set(String(key), count);
        });
        uniqueValues[config.columnId] = stringMap;
      }

      if (config.type === "number-range") {
        const minMax = col.getFacetedMinMaxValues();
        if (minMax) {
          minMaxValues[config.columnId] = minMax as [number, number];
        }
      }
    }

    return { uniqueValues, minMaxValues };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFilters, filterConfig, data]);

  const renderTableContent = () => (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => {
          const visibleIds = headerGroup.headers.map((h) => h.column.id);
          return (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header, headerIdx) => {
                const colId = header.column.id;
                const isPinned = PINNED_LEFT.has(colId) || PINNED_RIGHT.has(colId);
                const stickyStyle = getStickyStyles(colId, visibleIds, true);
                const pinEdge = getPinEdge(colId, visibleIds);

                const hasFixedSize =
                  !isPinned &&
                  header.column.columnDef.maxSize !== undefined &&
                  header.column.columnDef.maxSize < 150;
                const minSize =
                  !isPinned && !hasFixedSize
                    ? header.column.columnDef.minSize
                    : undefined;
                const isLast = headerIdx === headerGroup.headers.length - 1;
                return (
                  <TableHead
                    key={header.id}
                    data-pin-edge={pinEdge}
                    className={cn(isPinned && "bg-muted")}
                    style={{
                      ...(hasFixedSize && {
                        width: header.column.getSize(),
                        padding: headerIdx === 0 ? "1rem" : "0 0.25rem",
                      }),
                      ...(minSize !== undefined && { minWidth: minSize }),
                      ...(isLast && !isPinned && { paddingRight: "1rem" }),
                      ...stickyStyle,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          );
        })}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const visibleCells = row.getVisibleCells();
            const visibleIds = visibleCells.map((c) => c.column.id);
            const cells = visibleCells.map((cell, cellIdx) => {
              const colId = cell.column.id;
              const isPinned = PINNED_LEFT.has(colId) || PINNED_RIGHT.has(colId);
              const stickyStyle = getStickyStyles(colId, visibleIds, false);
              const pinEdge = getPinEdge(colId, visibleIds);

              const hasFixedSize =
                !isPinned &&
                cell.column.columnDef.maxSize !== undefined &&
                cell.column.columnDef.maxSize < 150;
              const minSize =
                !isPinned && !hasFixedSize
                  ? cell.column.columnDef.minSize
                  : undefined;
              const isLast = cellIdx === visibleCells.length - 1;
              return (
                <TableCell
                  key={cell.id}
                  data-pin-edge={pinEdge}
                  className={cn(
                    isPinned && [
                      "bg-background",
                      "group-hover:bg-[color-mix(in_srgb,var(--muted)_50%,var(--background))]",
                      "group-data-[state=selected]:bg-muted",
                    ],
                  )}
                  style={{
                    ...(hasFixedSize && {
                      width: cell.column.getSize(),
                      padding: cellIdx === 0 ? "1rem" : "0 0.25rem",
                    }),
                    ...(minSize !== undefined && { minWidth: minSize }),
                    ...(isLast && !isPinned && { paddingRight: "1rem" }),
                    ...stickyStyle,
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            });

            return (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                onClick={
                  onRowClick
                    ? (e) => {
                        // Don't trigger row click if user clicked a button, link, input, or interactive element
                        const target = e.target as HTMLElement;
                        if (target.closest("button, a, input, select, [role='menuitem'], [data-no-row-click]")) return;
                        onRowClick(row.original);
                      }
                    : undefined
                }
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {cells}
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={allColumns.length} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <ColumnTitleRegistry.Provider value={columnTitlesRef.current}>
    <DataTableContext.Provider value={{ clearSelection }}>
      <div className={fillHeight ? "flex min-h-0 flex-1 flex-col gap-4" : "space-y-4"}>
        {/* Toolbar */}
        {(searchKeys || resolvedToolbar || enableExport || sorting.length > 0 || hasFilters) && (
          <div className="space-y-2">
            {/* Row 1: search + filter picker + sort chip + actions */}
            <div className="flex items-center gap-2">
              {searchKeys && (
                <Input
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  value={globalFilter}
                  onChange={(e) => {
                    setGlobalFilter(e.target.value);
                    if (enablePagination) table.setPageIndex(0);
                  }}
                  className="max-w-xs"
                />
              )}
              {hasFilters && (
                <FilterPicker
                  filters={filterConfig!}
                  activeFilters={filterHook.activeFilters}
                  onFilterChange={(columnId, value) => {
                    filterHook.setFilter(columnId, value);
                    if (enablePagination) table.setPageIndex(0);
                  }}
                  activeCount={filterHook.activeFilterCount}
                  facetedValues={facetedValues}
                />
              )}
              {sorting.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSorting([])}
                >
                  {columnTitlesRef.current.get(sorting[0].id) ?? sorting[0].id.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                  {sorting[0].desc ? " (Desc)" : " (Asc)"}
                  <X className="ml-1 size-3.5" />
                </Button>
              )}
              <div className="ml-auto flex items-center gap-2">
                {resolvedToolbar}
                {enableExport && (
                  <React.Suspense fallback={null}>
                    <LazyExportExcelButton
                      getData={getExportData}
                      getColumns={getExportColumns}
                      fileName={exportFileName}
                    />
                  </React.Suspense>
                )}
              </div>
            </div>

            {/* Row 2: active filter chips (only when filters have values) */}
            {hasFilters && (
              <ActiveFilterChips
                filters={filterConfig!}
                activeFilters={filterHook.activeFilters}
                onFilterChange={(columnId, value) => {
                  filterHook.setFilter(columnId, value);
                  if (enablePagination) table.setPageIndex(0);
                }}
                onRemoveFilter={(columnId) => {
                  filterHook.removeFilter(columnId);
                  if (enablePagination) table.setPageIndex(0);
                }}
                onClearAll={() => {
                  filterHook.clearAllFilters();
                  if (enablePagination) table.setPageIndex(0);
                }}
                activeCount={filterHook.activeFilterCount}
                facetedValues={facetedValues}
              />
            )}
          </div>
        )}

        {/* Table */}
        <div
          ref={tableWrapperRef}
          className={
            fillHeight
              ? "table-scroll min-h-0 flex-1 overflow-auto rounded-xl border"
              : "table-scroll max-h-[calc(100vh-300px)] overflow-auto rounded-xl border"
          }
        >
          {enableDragSort && getRowId ? (
            <React.Suspense fallback={renderTableContent()}>
              <LazyDndTable
                table={table}
                data={data}
                getRowId={getRowId as (row: unknown) => string | number}
                onReorder={onReorder as ((data: unknown[], dragInfo: { activeId: string | number; newIndex: number }) => void) | undefined}
                colCount={allColumns.length}
                onRowClick={onRowClick as ((row: unknown) => void) | undefined}
              />
            </React.Suspense>
          ) : (
            renderTableContent()
          )}
        </div>

        {/* Footer: selection count + pagination */}
        {(enableSelection || enablePagination) && (
          <div className="flex items-center justify-between">
            {enableSelection ? (
              <p className="text-muted-foreground text-sm">
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} rows selected
              </p>
            ) : (
              <div />
            )}

            {enablePagination && (
              <div className="flex items-center gap-6 lg:gap-8">
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground text-sm whitespace-nowrap">
                    Rows per page
                  </p>
                  <Select
                    value={String(table.getState().pagination.pageSize)}
                    onValueChange={(val) => table.setPageSize(Number(val))}
                  >
                    <SelectTrigger size="sm" className="w-auto min-w-0 gap-1 px-2.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" align="end">
                      {[5, 10, 20, 50, 100].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-muted-foreground text-sm whitespace-nowrap tabular-nums">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="First page"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronsLeft className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Previous page"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Next page"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Last page"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DataTableContext.Provider>
    </ColumnTitleRegistry.Provider>
  );
}

export {
  DataTable,
  DataTableColumnHeader,
  useDataTable,
  SortableRowContext,
  PINNED_LEFT,
  PINNED_RIGHT,
  getStickyStyles,
  getPinEdge,
};
