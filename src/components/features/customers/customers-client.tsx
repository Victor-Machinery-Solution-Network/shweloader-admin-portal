"use client";

import { useState, useMemo, useCallback } from "react";
import { Users, Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BulkDeleteButton } from "@/components/shared/bulk-delete-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createColumns } from "./columns";
import { columns as businessTypeColumns } from "@/components/features/business-types/columns";
import { BusinessTypeForm } from "@/components/features/business-types/business-type-form";
import {
  deleteBusinessTypes,
  getCustomerCount,
} from "@/lib/actions/business-type";
import type { Customer, BusinessType } from "@/types/customer";

interface CustomersClientProps {
  customers: Customer[];
  businessTypes: BusinessType[];
}

export function CustomersClient({
  customers,
  businessTypes,
}: CustomersClientProps) {
  const [showCreateBT, setShowCreateBT] = useState(false);

  const customerColumns = useMemo(
    () => createColumns(businessTypes),
    [businessTypes],
  );

  const buildBTDescription = useCallback(async (selected: BusinessType[]) => {
    const ids = selected.map((bt) => bt.business_type_id);
    const counts = await getCustomerCount(ids);
    const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

    const names = selected.map((bt) => `"${bt.name}"`).join(", ");
    let msg = `This will permanently delete ${selected.length === 1 ? names : `${selected.length} business types (${names})`}.`;

    if (totalLinked > 0) {
      msg += ` There ${totalLinked === 1 ? "is" : "are"} ${totalLinked} ${totalLinked === 1 ? "customer" : "customers"} using ${selected.length === 1 ? "this business type" : "these business types"}.`;
    }

    return msg;
  }, []);

  const handleBulkDeleteBT = useCallback(async (selected: BusinessType[]) => {
    const ids = selected.map((bt) => bt.business_type_id);
    return deleteBusinessTypes(ids);
  }, []);

  const renderBTToolbar = useCallback(
    (selected: BusinessType[]) => (
      <>
        <BulkDeleteButton
          selectedRows={selected}
          onDelete={handleBulkDeleteBT}
          buildDescription={buildBTDescription}
          itemLabel="business type"
        />
        <Button onClick={() => setShowCreateBT(true)} className="ml-auto">
          <Plus /> Add Business Type
        </Button>
      </>
    ),
    [handleBulkDeleteBT, buildBTDescription],
  );

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customers and business types"
      />

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">
            <Users className="size-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="business-types">
            <Briefcase className="size-4" />
            Business Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          {customers.length > 0 ? (
            <DataTable
              columns={customerColumns}
              data={customers}
              searchKey="username"
              searchPlaceholder="Search customers…"
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
        </TabsContent>

        <TabsContent value="business-types">
          {businessTypes.length > 0 ? (
            <DataTable
              columns={businessTypeColumns}
              data={businessTypes}
              searchKey="name"
              searchPlaceholder="Search business types…"
              enableSelection
              enablePagination
              pageSize={10}
              toolbar={renderBTToolbar}
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No business types yet"
              description="Get started by creating your first business type."
              action={
                <Button onClick={() => setShowCreateBT(true)}>
                  <Plus /> Add Business Type
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <BusinessTypeForm open={showCreateBT} onOpenChange={setShowCreateBT} />
    </>
  );
}
