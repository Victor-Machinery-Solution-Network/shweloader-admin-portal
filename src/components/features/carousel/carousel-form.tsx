"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Images } from "lucide-react";
import { RequiredInput } from "@/components/ui/required-input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createCarousel,
  updateCarousel,
} from "@/lib/actions/carousel";
import type { Carousel } from "@/types/carousel";

interface CarouselFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carousel?: Carousel;
}

export function CarouselForm({
  open,
  onOpenChange,
  carousel,
}: CarouselFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!carousel;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateCarousel(carousel.carousel_id, formData)
        : await createCarousel(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Carousel updated" : "Carousel created",
        );
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Edit Carousel" : "Add Carousel"}
      description={
        isEditing
          ? "Update the carousel details."
          : "Create a new carousel to display images."
      }
      icon={<Images className="text-muted-foreground size-6" />}
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Carousel Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Home Page Hero"
              defaultValue={carousel?.name ?? ""}
              errorMessage="Carousel name is required"
            />
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel>Description (optional)</FieldLabel>
          <FieldContent>
            <Textarea
              name="description"
              placeholder="Brief description of this carousel..."
              defaultValue={carousel?.description ?? ""}
              rows={2}
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
