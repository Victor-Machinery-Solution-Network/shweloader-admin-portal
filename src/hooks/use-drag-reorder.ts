"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { keyBetween } from "@/lib/utils/display-order";
import {
  updateDisplayOrder,
  type OrderableTable,
} from "@/lib/actions/reorder";

interface UseDragReorderOptions<T> {
  /** Extract the unique row ID */
  getRowId: (row: T) => number;
  /** DB table name (must be in the ORDERABLE_TABLES whitelist) */
  tableName: OrderableTable;
  /** For scoped tables (e.g. carousel_image), the parent scope ID */
  scopeId?: number;
}

interface DragInfo {
  activeId: string | number;
  newIndex: number;
}

/**
 * Reusable hook for drag-and-drop reorder with fractional-indexing.
 *
 * Handles: local optimistic state, fractional key computation,
 * server action call, and rollback on error.
 */
export function useDragReorder<T extends { display_order: string }>(
  serverData: T[],
  options: UseDragReorderOptions<T>,
) {
  const { getRowId, tableName, scopeId } = options;
  const [data, setData] = useState(serverData);
  const [, startTransition] = useTransition();

  // Sync local state when server data changes (after create/delete/revalidation)
  useEffect(() => {
    setData(serverData);
  }, [serverData]);

  const handleReorder = useCallback(
    (reordered: T[], dragInfo: DragInfo) => {
      const { activeId, newIndex } = dragInfo;

      // Determine neighbor keys (excluding the moved item itself)
      const neighbors = reordered.filter(
        (item) => getRowId(item) !== Number(activeId),
      );
      const before =
        newIndex > 0 ? neighbors[newIndex - 1]?.display_order ?? null : null;
      const after =
        newIndex < neighbors.length
          ? neighbors[newIndex]?.display_order ?? null
          : null;

      const newKey = keyBetween(before, after);

      // Optimistic update
      setData(reordered);

      // Server: single row update
      const movedItemId =
        typeof activeId === "string" ? Number(activeId) : activeId;

      startTransition(async () => {
        const result = await updateDisplayOrder(
          tableName,
          movedItemId,
          newKey,
          scopeId,
        );
        if (!result.success) {
          toast.error(result.error ?? "Failed to reorder");
          setData(serverData); // rollback
        }
      });
    },
    [getRowId, tableName, scopeId, serverData, startTransition],
  );

  return { data, setData, handleReorder };
}
