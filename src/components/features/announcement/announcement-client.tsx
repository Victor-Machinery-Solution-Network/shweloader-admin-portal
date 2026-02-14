"use client";

import { useCallback, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/shared/page-header";
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
  const [showCreate, setShowCreate] = useState(false);
  const { data, handleReorder } = useDragReorder(announcements, {
    getRowId: (r) => r.announcement_id,
    tableName: "announcement_text",
  });

  const handleBulkDelete = useCallback(async (selected: AnnouncementText[]) => {
    const ids = selected.map((a) => a.announcement_id);
    return deleteAnnouncements(ids);
  }, []);

  const buildDescription = useCallback(async (selected: AnnouncementText[]) => {
    const count = selected.length;
    const plural = count === 1 ? "announcement" : "announcements";
    return `This will permanently delete ${count} ${plural}. This action cannot be undone.`;
  }, []);

  const renderToolbar = useCallback(
    (selected: AnnouncementText[]) => (
      <>
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDelete}
          buildDescription={buildDescription}
          itemLabel="announcement"
        />
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus /> Create Announcement
        </Button>
      </>
    ),
    [handleBulkDelete, buildDescription],
  );

  return (
    <>
      <PageHeader
        title="Announcement Bar"
        description="Manage announcement messages shown on the website"
      />

      {data.length > 0 ? (
        <DataTable
          columns={columns}
          data={data}
          searchKey="text"
          searchPlaceholder="Search announcements…"
          enableSelection
          enablePagination
          enableDragSort
          getRowId={(row) => row.announcement_id}
          onReorder={handleReorder}
          pageSize={10}
          toolbar={renderToolbar}
        />
      ) : (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Create your first announcement message."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus /> Create Announcement
            </Button>
          }
        />
      )}

      <AnnouncementForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
