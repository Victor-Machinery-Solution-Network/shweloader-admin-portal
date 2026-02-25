import { Suspense } from "react";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: 'Dashboard Analytics',
  description: 'Analytics and insights for your admin portal',
};

export default function DashboardAnalyticsPage() {
  return (
    <Suspense>
      <PermissionGate feature="analytics">
        <div>
          {/* Content will be added here */}
        </div>
      </PermissionGate>
    </Suspense>
  );
}
