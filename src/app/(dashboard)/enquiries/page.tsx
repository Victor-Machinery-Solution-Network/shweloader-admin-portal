import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import { getEnquiries, getEnquiryStatusTypes } from "@/lib/cache";
import { EnquiriesClient } from "@/components/features/enquiries/enquiries-client";

export const metadata = {
  title: "Enquiries",
  description: "Manage user enquiries",
};

export default function EnquiriesPage() {
  return (
    <>
      <PageHeader
        title="Enquiries"
        description="View and manage user enquiries"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="enquiries">
          <EnquiriesContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function EnquiriesContent() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(CACHE_TAGS.ENQUIRIES);

  const [enquiries, statusTypes] = await Promise.all([
    getEnquiries(),
    getEnquiryStatusTypes(),
  ]);

  return (
    <EnquiriesClient
      enquiries={enquiries}
      statusTypes={statusTypes}
    />
  );
}
