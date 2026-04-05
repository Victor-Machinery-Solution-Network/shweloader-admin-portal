"use client";

import { useCallback, useState } from "react";
import { Send } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { columns } from "./columns";
import { PromotionForm } from "./promotion-form";
import { deletePromotionPushes } from "@/lib/actions/promotion";
import type { PromotionPush } from "@/types/promotion";

interface PromotionClientProps {
  promotions: PromotionPush[];
}

export function PromotionClient({ promotions }: PromotionClientProps) {
  const canCreate = useHasPermission("promotions", "create");
  const canDelete = useHasPermission("promotions", "delete");
  const [showCreate, setShowCreate] = useState(false);

  const handleBulkDelete = useCallback(async (selected: PromotionPush[]) => {
    const ids = selected.map((p) => p.promotion_push_id);
    return deletePromotionPushes(ids);
  }, []);

  const buildDescription = useCallback(async (selected: PromotionPush[]) => {
    const count = selected.length;
    const plural = count === 1 ? "promotion" : "promotions";
    return `${count} ${plural} will be moved to the trash. You can restore them within 30 days.`;
  }, []);

  const renderToolbar = useCallback(
    (selected: PromotionPush[]) => (
      <>
        {canDelete && (
          <BulkDeleteButton
            selectedRows={selected}
            onDelete={handleBulkDelete}
            buildDescription={buildDescription}
            itemLabel="promotion"
          />
        )}
        {canCreate && (
          <Button className="ml-auto" onClick={() => setShowCreate(true)}>
            <Send /> Send Promotion
          </Button>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canCreate, canDelete],
  );

  return (
    <>
      {promotions.length > 0 ? (
        <DataTable
          columns={columns}
          data={promotions}
          searchKeys={["title", "body"]}
          searchPlaceholder="Search promotions"
          enableSelection
          enablePagination
          getRowId={(row) => row.promotion_push_id}
          pageSize={10}
          toolbar={renderToolbar}
          enableExport
          exportFileName="promotions"
        />
      ) : (
        <EmptyState
          icon={Send}
          title="No promotions sent yet"
          description="Send your first promotion push notification to all devices."
          action={
            canCreate ? (
              <Button onClick={() => setShowCreate(true)}>
                <Send /> Send Promotion
              </Button>
            ) : undefined
          }
        />
      )}

      <PromotionForm open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
