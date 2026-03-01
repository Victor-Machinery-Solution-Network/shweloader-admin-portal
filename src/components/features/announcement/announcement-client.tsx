"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileText, FileSpreadsheet, Megaphone, Plus } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FilterConfig } from "@/types/data-table-filters";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { columns } from "./columns";
import { AnnouncementForm } from "./announcement-form";
import { deleteAnnouncements } from "@/lib/actions/announcement";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import type { AnnouncementText } from "@/types/announcement";

interface AnnouncementClientProps {
  announcements: AnnouncementText[];
}

export function AnnouncementClient({ announcements }: AnnouncementClientProps) {
  const canCreate = useHasPermission("announcements", "create");
  const canDelete = useHasPermission("announcements", "delete");
  const [showCreate, setShowCreate] = useState(false);
  const { data, handleReorder, handleMoveToPosition } = useDragReorder(
    announcements,
    {
      getRowId: (r) => r.announcement_id,
      tableName: "announcement_text",
      feature: "announcements",
    },
  );

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "is_active",
        label: "Status",
        type: "boolean",
        trueLabel: "Active",
        falseLabel: "Inactive",
      },
    ],
    [],
  );

  const handleBulkDelete = useCallback(async (selected: AnnouncementText[]) => {
    const ids = selected.map((a) => a.announcement_id);
    return deleteAnnouncements(ids);
  }, []);

  const buildDescription = useCallback(async (selected: AnnouncementText[]) => {
    const count = selected.length;
    const plural = count === 1 ? "announcement" : "announcements";
    return `${count} ${plural} will be moved to the trash. You can restore them within 30 days.`;
  }, []);

  const renderToolbar = useCallback(
    (selected: AnnouncementText[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="announcement"
          />
        )}
        {canCreate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="ml-auto">
                <Plus /> Create Announcement <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCreate(true)}>
                <FileText /> Fill Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bulk-upload/announcements">
                  <FileSpreadsheet /> Excel Upload
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canCreate, canDelete],
  );

  return (
    <>
      {data.length > 0 ? (
        <DataTable
          columns={columns}
          data={data}
          searchKeys={["text"]}
          searchPlaceholder="Search announcements"
          filterConfig={filterConfig}
          filterStorageKey="announcements-filters"
          enableSelection
          enablePagination
          enableDragSort
          getRowId={(row) => row.announcement_id}
          onReorder={handleReorder}
          onMoveToPosition={handleMoveToPosition}
          pageSize={10}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Create your first announcement message."
          action={
            canCreate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus /> Create Announcement <ChevronDown className="ml-1 size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => setShowCreate(true)}>
                    <FileText /> Fill Form
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bulk-upload/announcements">
                      <FileSpreadsheet /> Excel Upload
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
      )}

      <AnnouncementForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
