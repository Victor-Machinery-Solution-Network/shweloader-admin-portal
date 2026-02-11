"use client";

import { Handshake } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { columns } from "./columns";
import type { PartnerWithDetails } from "@/types/partner";

interface PartnersClientProps {
  partners: PartnerWithDetails[];
}

export function PartnersClient({ partners }: PartnersClientProps) {
  return (
    <>
      <PageHeader
        title="Partners"
        description="Review and manage partner applications"
      />

      {partners.length > 0 ? (
        <DataTable
          columns={columns}
          data={partners}
          searchKey="customer_name"
          searchPlaceholder="Search partners..."
          enablePagination
          pageSize={10}
        />
      ) : (
        <EmptyState
          icon={Handshake}
          title="No partner applications yet"
          description="Partner applications will appear here when customers apply."
        />
      )}
    </>
  );
}
