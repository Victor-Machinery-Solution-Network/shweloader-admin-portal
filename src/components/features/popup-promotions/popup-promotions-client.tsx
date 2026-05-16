"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { ROUTES } from "@/lib/constants";
import { deletePopupPromotions } from "@/lib/actions/popup-promotion";
import { useHasPermission } from "@/hooks/use-permissions";
import { columns } from "./columns";
import type { PopupPromotion } from "@/types/popup-promotion";

interface PopupPromotionsClientProps {
  promotions: PopupPromotion[];
}

export function PopupPromotionsClient({
  promotions,
}: PopupPromotionsClientProps) {
  const canDelete = useHasPermission("popup_promotions", "delete");
  const canCreate = useHasPermission("popup_promotions", "create");

  const handleBulkDelete = useCallback(
    async (selected: PopupPromotion[]) => {
      const ids = selected.map((p) => p.popup_promotion_id);
      return deletePopupPromotions(ids);
    },
    [],
  );

  const buildDescription = useCallback(async (selected: PopupPromotion[]) => {
    const count = selected.length;
    const plural = count === 1 ? "promotion" : "promotions";
    return `${count} ${plural} will be moved to the trash. You can restore them within 30 days.`;
  }, []);

  const renderToolbar = useCallback(
    (selected: PopupPromotion[]) => (
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
          <Button asChild className="ml-auto">
            <Link href={ROUTES.POPUP_PROMOTIONS_NEW}>
              <Plus /> Create Promotion
            </Link>
          </Button>
        )}
      </>
    ),
    [handleBulkDelete, buildDescription, canDelete, canCreate],
  );

  if (promotions.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No popup promotions yet"
        description="Create your first popup promotion to advertise inside the mobile app."
        action={
          <Button asChild>
            <Link href={ROUTES.POPUP_PROMOTIONS_NEW}>
              <Plus /> Create Promotion
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={promotions}
      searchKeys={["name"]}
      searchPlaceholder="Search promotions"
      enableSelection
      enablePagination
      pageSize={10}
      getRowId={(row) => row.popup_promotion_id}
      toolbar={renderToolbar}
      enableExport
      exportFileName="popup-promotions"
    />
  );
}
