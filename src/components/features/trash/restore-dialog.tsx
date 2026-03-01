"use client";

import { RotateCcw } from "lucide-react";
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

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
  isPending?: boolean;
}

export function RestoreDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType,
  isPending = false,
}: RestoreDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-green-600/10">
            <RotateCcw className="text-green-600" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Restore {itemType.toLowerCase()}?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{itemName}</strong> will be restored to its original
            location.
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
            className="bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600"
          >
            {isPending ? (
              <>
                <Spinner className="mr-1" /> Restoring{"\u2026"}
              </>
            ) : (
              <>
                <RotateCcw className="mr-1 size-4" /> Restore
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
