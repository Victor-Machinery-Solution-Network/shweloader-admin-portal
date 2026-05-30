"use client";

import { useState, useTransition, useMemo } from "react";
import { Building2, Pencil } from "lucide-react";
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
import { createTownship, updateTownship } from "@/lib/actions/location";
import type { TownshipWithParents, StateRegion, District } from "@/types/location";

interface TownshipFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  township?: TownshipWithParents;
  stateRegions: StateRegion[];
  districts: District[];
}

export function TownshipForm({
  open,
  onOpenChange,
  township,
  stateRegions,
  districts,
}: TownshipFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!township;

  // State/Region lookup maps
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

  // District lookup maps
  const districtNameById = useMemo(
    () => new Map(districts.map((d) => [d.district_id, d.name])),
    [districts],
  );

  const defaultStateRegionName = township
    ? (stateRegionNameById.get(township.state_region_id) ?? "")
    : "";
  const defaultDistrictName = township
    ? (districtNameById.get(township.district_id) ?? "")
    : "";

  const [selectedStateRegionName, setSelectedStateRegionName] = useState(
    defaultStateRegionName,
  );
  const [selectedDistrictName, setSelectedDistrictName] = useState(
    defaultDistrictName,
  );

  const filteredDistricts = useMemo(() => {
    const srId = stateRegionIdByName.get(selectedStateRegionName);
    return srId
      ? districts.filter((d) => d.state_region_id === srId)
      : [];
  }, [districts, selectedStateRegionName, stateRegionIdByName]);

  const districtIdByName = useMemo(
    () => new Map(filteredDistricts.map((d) => [d.name, d.district_id])),
    [filteredDistricts],
  );
  const districtNames = useMemo(
    () => filteredDistricts.map((d) => d.name),
    [filteredDistricts],
  );

  function handleSubmit(formData: FormData) {
    const districtId = districtIdByName.get(selectedDistrictName);
    if (!districtId) return;
    formData.set("district_id", String(districtId));

    startTransition(async () => {
      const result = isEditing
        ? await updateTownship(township.township_id, formData)
        : await createTownship(formData);

      if (result.success) {
        toast.success(isEditing ? "Township updated" : "Township created");
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
      title={isEditing ? "Edit Township" : "Add Township"}
      description={
        isEditing
          ? "Update the township details."
          : "Create a new township."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary-foreground size-6" />
          : <Building2 className="text-primary-foreground size-6" />
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
                onValueChange={(val) => {
                  setSelectedStateRegionName(val ?? "");
                  setSelectedDistrictName("");
                }}
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
          <FieldLabel>District</FieldLabel>
          <FieldContent>
            <div className="space-y-1">
              <Combobox
                value={selectedDistrictName}
                onValueChange={(val) => setSelectedDistrictName(val ?? "")}
                items={districtNames}
              >
                <ComboboxInput
                  placeholder="Search district..."
                  showClear={!!selectedDistrictName}
                  disabled={!selectedStateRegionName}
                />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxEmpty>No district found</ComboboxEmpty>
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
              <FieldError show={!selectedDistrictName} message="Please select a district" />
            </div>
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Township Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name"
              placeholder="e.g. Tamwe"
              defaultValue={township?.name ?? ""}
              errorMessage="Township name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>Burmese Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="name_my"
              placeholder="e.g. တာမွေ"
              defaultValue={township?.name_my ?? ""}
              errorMessage="Burmese name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
