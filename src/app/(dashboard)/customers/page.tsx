import { getCachedCustomers, getCachedBusinessTypes } from "@/lib/cache";
import { CustomersClient } from "@/components/features/customers/customers-client";

export const metadata = {
  title: "Customers",
  description: "Manage customers and business types",
};

export default async function CustomersPage() {
  const [customers, businessTypes] = await Promise.all([
    getCachedCustomers(),
    getCachedBusinessTypes(),
  ]);

  return (
    <CustomersClient customers={customers} businessTypes={businessTypes} />
  );
}
