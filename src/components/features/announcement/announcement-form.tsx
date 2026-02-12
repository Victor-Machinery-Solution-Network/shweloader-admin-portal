"use client";

import { useTransition } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  createAnnouncement,
  updateAnnouncement,
} from "@/lib/actions/announcement";
import type { AnnouncementText } from "@/types/announcement";

interface AnnouncementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: AnnouncementText;
}

export function AnnouncementForm({
  open,
  onOpenChange,
  announcement,
}: AnnouncementFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!announcement;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateAnnouncement(announcement.announcement_id, formData)
        : await createAnnouncement(formData);

      if (result.success) {
        toast.success(
          isEditing ? "Announcement updated" : "Announcement created",
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
      title={isEditing ? "Edit Announcement" : "Create Announcement"}
      description={
        isEditing
          ? "Update announcement text."
          : "Create a new announcement bar message."
      }
      icon={<Megaphone className="text-muted-foreground size-6" />}
      onSubmit={handleSubmit}
      isPending={isPending}
      submitLabel={isEditing ? "Update" : "Create"}
    >
      <Field orientation="vertical">
        <FieldLabel>Text</FieldLabel>
        <FieldContent>
          <RequiredInput
            name="text"
            placeholder="e.g. Weekend promotion is now live"
            defaultValue={announcement?.text ?? ""}
            errorMessage="Announcement text is required"
            autoComplete="off"
          />
        </FieldContent>
      </Field>
    </FormDialog>
  );
}
