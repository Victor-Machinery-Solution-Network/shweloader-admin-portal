"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

// --- Context for child access to table actions ---
const DataTableContext = React.createContext<{ clearSelection: () => void }>({
  clearSelection: () => {},
});

/** Hook to access DataTable actions (e.g. clearSelection) from toolbar children */
function useDataTable() {
  return React.useContext(DataTableContext);
}

// --- Main DataTable ---
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
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
  pageSize?: number;
  toolbar?: React.ReactNode | ((selectedRows: TData[]) => React.ReactNode);
}

function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search",
  enableSelection = false,
  enablePagination = true,
  enableDragSort = false,
  getRowId,
  onReorder,
  pageSize = 10,
  toolbar,
}: DataTableProps<TData, TValue>) {
  "use no memo"; // TanStack Table uses a mutable table instance — React Compiler must not cache method results
  const columnTitlesRef = React.useRef(new Map<string, string>());
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // When drag-sort is enabled, column sorting and drag reordering coexist:
  // - No column sorted → drag handles visible, DnD active
  // - Column sorted → drag handles hidden, standard sorted table
  // Clicking a sorted column header cycles: asc → desc → clear (restores drag mode)
  const isColumnSorted = sorting.length > 0;

  const allColumns = React.useMemo(() => {
    const cols: ColumnDef<TData, TValue>[] = [];
    if (enableDragSort && !isColumnSorted)
      cols.push(getDragHandleColumn<TData>() as ColumnDef<TData, TValue>);
    if (enableSelection)
      cols.push(getSelectColumn<TData>() as ColumnDef<TData, TValue>);
    cols.push(...columns);
    return cols;
  }, [columns, enableSelection, enableDragSort, isColumnSorted]);

  const table = useReactTable({
    data,
    columns: allColumns,
    ...(getRowId && {
      getRowId: (row: TData) => String(getRowId(row)),
    }),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
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

  // Allow parent to clear selection by resetting when data changes
  const clearSelection = React.useCallback(() => setRowSelection({}), []);

  const renderTableContent = () => (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header, headerIdx) => {
              const hasFixedSize =
                header.column.columnDef.maxSize !== undefined &&
                header.column.columnDef.maxSize < 150;
              const isLast = headerIdx === headerGroup.headers.length - 1;
              return (
                <TableHead
                  key={header.id}
                  style={{
                    ...(hasFixedSize && {
                      width: header.column.getSize(),
                      padding: headerIdx === 0 ? "1rem" : "0 0.25rem",
                    }),
                    ...(isLast && { paddingRight: "1rem" }),
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
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const visibleCells = row.getVisibleCells();
            const cells = visibleCells.map((cell, cellIdx) => {
              const hasFixedSize =
                cell.column.columnDef.maxSize !== undefined &&
                cell.column.columnDef.maxSize < 150;
              const isLast = cellIdx === visibleCells.length - 1;
              return (
                <TableCell
                  key={cell.id}
                  style={{
                    ...(hasFixedSize && {
                      width: cell.column.getSize(),
                      padding: cellIdx === 0 ? "1rem" : "0 0.25rem",
                    }),
                    ...(isLast && { paddingRight: "1rem" }),
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
      <div className="space-y-4">
        {/* Toolbar */}
        {(searchKey || resolvedToolbar || sorting.length > 0) && (
          <div className="flex items-center gap-2">
            {searchKey && (
              <Input
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={
                  (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
                }
                onChange={(e) =>
                  table.getColumn(searchKey)?.setFilterValue(e.target.value)
                }
                className="max-w-xs"
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
            {resolvedToolbar}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border">
          {enableDragSort && getRowId && !isColumnSorted ? (
            <React.Suspense fallback={renderTableContent()}>
              <LazyDndTable
                table={table}
                data={data}
                getRowId={getRowId as (row: unknown) => string | number}
                onReorder={onReorder as ((data: unknown[], dragInfo: { activeId: string | number; newIndex: number }) => void) | undefined}
                colCount={allColumns.length}
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
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                  >
                    <SelectTrigger size="sm" className="w-17.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50].map((size) => (
                        <SelectItem key={size} value={`${size}`}>
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
  getSelectColumn,
  useDataTable,
  SortableRowContext,
};
export type { DataTableProps };
