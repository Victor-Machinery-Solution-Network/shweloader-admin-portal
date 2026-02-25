import { Suspense } from "react";
import { PermissionGate } from "@/components/shared/permission-gate";
import DashboardOverviewClient from "./overview-client";

export const metadata = {
  title: "UI Component Showcase",
  description: "All shadcn/ui primitives with every variant",
};

export default function DashboardOverviewPage() {
  return (
    <Suspense>
      <PermissionGate feature="dashboard">
        <DashboardOverviewClient />
      </PermissionGate>
    </Suspense>
  );
}
