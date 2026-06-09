"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePartnerType } from "@/lib/actions/partner";
import type { PartnerWithDetails } from "@/types/partner";

interface EditPartnerTypeDialogProps {
  partner: PartnerWithDetails;
  partnerTypes: { id: number; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Admin reclassification of an approved partner's partner type. Internal
 * correction — updates the record only (no notification). Save is enabled only
 * once a different, non-empty type is selected.
 */
export function EditPartnerTypeDialog({
  partner,
  partnerTypes,
  open,
  onOpenChange,
}: EditPartnerTypeDialogProps) {
  const initial = partner.partner_type_id
    ? String(partner.partner_type_id)
    : "";
  const [partnerTypeId, setPartnerTypeId] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const isUnchanged = Number(partnerTypeId) === partner.partner_type_id;
  const canSave = !!partnerTypeId && !isUnchanged && !isPending;

  function handleOpenChange(value: boolean) {
    if (isPending) return;
    if (!value) setPartnerTypeId(initial);
    onOpenChange(value);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updatePartnerType(partner.id, Number(partnerTypeId));
      if (result.success) {
        toast.success("Partner type updated");
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Failed to update partner type");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Edit Partner Type</DialogTitle>
          <DialogDescription>
            Change the partner type for {partner.user_name ?? "this partner"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="edit-partner-type">Partner Type</Label>
          <Select value={partnerTypeId} onValueChange={setPartnerTypeId}>
            <SelectTrigger id="edit-partner-type" className="w-full">
              <SelectValue placeholder="Select a partner type" />
            </SelectTrigger>
            <SelectContent>
              {partnerTypes.map((pt) => (
                <SelectItem key={pt.id} value={String(pt.id)}>
                  {pt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isPending ? <Spinner /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
