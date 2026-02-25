import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BULK_UPLOAD_CONFIGS } from "@/lib/bulk-upload/config";
import { BulkUploadWizard } from "@/components/features/bulk-upload/bulk-upload-wizard";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";

const ENTITY_FEATURE_MAP: Record<string, string | string[]> = {
  brands: "brands",
  "equipment-models": "equipment_models",
  listings: ["sale_listings", "rent_listings"],
  "article-categories": "article_categories",
  "business-types": "users",
  announcements: "announcements",
  "state-regions": "locations",
  districts: "locations",
  locations: "locations",
  "equipment-main-categories": "equipment_main_categories",
  "equipment-sub-categories": "equipment_sub_categories",
  "attachment-categories": "attachment_categories",
  "attachment-models": "attachment_models",
};

export function generateStaticParams() {
  return Object.keys(BULK_UPLOAD_CONFIGS).map((entity) => ({ entity }));
}

export default function BulkUploadPage({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <BulkUploadContent params={params} />
    </Suspense>
  );
}

async function BulkUploadContent({
  params,
}: {
  params: Promise<{ entity: string }>;
}) {
  const { entity } = await params;
  const config = BULK_UPLOAD_CONFIGS[entity];
  if (!config) notFound();

  const feature = ENTITY_FEATURE_MAP[entity];
  if (!feature) notFound();

  return (
    <PermissionGate feature={feature} permission="create">
      <BulkUploadWizard config={config} />
    </PermissionGate>
  );
}
