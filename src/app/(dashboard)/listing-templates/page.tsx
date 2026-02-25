import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getCustomFieldTemplates } from "@/lib/cache";
import { TemplatesClient } from "@/components/features/listing-templates/templates-client";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "Listing Templates",
  description: "Manage custom field templates for listings",
};

export default function ListingTemplatesPage() {
  return (
    <>
      <PageHeader
        title="Listing Templates"
        description="Create reusable sets of custom fields for listings"
      />
      <Suspense fallback={<DataTableSkeleton columns={5} />}>
        <PermissionGate feature="listing_templates">
          <TemplatesContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function TemplatesContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.CUSTOM_FIELD_TEMPLATES);

  const templates = await getCustomFieldTemplates();

  return <TemplatesClient templates={templates} />;
}
