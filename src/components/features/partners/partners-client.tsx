"use client";

import { useMemo } from "react";
import { Handshake, Clock, ShieldCheck, ShieldX } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { approvedColumns, pendingColumns, rejectedColumns } from "./columns";
import type { PartnerWithDetails } from "@/types/partner";

interface PartnersClientProps {
  partners: PartnerWithDetails[];
}

export function PartnersClient({ partners }: PartnersClientProps) {
  const approvedPartners = useMemo(
    () => partners.filter((p) => p.status_name?.toLowerCase() === "approved"),
    [partners],
  );

  const pendingPartners = useMemo(
    () => partners.filter((p) => p.status_name?.toLowerCase() === "pending"),
    [partners],
  );

  const rejectedPartners = useMemo(
    () => partners.filter((p) => p.status_name?.toLowerCase() === "rejected"),
    [partners],
  );

  const pendingCount = pendingPartners.length;

  return (
    <>
      <Tabs defaultValue="partners">
        <TabsList>
          <TabsTrigger value="partners">
            <ShieldCheck className="size-4" />
            Partners
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="size-4" />
            Pending
            {pendingCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 size-5 justify-center p-0"
              >
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            <ShieldX className="size-4" />
            Rejected
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          {approvedPartners.length > 0 ? (
            <DataTable
              columns={approvedColumns}
              data={approvedPartners}
              searchKey="customer_name"
              searchPlaceholder="Search partners…"
              enablePagination
              pageSize={10}
            />
          ) : (
            <EmptyState
              icon={Handshake}
              title="No approved partners yet"
              description="Approved partners will appear here."
            />
          )}
        </TabsContent>

        <TabsContent value="pending">
          {pendingPartners.length > 0 ? (
            <DataTable
              columns={pendingColumns}
              data={pendingPartners}
              searchKey="customer_name"
              searchPlaceholder="Search pending applications…"
              enablePagination
              pageSize={10}
            />
          ) : (
            <EmptyState
              icon={Clock}
              title="No pending applications"
              description="All partner applications have been reviewed."
            />
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedPartners.length > 0 ? (
            <DataTable
              columns={rejectedColumns}
              data={rejectedPartners}
              searchKey="customer_name"
              searchPlaceholder="Search rejected applications…"
              enablePagination
              pageSize={10}
            />
          ) : (
            <EmptyState
              icon={ShieldX}
              title="No rejected applications"
              description="Rejected partner applications will appear here."
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
