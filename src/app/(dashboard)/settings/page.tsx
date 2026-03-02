import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettings } from "@/lib/cache";
import { SettingsClient } from "@/components/features/settings/settings-client";
import { PermissionGate } from "@/components/shared/permission-gate";

export const metadata = {
  title: "General Settings",
  description: "Manage application settings",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="General Settings"
        description="Configure application-wide settings and feature toggles"
      />
      <Suspense fallback={<SettingsSkeleton />}>
        <PermissionGate feature="app_settings">
          <SettingsContent />
        </PermissionGate>
      </Suspense>
    </>
  );
}

async function SettingsContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.SETTINGS);

  const settings = await getSettings();

  return <SettingsClient settings={settings} />;
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Appearance section */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24 ml-1" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-lg border px-4 py-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-1 flex flex-col items-center">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Toggles section */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28 ml-1" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>

      {/* Currency section */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20 ml-1" />
        <div className="rounded-lg border px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 ml-11">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-7 w-10 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
