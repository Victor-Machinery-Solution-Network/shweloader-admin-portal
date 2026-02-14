import { getCachedAnnouncements } from "@/lib/cache";
import { AnnouncementClient } from "@/components/features/announcement/announcement-client";

export const metadata = {
  title: "Announcement Bar",
  description: "Manage announcement bar",
};

export default async function AnnouncementBarPage() {
  const announcements = await getCachedAnnouncements();

  return <AnnouncementClient announcements={announcements} />;
}
