"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <div className="space-y-4">
        <Field orientation="vertical">
          <FieldLabel>City Name</FieldLabel>
          <FieldContent>
            <Input
              name="city_name"
              placeholder="e.g. Yangon"
              defaultValue={location?.city_name ?? ""}
              required
            />
          </FieldContent>
        </Field>
      </div>
    </FormDialog>
  );
}
