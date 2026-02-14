import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { DataTableSkeleton } from "@/components/shared/loading-skeleton";
import { getAnnouncements } from "@/lib/cache";
import { AnnouncementClient } from "@/components/features/announcement/announcement-client";

export const metadata = {
  title: "Announcement Bar",
  description: "Manage announcement bar",
};

export default function AnnouncementBarPage() {
  return (
    <>
      <PageHeader
        title="Announcement Bar"
        description="Manage announcement messages shown on the website"
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <AnnouncementContent />
      </Suspense>
    </>
  );
}

async function AnnouncementContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag(CACHE_TAGS.ANNOUNCEMENTS);

  const announcements = await getAnnouncements();

  return <AnnouncementClient announcements={announcements} />;
}
