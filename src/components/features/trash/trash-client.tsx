"use client";

import { useCallback, useMemo } from "react";
import { Trash2, Package, MapPin, ShoppingCart, FileText, Users, Settings } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { DataTable } from "@/components/ui/data-table";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { BulkRestoreButton } from "./bulk-restore-button";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabCount } from "@/components/ui/tabs";
import { createTrashColumns } from "./trash-columns";
import { permanentDeleteItems, restoreItems } from "@/lib/actions/trash";
import { ENTITY_REGISTRY } from "@/lib/trash/entity-registry";
import type { TrashItem, TrashCounts, TrashGroup } from "@/types/trash";

interface TrashClientProps {
  items: TrashItem[];
  counts: TrashCounts;
}

const GROUPS: { value: TrashGroup; label: string; icon: typeof Trash2 }[] = [
  { value: "all", label: "All", icon: Trash2 },
  { value: "catalog", label: "Catalog", icon: Package },
  { value: "locations", label: "Locations", icon: MapPin },
  { value: "listings", label: "Listings", icon: ShoppingCart },
  { value: "content", label: "Content", icon: FileText },
  { value: "users", label: "Users", icon: Users },
  { value: "system", label: "System", icon: Settings },
];

function getGroupCount(counts: TrashCounts, group: TrashGroup): number {
  if (group === "all") {
    return Object.values(counts).reduce((sum, c) => sum + (c ?? 0), 0);
  }
  return Object.entries(ENTITY_REGISTRY)
    .filter(([, config]) => config.group === group)
    .reduce((sum, [type]) => sum + (counts[type as keyof TrashCounts] ?? 0), 0);
}

function filterByGroup(items: TrashItem[], group: TrashGroup): TrashItem[] {
  if (group === "all") return items;
  const types = new Set(
    Object.entries(ENTITY_REGISTRY)
      .filter(([, config]) => config.group === group)
      .map(([type]) => type),
  );
  return items.filter((item) => types.has(item.entity_type));
}

export function TrashClient({ items, counts }: TrashClientProps) {
  const canRestore = useHasPermission("trash", "restore");
  const canDelete = useHasPermission("trash", "delete");

  const columns = useMemo(() => createTrashColumns(), []);

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "entity_type",
        label: "Type",
        type: "multi-select",
      },
      {
        columnId: "deleted_by_name",
        label: "Deleted By",
        type: "multi-select",
      },
      {
        columnId: "deleted_at",
        label: "Deleted",
        type: "date-range",
      },
    ],
    [],
  );

  const handleBulkDelete = useCallback(
    async (selected: TrashItem[]) => {
      const mapped = selected.map((item) => ({
        entityType: item.entity_type,
        entityId: item.entity_id,
      }));
      return permanentDeleteItems(mapped);
    },
    [],
  );

  const handleBulkRestore = useCallback(
    async (selected: TrashItem[]) => {
      const mapped = selected.map((item) => ({
        entityType: item.entity_type,
        entityId: item.entity_id,
      }));
      return restoreItems(mapped);
    },
    [],
  );

  const buildDeleteDescription = useCallback(
    async (selected: TrashItem[]) => {
      const count = selected.length;
      const plural = count === 1 ? "item" : "items";
      return `This will permanently delete ${count} ${plural}. Associated files will also be removed. This action cannot be undone.`;
    },
    [],
  );

  const renderToolbar = useCallback(
    (selected: TrashItem[]) => (
      <>
        {canRestore && (
          <BulkRestoreButton
            selectedRows={selected}
            onRestore={handleBulkRestore}
          />
        )}
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDeleteDescription}
            itemLabel="item"
          />
        )}
      </>
    ),
    [handleBulkDelete, handleBulkRestore, buildDeleteDescription, canRestore, canDelete],
  );

  return (
    <Tabs defaultValue="all">
      <TabsList>
        {GROUPS.map(({ value, label, icon: Icon }) => {
          const count = getGroupCount(counts, value);
          return (
            <TabsTrigger key={value} value={value}>
              <Icon className="size-4" />
              {label}
              {count > 0 && <TabCount>{count}</TabCount>}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {GROUPS.map(({ value }) => {
        const groupItems = filterByGroup(items, value);
        return (
          <TabsContent key={value} value={value}>
            {groupItems.length > 0 ? (
              <DataTable
                columns={columns}
                data={groupItems}
                searchKeys={["entity_name"]}
                searchPlaceholder="Search deleted items"
                filterConfig={filterConfig}
                filterStorageKey={`trash-${value}-filters`}
                enableSelection
                enablePagination
                pageSize={20}
                getRowId={(row) => `${row.entity_type}-${row.entity_id}`}
                toolbar={renderToolbar}
              />
            ) : (
              <EmptyState
                icon={Trash2}
                title="Trash is empty"
                description={
                  value === "all"
                    ? "Deleted items will appear here for 30 days before being permanently removed."
                    : `No deleted ${value} items.`
                }
                fullPage={false}
              />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
