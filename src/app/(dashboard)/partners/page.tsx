import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { PermissionGate } from "@/components/shared/permission-gate";
import {
  getPartnersWithDetails,
  getPartnerTypes,
  getPromotableUsers,
} from "@/lib/cache";
import { PartnersClient } from "@/components/features/partners/partners-client";
import { PartnersTabs } from "@/components/features/partners/partners-tabs";
import { PartnerTypesClient } from "@/components/features/partner-types/partner-types-client";


export const metadata = {
  title: "Partners",
  description: "Review and manage partner applications",
};

export default function PartnersPage() {
  return (
    <>
      <PageHeader
        title="Partners"
        description="Review and manage partner applications"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PermissionGate feature="partners">
          <PartnersContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function PartnersContent() {
  "use cache";
  cacheLife({ stale: 120, revalidate: 120, expire: 1800 });
  cacheTag(CACHE_TAGS.PARTNERS, CACHE_TAGS.PARTNER_TYPES);

  const [partners, partnerTypes, promotableUsers] = await Promise.all([
    getPartnersWithDetails(),
    getPartnerTypes(),
    getPromotableUsers(),
  ]);

  return (
    <PartnersTabs
      partnersSlot={
        <PartnersClient
          partners={partners}
          partnerTypes={partnerTypes}
          initialUsers={promotableUsers}
        />
      }
      partnerTypesSlot={<PartnerTypesClient partnerTypes={partnerTypes} />}
    />
  );
}
