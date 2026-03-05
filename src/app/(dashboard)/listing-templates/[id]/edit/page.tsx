import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { getCustomFieldTemplateById } from "@/lib/cache";
import { TemplateEditor } from "@/components/features/listing-templates/template-editor";
import { PermissionGate } from "@/components/shared/permission-gate";
import { EditorSkeleton } from "../../new/skeleton";

export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <PermissionGate feature="listing_templates">
        <EditTemplateContent params={params} />
      </PermissionGate>
    </Suspense>
  );
}

async function EditTemplateContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.CUSTOM_FIELD_TEMPLATES);

  const { id } = await params;
  const template = await getCustomFieldTemplateById(Number(id));

  if (!template) notFound();

  return <TemplateEditor template={template} />;
}
