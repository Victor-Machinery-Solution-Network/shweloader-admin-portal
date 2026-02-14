import { getCachedPartnersWithDetails } from "@/lib/cache";
import { PartnersClient } from "@/components/features/partners/partners-client";


export const metadata = {
  title: "Partners",
  description: "Review and manage partner applications",
};

export default async function PartnersPage() {
  const partners = await getCachedPartnersWithDetails();

  return <PartnersClient partners={partners} />;
}
