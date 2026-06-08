"use client";

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PartnersTabsProps {
  partnersSlot: ReactNode;
  partnerTypesSlot: ReactNode;
}

/**
 * Client tab shell for the Partners page: [Partners | Partner Types].
 * Both panels are rendered server-side and passed in as slots; the tabs only
 * toggle visibility. Partner-type CRUD controls inside the second slot are
 * permission-gated on partners:create / edit / delete.
 */
export function PartnersTabs({ partnersSlot, partnerTypesSlot }: PartnersTabsProps) {
  return (
    <Tabs defaultValue="partners">
      <TabsList>
        <TabsTrigger value="partners">Partners</TabsTrigger>
        <TabsTrigger value="types">Partner Types</TabsTrigger>
      </TabsList>
      <TabsContent value="partners" className="mt-4">
        {partnersSlot}
      </TabsContent>
      <TabsContent value="types" className="mt-4">
        {partnerTypesSlot}
      </TabsContent>
    </Tabs>
  );
}
