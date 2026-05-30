"use client";

import { useState, useTransition } from "react";
import { Map as MapIcon, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
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
import { createStateRegion, updateStateRegion } from "@/lib/actions/location";
import type { StateRegion } from "@/types/location";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "state", label: "State" },
  { value: "region", label: "Region" },
  { value: "union_territory", label: "Union Territory" },
];

const typeLabels = TYPE_OPTIONS.map((t) => t.label);
const labelToValue = new Map(TYPE_OPTIONS.map((t) => [t.label, t.value]));
const valueToLabel = new Map(TYPE_OPTIONS.map((t) => [t.value, t.label]));

interface StateRegionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stateRegion?: StateRegion;
}

export function StateRegionForm({
  open,
  onOpenChange,
  stateRegion,
}: StateRegionFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!stateRegion;

  const defaultTypeLabel = stateRegion?.type
    ? (valueToLabel.get(stateRegion.type) ?? "Region")
    : "Region";
  const [selectedTypeLabel, setSelectedTypeLabel] = useState<string>(defaultTypeLabel);

  function handleSubmit(formData: FormData) {
    const typeValue = labelToValue.get(selectedTypeLabel);
    if (typeValue) formData.set("type", typeValue);

    startTransition(async () => {
      const result = isEditing
        ? await updateStateRegion(stateRegion.state_region_id, formData)
        : await createStateRegion(formData);

      if (result.success) {
        toast.success(isEditing ? "State/Region updated" : "State/Region created");
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
      title={isEditing ? "Edit State/Region" : "Add State/Region"}
      description={
        isEditing
          ? "Update the state/region details."
          : "Create a new state or region."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary-foreground size-6" />
          : <MapIcon className="text-primary-foreground size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Yangon Region"
              defaultValue={stateRegion?.name ?? ""}
              errorMessage="Name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Burmese Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name_my"
              placeholder="e.g. ရန်ကုန်တိုင်း"
              defaultValue={stateRegion?.name_my ?? ""}
              errorMessage="Burmese name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Type</FieldLabel>
          <FieldContent>
            <Combobox
              value={selectedTypeLabel}
              onValueChange={(val) => setSelectedTypeLabel(val ?? "")}
              items={typeLabels}
            >
              <ComboboxInput
                placeholder="Search type..."
                showClear={!!selectedTypeLabel}
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No type found</ComboboxEmpty>
                  <ComboboxCollection>
                    {(label) => (
                      <ComboboxItem key={label} value={label}>
                        {label}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
