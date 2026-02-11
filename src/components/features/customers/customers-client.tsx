"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { createColumns } from "./columns";
import type { Customer } from "@/types/customer";
import type { BusinessType } from "@/types/customer";

interface CustomersClientProps {
  customers: Customer[];
  businessTypes: BusinessType[];
}

export function CustomersClient({
  customers,
  businessTypes,
}: CustomersClientProps) {
  const columns = useMemo(
    () => createColumns(businessTypes),
    [businessTypes],
  );

  return (
    <>
      <PageHeader
        title="Customers"
        description="View registered customers"
      />

      {customers.length > 0 ? (
        <DataTable
          columns={columns}
          data={customers}
          searchKey="username"
          searchPlaceholder="Search customers..."
          enablePagination
          pageSize={10}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers will appear here once they register on the website."
        />
      )}
    </>
  );
}
