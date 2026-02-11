import { getPartnersWithDetails } from "@/lib/actions/partner";
import { PartnersClient } from "@/components/features/partners/partners-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Partners",
  description: "Review and manage partner applications",
};

export default async function PartnersPage() {
  const partners = await getPartnersWithDetails();

  return <PartnersClient partners={partners} />;
}
