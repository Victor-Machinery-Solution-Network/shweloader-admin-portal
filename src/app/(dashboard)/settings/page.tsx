import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettings } from "@/lib/cache";
import { SettingsClient } from "@/components/features/settings/settings-client";

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
        <SettingsContent />
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-36 rounded-2xl" />
      <div className="flex justify-end">
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </div>
  );
}
