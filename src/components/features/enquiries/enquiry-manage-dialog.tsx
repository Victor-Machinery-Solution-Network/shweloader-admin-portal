"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  updateEnquiryStatus,
  updateEnquiryNotes,
} from "@/lib/actions/enquiry";
import type {
  EnquiryWithDetails,
  EnquiryStatusType,
} from "@/types/enquiry";

interface EnquiryManageDialogProps {
  enquiry: EnquiryWithDetails;
  statusTypes: EnquiryStatusType[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnquiryManageDialog({
  enquiry,
  statusTypes,
  open,
  onOpenChange,
}: EnquiryManageDialogProps) {
  // Row-actions mounts this dialog conditionally per-row, so initial state
  // seeded from props is always fresh — no need to reset on open.
  const [statusId, setStatusId] = useState<number>(enquiry.status_id);
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(
    enquiry.close_outcome,
  );
  const [notes, setNotes] = useState<string>(enquiry.notes ?? "");
  const [isPending, startTransition] = useTransition();

  const closedStatus = statusTypes.find((s) => s.status_name === "Closed");
  const isClosed = closedStatus ? statusId === closedStatus.id : false;

  const statusChanged =
    statusId !== enquiry.status_id || outcome !== enquiry.close_outcome;
  const notesChanged = (notes.trim() || null) !== (enquiry.notes ?? null);
  const canSave = statusChanged || notesChanged;

  function handleSave() {
    if (isClosed && !outcome) {
      toast.error("Pick Won or Lost when closing an enquiry");
      return;
    }

    startTransition(async () => {
      // Run mutations in sequence: status first (clears outcome correctly on
      // non-Closed states), then notes. Both server actions invalidate the
      // ENQUIRIES tag, so the table refreshes once the transition flushes.
      if (statusChanged) {
        const r = await updateEnquiryStatus(enquiry.id, statusId, outcome);
        if (!r.success) {
          toast.error(r.error ?? "Failed to update status");
          return;
        }
      }

      if (notesChanged) {
        const r = await updateEnquiryNotes(enquiry.id, notes);
        if (!r.success) {
          toast.error(r.error ?? "Failed to update notes");
          return;
        }
      }

      toast.success("Enquiry updated");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isPending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Enquiry</DialogTitle>
          <DialogDescription>
            Update the status and notes for this product enquiry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={String(statusId)}
              onValueChange={(v) => {
                setStatusId(Number(v));
                // Reset outcome if leaving Closed state
                if (closedStatus && Number(v) !== closedStatus.id) {
                  setOutcome(null);
                }
              }}
              disabled={isPending}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusTypes.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.status_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Close outcome — only when status is 'Closed' */}
          {isClosed && (
            <div className="space-y-2">
              <Label>Outcome</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => setOutcome("won")}
                  className={cn(
                    "justify-center",
                    outcome === "won" &&
                      "border-emerald-500 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300",
                  )}
                >
                  <CheckCircle2 className="size-4" />
                  Won
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => setOutcome("lost")}
                  className={cn(
                    "justify-center",
                    outcome === "lost" &&
                      "border-rose-500 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300",
                  )}
                >
                  <XCircle className="size-4" />
                  Lost
                </Button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes — e.g. 'Called the customer, follow up Monday'"
              rows={5}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isPending}>
            {isPending && <Spinner className="size-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
