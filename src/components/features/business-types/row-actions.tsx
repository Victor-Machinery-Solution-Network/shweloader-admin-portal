"use client";

import { useState, useEffect, useTransition } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { BusinessTypeForm } from "./business-type-form";
import {
  deleteBusinessType,
  getCustomerCount,
} from "@/lib/actions/business-type";
import type { BusinessType } from "@/types/customer";

interface RowActionsProps {
  businessType: BusinessType;
}

export function RowActions({ businessType }: RowActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [linkedCount, setLinkedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!showDelete) return;
    let cancelled = false;
    getCustomerCount([businessType.business_type_id]).then((counts) => {
      if (!cancelled)
        setLinkedCount(counts[businessType.business_type_id] ?? 0);
    });
    return () => {
      cancelled = true;
      setLinkedCount(null);
    };
  }, [showDelete, businessType.business_type_id]);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBusinessType(businessType.business_type_id);
      if (result.success) {
        toast.success("Business type deleted");
        setShowDelete(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  const deleteDescription =
    linkedCount !== null && linkedCount > 0
      ? `This will permanently delete "${businessType.name}". There ${linkedCount === 1 ? "is" : "are"} ${linkedCount} ${linkedCount === 1 ? "customer" : "customers"} using this business type.`
      : `This will permanently delete "${businessType.name}". This action cannot be undone.`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs">
            <MoreHorizontal aria-hidden="true" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setShowEdit(true)}>
            <Pencil aria-hidden="true" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setShowDelete(true)}
          >
            <Trash2 aria-hidden="true" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showEdit && (
        <BusinessTypeForm
          open={showEdit}
          onOpenChange={setShowEdit}
          businessType={businessType}
        />
      )}

      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Delete business type?"
        description={deleteDescription}
        isPending={isPending}
      />
    </>
  );
}
