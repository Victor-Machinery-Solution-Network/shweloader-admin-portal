import { Suspense } from "react";
import { TemplateEditor } from "@/components/features/listing-templates/template-editor";
import { EditorHtmlLock } from "@/components/features/listings/shared/editor-html-lock";
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
        <div className="flex flex-1 min-h-0 flex-col">
          <EditorHtmlLock />
          <TemplateEditor />
        </div>
      </PermissionGate>
    </Suspense>
  );
}
