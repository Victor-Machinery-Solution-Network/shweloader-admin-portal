"use client";

import { ShieldOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UnblacklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  count: number;
  isPending?: boolean;
}

export function UnblacklistDialog({
  open,
  onOpenChange,
  onConfirm,
  count,
  isPending = false,
}: UnblacklistDialogProps) {
  const label = count === 1 ? "entry" : "entries";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-emerald-500/10">
            <ShieldOff className="text-emerald-600" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            Unblacklist {count} {label}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will restore the affected user(s) and their data (listings,
            enquiries, etc.).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Spinner className="mr-1" /> Restoring&hellip;
              </>
            ) : (
              "Confirm"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
