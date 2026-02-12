"use client";

import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onSubmit: (formData: FormData) => void;
  isPending?: boolean;
  submitLabel?: string;
  extraFooterAction?: React.ReactNode;
  className?: string;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  onSubmit,
  isPending = false,
  submitLabel = "Save",
  extraFooterAction,
  className,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isPending) onOpenChange(v);
      }}
    >
      <DialogContent
        showCloseButton={!isPending}
        className={cn(
          "max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col",
          className,
        )}
      >
        <DialogHeader className="items-center text-center">
          {icon && (
            <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
              {icon}
            </div>
          )}
          <DialogTitle className="text-xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="flex flex-1 flex-col min-h-0"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 pr-2.5">
            {children}
          </div>
          <DialogFooter className="mt-6">
            {extraFooterAction}
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-1" /> Saving...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
