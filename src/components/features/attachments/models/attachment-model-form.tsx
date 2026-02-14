"use client";

import { useState, useMemo, useTransition } from "react";
import { Pencil, Wrench } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { PdfInput } from "@/components/ui/pdf-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createAttachmentModel,
  updateAttachmentModel,
} from "@/lib/actions/attachment-model";
import type { AttachmentModel, AttachmentCategory } from "@/types/attachment";
import type { ProductBrand } from "@/types/brand";

interface AttachmentModelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model?: AttachmentModel;
  categories: AttachmentCategory[];
  brands: ProductBrand[];
}

export function AttachmentModelForm({
  open,
  onOpenChange,
  model,
  categories,
  brands,
}: AttachmentModelFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!model;

  const categoryMap = new Map(
    categories.map((c) => [c.name, c.category_id]),
  );
  const brandMap = new Map(brands.map((b) => [b.name, b.brand_id]));

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories],
  );
  const brandNames = useMemo(() => brands.map((b) => b.name), [brands]);

  const defaultCategoryName = model
    ? (categories.find((c) => c.category_id === model.category_id)?.name ?? "")
    : "";
  const defaultBrandName = model?.brand_id
    ? (brands.find((b) => b.brand_id === model.brand_id)?.name ?? "")
    : "";

  const [selectedCategory, setSelectedCategory] =
    useState<string>(defaultCategoryName);
  const [selectedBrand, setSelectedBrand] =
    useState<string>(defaultBrandName);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedCategory(defaultCategoryName);
      setSelectedBrand(defaultBrandName);
    }
    onOpenChange(nextOpen);
  };

  function handleSubmit(formData: FormData) {
    const categoryId = categoryMap.get(selectedCategory);
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }
    formData.set("category_id", categoryId.toString());

    const brandId = brandMap.get(selectedBrand);
    if (brandId) {
      formData.set("brand_id", brandId.toString());
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateAttachmentModel(model.model_id, formData)
        : await createAttachmentModel(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Attachment model updated" : "Attachment model created",
        );
        handleOpenChange(false);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? "Edit Attachment Model" : "Add Attachment Model"}
      description={
        isEditing
          ? "Update the attachment model details."
          : "Create a new attachment model."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary size-6" />
          : <Wrench className="text-primary size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Model Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. HB20G"
              defaultValue={model?.name ?? ""}
              errorMessage="Model name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Category</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedCategory}
              onValueChange={(val) => setSelectedCategory(val ?? "")}
              items={categoryNames}
            >
              <ComboboxInput
                placeholder="Search category…"
                showClear={!!selectedCategory}
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No category found</ComboboxEmpty>
                  <ComboboxCollection>
                    {(name) => (
                      <ComboboxItem key={name} value={name}>
                        {name}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Brand</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedBrand}
              onValueChange={(val) => setSelectedBrand(val ?? "")}
              items={brandNames}
            >
              <ComboboxInput
                placeholder="Search brand (optional)…"
                showClear={!!selectedBrand}
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No brand found</ComboboxEmpty>
                  <ComboboxCollection>
                    {(name) => (
                      <ComboboxItem key={name} value={name}>
                        {name}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>PDF Specification</FieldLabel>
          <FieldContent>
            <PdfInput
              name="pdf_url"
              value={model?.pdf_url ?? null}
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
