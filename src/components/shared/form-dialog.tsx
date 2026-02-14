"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormSubmittedContext } from "@/components/ui/required-input";
import { ComboboxPortalContext } from "@/components/ui/combobox";
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
  const [submitted, setSubmitted] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isPending) {
          if (!v) setSubmitted(false);
          onOpenChange(v);
        }
      }}
    >
      <DialogContent
        showCloseButton={!isPending}
        className={cn(
          "max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col",
          className,
        )}
      >
        <ComboboxPortalContext value={portalRef}>
          <DialogHeader className="items-center text-center">
            {icon && (
              <div className="bg-primary mx-auto flex size-12 items-center justify-center rounded-full">
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
              setSubmitted(true);
              if (!e.currentTarget.checkValidity()) return;
              onSubmit(new FormData(e.currentTarget));
            }}
          >
            <FormSubmittedContext value={submitted}>
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
                    <Spinner className="mr-1" /> Saving{'\u2026'}
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </DialogFooter>
            </FormSubmittedContext>
          </form>
          {/* Portal target for nested popovers (Combobox, etc.).
              Absolutely positioned so it doesn't affect form layout. */}
          <div ref={portalRef} className="absolute" />
        </ComboboxPortalContext>
      </DialogContent>
    </Dialog>
  );
}
