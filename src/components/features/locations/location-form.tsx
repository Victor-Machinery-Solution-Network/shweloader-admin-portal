"use client";

import { useTransition } from "react";
import { MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { createLocation, updateLocation } from "@/lib/actions/location";
import type { Location } from "@/types/location";

interface LocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location;
}

export function LocationForm({
  open,
  onOpenChange,
  location,
}: LocationFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!location;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateLocation(location.location_id, formData)
        : await createLocation(formData);

      if (result.success) {
        toast.success(isEditing ? "Location updated" : "Location created");
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
      title={isEditing ? "Edit Location" : "Add Location"}
      description={
        isEditing
          ? "Update the location details."
          : "Create a new location."
      }
      icon={
        isEditing
          ? <Pencil className="text-primary size-6" />
          : <MapPin className="text-primary size-6" />
      }
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>City Name</FieldLabel>
          <FieldContent>
            <RequiredInput
              name="city_name"
              placeholder="e.g. Yangon"
              defaultValue={location?.city_name ?? ""}
              errorMessage="City name is required"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
