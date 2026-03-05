import { Suspense } from "react";
import { TemplateEditor } from "@/components/features/listing-templates/template-editor";
import { PermissionGate } from "@/components/shared/permission-gate";
import { EditorSkeleton } from "./skeleton";

export const metadata = {
  title: "New Template",
  description: "Create a new custom field template",
};

export default function NewTemplatePage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PermissionGate feature="listing_templates" permission="create">
        <TemplateEditor />
      </PermissionGate>
    </Suspense>
  );
}
