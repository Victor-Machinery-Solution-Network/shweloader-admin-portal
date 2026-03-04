"use client";

import { useState, useMemo, useTransition } from "react";
import { FolderOpen, Pencil, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { ImageInput } from "@/components/ui/image-input";
import { createSubCategory, updateSubCategory } from "@/lib/actions/equipment";
import type {
  EquipmentSubCategory,
  EquipmentMainCategory,
} from "@/types/equipment";

interface SubCategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subCategory?: EquipmentSubCategory;
  categories: EquipmentMainCategory[];
}

export function SubCategoryForm({
  open,
  onOpenChange,
  subCategory,
  categories,
}: SubCategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!subCategory;
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Build a name→id lookup map
  const categoryMap = new Map(categories.map((c) => [c.name, c.category_id]));

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories],
  );

  const defaultName = subCategory
    ? (categories.find((c) => c.category_id === subCategory.category_id)
        ?.name ?? "")
    : "";

  const [selectedName, setSelectedName] = useState<string>(defaultName);

  function handleSubmit(formData: FormData) {
    const categoryId = categoryMap.get(selectedName);
    if (!categoryId) {
      toast.error("Please select a main category");
      return;
    }
    formData.set("category_id", categoryId.toString());

    startTransition(async () => {
      const result = isEditing
        ? await updateSubCategory(subCategory.sub_category_id, formData)
        : await createSubCategory(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Sub category updated" : "Sub category created",
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
      title={isEditing ? "Edit Sub Category" : "Add Sub Category"}
      description={
        isEditing
          ? "Update the sub category details."
          : "Create a new sub category."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary-foreground size-6" />
          : <FolderOpen className="text-primary-foreground size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Main Category</FieldLabel>
          <FieldContent>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedName || "Select main category..."}
                  <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] min-w-60 p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                <Command>
                  <CommandInput placeholder="Search main category..." />
                  <CommandList className="max-h-60 overflow-y-auto overscroll-contain">
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      {categoryNames.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          data-checked={selectedName === name}
                          onSelect={() => {
                            setSelectedName(name);
                            setPopoverOpen(false);
                          }}
                        >
                          {name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel>Sub Category Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Mini Excavators"
              defaultValue={subCategory?.name ?? ""}
              errorMessage="Sub category name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel>Image</FieldLabel>
          <FieldContent>
            <ImageInput name="image_url" value={subCategory?.image_url} />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
