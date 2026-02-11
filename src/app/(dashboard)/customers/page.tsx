import { customerService, businessTypeService } from "@/lib/services/customer";
import { CustomersClient } from "@/components/features/customers/customers-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customers",
  description: "View registered customers",
};

export default async function CustomersPage() {
  const [customers, businessTypes] = await Promise.all([
    customerService.list({ sort_by: "created_at", order: "desc" }),
    businessTypeService.list({ sort_by: "name", order: "asc" }),
  ]);

  return (
    <CustomersClient customers={customers} businessTypes={businessTypes} />
  );
}
