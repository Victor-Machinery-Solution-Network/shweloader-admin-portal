"use client";

import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  type Table as TanstackTable,
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
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableRowContext } from "./data-table";

// --- SortableRow ---
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

// --- DndTable: complete table with drag-and-drop ---
// Uses `any` for the table generic because React.lazy erases type parameters.
// The parent DataTable is still fully type-safe.
interface DndTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: TanstackTable<any>;
  data: unknown[];
  getRowId: (row: unknown) => string | number;
  onReorder?: (
    data: unknown[],
    dragInfo: { activeId: string | number; newIndex: number },
  ) => void;
  colCount: number;
}

function DndTable({
  table,
  data,
  getRowId,
  onReorder,
  colCount,
}: DndTableProps) {
  "use no memo"; // TanStack Table uses a mutable table instance — React Compiler must not cache method results
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const sortableItems = React.useMemo<UniqueIdentifier[]>(
    () => data.map(getRowId),
    [data, getRowId],
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = data.findIndex((item) => getRowId(item) === active.id);
      const newIndex = data.findIndex((item) => getRowId(item) === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove([...data], oldIndex, newIndex);
        onReorder?.(reordered, { activeId: active.id, newIndex });
      }
    },
    [data, getRowId, onReorder],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortableItems}
        strategy={verticalListSortingStrategy}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, headerIdx) => {
                  const hasFixedSize = header.column.columnDef.maxSize !== undefined && header.column.columnDef.maxSize < 150;
                  const isLast = headerIdx === headerGroup.headers.length - 1;
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        ...(hasFixedSize && {
                          width: header.column.getSize(),
                          padding: headerIdx === 0 ? '1rem' : '0 0.25rem',
                        }),
                        ...(isLast && { paddingRight: '1rem' }),
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
              table.getRowModel().rows.map((row) => (
                <SortableRow
                  key={row.id}
                  id={getRowId(row.original)}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell, cellIdx, cells) => {
                    const hasFixedSize = cell.column.columnDef.maxSize !== undefined && cell.column.columnDef.maxSize < 150;
                    const isLast = cellIdx === cells.length - 1;
                    return (
                      <TableCell
                        key={cell.id}
                        style={{
                          ...(hasFixedSize && {
                            width: cell.column.getSize(),
                            padding: cellIdx === 0 ? '1rem' : '0 0.25rem',
                          }),
                          ...(isLast && { paddingRight: '1rem' }),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </SortableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colCount} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SortableContext>
    </DndContext>
  );
}

export default DndTable;
