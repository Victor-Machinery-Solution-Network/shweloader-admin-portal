import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getCustomers, getBusinessTypes } from "@/lib/cache";
import { CustomersClient } from "@/components/features/customers/customers-client";

export const metadata = {
  title: "Customers",
  description: "Manage customers and business types",
};

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customers and business types"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <CustomersContent />
      </Suspense>
    </>
  );
}

async function CustomersContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.CUSTOMERS, CACHE_TAGS.BUSINESS_TYPES);

  const [customers, businessTypes] = await Promise.all([
    getCustomers(),
    getBusinessTypes(),
  ]);

  return (
    <CustomersClient customers={customers} businessTypes={businessTypes} />
  );
}
