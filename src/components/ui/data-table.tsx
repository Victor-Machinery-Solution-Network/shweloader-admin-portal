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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
  type DraggableAttributes,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
} from "lucide-react";

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
  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="ml-1 size-3.5" />
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
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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

// --- Drag & Drop row reordering ---
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
      className="text-muted-foreground hover:text-foreground flex cursor-grab items-center touch-none active:cursor-grabbing"
    >
      <GripVertical className="size-4" />
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

function SortableRow({
  id,
  ...props
}: { id: UniqueIdentifier } & Omit<
  React.ComponentProps<typeof TableRow>,
  "id"
>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(
      transform ? { ...transform, x: 0 } : null,
    ),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <SortableRowContext.Provider
      value={{ attributes, listeners, setActivatorNodeRef }}
    >
      <TableRow ref={setNodeRef} style={style} {...props} />
    </SortableRowContext.Provider>
  );
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
  /** Enable drag-and-drop row reordering. Requires getRowId. Disables column sorting. */
  enableDragSort?: boolean;
  /** Unique ID getter for each row (required when enableDragSort is true) */
  getRowId?: (row: TData) => string | number;
  /** Called with the full data array in new order after a drag-and-drop reorder */
  onReorder?: (data: TData[]) => void;
  pageSize?: number;
  toolbar?: React.ReactNode | ((selectedRows: TData[]) => React.ReactNode);
}

function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  enableSelection = false,
  enablePagination = true,
  enableDragSort = false,
  getRowId,
  onReorder,
  pageSize = 10,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // --- Drag & Drop ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const sortableItems = React.useMemo<UniqueIdentifier[]>(
    () => (enableDragSort && getRowId ? data.map(getRowId) : []),
    [data, enableDragSort, getRowId],
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !getRowId) return;

      const oldIndex = data.findIndex((item) => getRowId(item) === active.id);
      const newIndex = data.findIndex((item) => getRowId(item) === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder?.(arrayMove([...data], oldIndex, newIndex));
      }
    },
    [data, getRowId, onReorder],
  );

  const allColumns = React.useMemo(() => {
    const cols: ColumnDef<TData, TValue>[] = [];
    if (enableDragSort)
      cols.push(getDragHandleColumn<TData>() as ColumnDef<TData, TValue>);
    if (enableSelection)
      cols.push(getSelectColumn<TData>() as ColumnDef<TData, TValue>);
    cols.push(...columns);
    return cols;
  }, [columns, enableSelection, enableDragSort]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: enableDragSort ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableSorting: !enableDragSort,
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
            {headerGroup.headers.map((header) => {
              const hasFixedSize = header.column.columnDef.maxSize !== undefined && header.column.columnDef.maxSize < 150;
              return (
                <TableHead
                  key={header.id}
                  style={hasFixedSize ? { width: header.column.getSize(), padding: '0 0.25rem' } : undefined}
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
            const cells = row
              .getVisibleCells()
              .map((cell) => {
                const hasFixedSize = cell.column.columnDef.maxSize !== undefined && cell.column.columnDef.maxSize < 150;
                return (
                  <TableCell
                    key={cell.id}
                    style={hasFixedSize ? { width: cell.column.getSize(), padding: '0 0.25rem' } : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              });

            return enableDragSort && getRowId ? (
              <SortableRow
                key={row.id}
                id={getRowId(row.original)}
                data-state={row.getIsSelected() ? "selected" : undefined}
              >
                {cells}
              </SortableRow>
            ) : (
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
    <DataTableContext.Provider value={{ clearSelection }}>
      <div className="space-y-4">
        {/* Toolbar */}
        {(searchKey || resolvedToolbar) && (
          <div className="flex items-center gap-2">
            {searchKey && (
              <Input
                placeholder={searchPlaceholder}
                value={
                  (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
                }
                onChange={(e) =>
                  table.getColumn(searchKey)?.setFilterValue(e.target.value)
                }
                className="max-w-xs"
              />
            )}
            {resolvedToolbar}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border">
          {enableDragSort ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortableItems}
                strategy={verticalListSortingStrategy}
              >
                {renderTableContent()}
              </SortableContext>
            </DndContext>
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
                {table.getFilteredRowModel().rows.length} row(s) selected
              </p>
            ) : (
              <div />
            )}

            {enablePagination && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-muted-foreground text-sm whitespace-nowrap">Rows per page</p>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                  >
                    <SelectTrigger size="sm" className="w-[70px]">
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

                <p className="text-muted-foreground text-sm whitespace-nowrap">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronsLeft className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DataTableContext.Provider>
  );
}

export { DataTable, DataTableColumnHeader, getSelectColumn, useDataTable };
export type { DataTableProps };
