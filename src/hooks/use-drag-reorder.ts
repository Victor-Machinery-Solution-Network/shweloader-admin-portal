"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useTransition,
} from "react";
import { toast } from "sonner";
import { keyBetween, nKeysBetween } from "@/lib/utils/display-order";
import {
  updateDisplayOrder,
  type OrderableTable,
} from "@/lib/actions/reorder";

interface UseDragReorderOptions<T> {
  /** Extract the unique row ID */
  getRowId: (row: T) => number;
  /** DB table name (must be in the ORDERABLE_TABLES whitelist) */
  tableName: OrderableTable;
  /** RBAC feature name for permission checks */
  feature: string;
  /** For scoped tables (e.g. carousel_image), the parent scope ID */
  scopeId?: number;
}

interface DragInfo {
  activeId: string | number;
  newIndex: number;
}

/** Check if a display_order value is a valid fractional-indexing key */
function isValidFractionalKey(key: string | null): boolean {
  if (!key) return true; // null is fine (means start/end boundary)
  return /^[a-zA-Z][0-9A-Za-z]*$/.test(key);
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
  const { getRowId, tableName, feature, scopeId } = options;
  const [data, setData] = useState(serverData);
  const [, startTransition] = useTransition();
  // Track pending reorders so we don't overwrite optimistic state
  // when cache revalidation returns stale/old-order data.
  const pendingReorders = useRef(0);

  // Sync local state when server data changes (after create/delete/revalidation)
  useEffect(() => {
    if (pendingReorders.current > 0) return;
    setData(serverData);
  }, [serverData]);

  const handleReorder = useCallback(
    (reordered: T[], dragInfo: DragInfo) => {
      const { activeId, newIndex } = dragInfo;

      // Check if any display_order values are legacy (plain integers).
      // If so, reassign all items with fresh fractional-indexing keys.
      const hasLegacyKeys = reordered.some(
        (item) => !isValidFractionalKey(item.display_order),
      );

      if (hasLegacyKeys) {
        // Generate N fresh keys for the entire reordered list
        const freshKeys = nKeysBetween(null, null, reordered.length);
        const reorderedWithKeys = reordered.map((item, i) => ({
          ...item,
          display_order: freshKeys[i],
        }));

        pendingReorders.current++;
        setData(reorderedWithKeys);

        // Update ALL rows with their new fractional keys
        startTransition(async () => {
          const results = await Promise.all(
            reorderedWithKeys.map((item) =>
              updateDisplayOrder(
                tableName,
                getRowId(item),
                item.display_order,
                feature,
                scopeId,
              ),
            ),
          );
          pendingReorders.current--;
          const failed = results.find((r) => !r.success);
          if (failed) {
            toast.error(failed.error ?? "Failed to reorder");
            setData(serverData);
          }
        });
        return;
      }

      // Normal path: compute a single fractional key between neighbors
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

      pendingReorders.current++;
      setData(reordered);

      const movedItemId =
        typeof activeId === "string" ? Number(activeId) : activeId;

      startTransition(async () => {
        const result = await updateDisplayOrder(
          tableName,
          movedItemId,
          newKey,
          feature,
          scopeId,
        );
        pendingReorders.current--;
        if (!result.success) {
          toast.error(result.error ?? "Failed to reorder");
          setData(serverData); // rollback
        }
      });
    },
    [getRowId, tableName, feature, scopeId, serverData, startTransition],
  );

  const handleMoveToPosition = useCallback(
    (itemId: string | number, targetPosition: number) => {
      const numericId =
        typeof itemId === "string" ? Number(itemId) : itemId;
      const currentIndex = data.findIndex(
        (item) => getRowId(item) === numericId,
      );
      if (currentIndex === -1) return;

      const clamped = Math.max(
        1,
        Math.min(Math.floor(targetPosition), data.length),
      );
      const targetIndex = clamped - 1;
      if (targetIndex === currentIndex) return;

      // Reorder array (equivalent to arrayMove from dnd-kit)
      const reordered = [...data];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved);

      handleReorder(reordered, { activeId: numericId, newIndex: targetIndex });
    },
    [data, getRowId, handleReorder],
  );

  return { data, setData, handleReorder, handleMoveToPosition };
}
