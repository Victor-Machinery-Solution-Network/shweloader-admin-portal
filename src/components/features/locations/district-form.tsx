"use client";

import { useState, useTransition, useMemo } from "react";
import { Landmark, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput, FieldError } from "@/components/ui/required-input";
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
import { createDistrict, updateDistrict } from "@/lib/actions/location";
import type { DistrictWithParent, StateRegion } from "@/types/location";

interface DistrictFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  district?: DistrictWithParent;
  stateRegions: StateRegion[];
}

export function DistrictForm({
  open,
  onOpenChange,
  district,
  stateRegions,
}: DistrictFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!district;

  const stateRegionIdByName = useMemo(
    () => new Map(stateRegions.map((sr) => [sr.name, sr.state_region_id])),
    [stateRegions],
  );
  const stateRegionNameById = useMemo(
    () => new Map(stateRegions.map((sr) => [sr.state_region_id, sr.name])),
    [stateRegions],
  );
  const stateRegionNames = useMemo(
    () => stateRegions.map((sr) => sr.name),
    [stateRegions],
  );

  const defaultStateRegionName = district
    ? (stateRegionNameById.get(district.state_region_id) ?? "")
    : "";

  const [selectedStateRegionName, setSelectedStateRegionName] = useState(
    defaultStateRegionName,
  );

  function handleSubmit(formData: FormData) {
    const stateRegionId = stateRegionIdByName.get(selectedStateRegionName);
    if (!stateRegionId) return;
    formData.set("state_region_id", String(stateRegionId));

    startTransition(async () => {
      const result = isEditing
        ? await updateDistrict(district.district_id, formData)
        : await createDistrict(formData);

      if (result.success) {
        toast.success(isEditing ? "District updated" : "District created");
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
      title={isEditing ? "Edit District" : "Add District"}
      description={
        isEditing
          ? "Update the district details."
          : "Create a new district."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary-foreground size-6" />
          : <Landmark className="text-primary-foreground size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>State / Region</FieldLabel>
          <FieldContent>
            <div className="space-y-1">
              <Combobox
                value={selectedStateRegionName}
                onValueChange={(val) => setSelectedStateRegionName(val ?? "")}
                items={stateRegionNames}
              >
                <ComboboxInput
                  placeholder="Search state / region..."
                  showClear={!!selectedStateRegionName}
                />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxEmpty>No state/region found</ComboboxEmpty>
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
              <FieldError show={!selectedStateRegionName} message="Please select a state / region" />
            </div>
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>District Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Yangon East"
              defaultValue={district?.name ?? ""}
              errorMessage="District name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
