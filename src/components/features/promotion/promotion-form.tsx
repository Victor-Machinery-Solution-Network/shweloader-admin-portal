"use client";

import { useState, useTransition } from "react";
import { Send, Package, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { sendPromotionPush } from "@/lib/actions/promotion";
import {
  ProductPickerModal,
  type SelectedListing,
} from "@/components/features/chat/product-picker-modal";
import { assetUrl } from "@/lib/r2-url";

interface PromotionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromotionForm({ open, onOpenChange }: PromotionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedListing, setSelectedListing] =
    useState<SelectedListing | null>(null);

  function handleSelect(listing: SelectedListing) {
    setSelectedListing(listing);
  }

  function handleClear() {
    setSelectedListing(null);
  }

  function handleSubmit(formData: FormData) {
    // Append listing data from state (not in DOM form fields)
    if (selectedListing) {
      formData.set("productListId", String(selectedListing.productListId));
    }

    startTransition(async () => {
      const result = await sendPromotionPush(formData);

      if (result.success) {
        toast.success("Promotion sent to all devices");
        setSelectedListing(null);
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={(v) => {
          if (!v) setSelectedListing(null);
          onOpenChange(v);
        }}
        title="Send Promotion"
        description="Send a push notification to all registered devices. The listing thumbnail will be used as the notification image."
        icon={<Send className="text-primary-foreground size-6" />}
        onSubmit={handleSubmit}
        isPending={isPending}
        submitLabel="Send to All Devices"
      >
        <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Title</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="title"
              placeholder="e.g. Weekend Special Deal!"
              errorMessage="Title is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Message</FieldLabel>
          <FieldContent>
            <Textarea
              name="body"
              placeholder="e.g. Get 20% off on all CAT excavators this weekend"
              required
              rows={3}
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Link to Listing (optional)</FieldLabel>
          <FieldContent>
            {selectedListing ? (
              <div className="flex items-center gap-3 rounded-lg border p-2.5">
                <div className="relative size-10 rounded-md overflow-hidden bg-muted shrink-0">
                  {selectedListing.thumbnail ? (
                    <Image
                      src={assetUrl(selectedListing.thumbnail) ?? ""}
                      alt={selectedListing.name ?? "Product"}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="size-full bg-muted flex items-center justify-center">
                      <Package className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {selectedListing.brandName && (
                    <p className="text-[10px] uppercase text-muted-foreground truncate">
                      {selectedListing.brandName}
                    </p>
                  )}
                  <p className="text-sm font-medium truncate">
                    {selectedListing.name ?? "Unnamed"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={handleClear}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setShowPicker(true)}
              >
                <Package className="size-4 mr-2" />
                Choose a listing...
              </Button>
            )}
          </FieldContent>
        </Field>
        </div>
      </FormDialog>

      <ProductPickerModal
        open={showPicker}
        onOpenChange={setShowPicker}
        onSelect={handleSelect}
      />
    </>
  );
}
