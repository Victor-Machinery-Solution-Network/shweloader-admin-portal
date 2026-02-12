import { announcementTextService } from "@/lib/services/announcement";
import { AnnouncementClient } from "@/components/features/announcement/announcement-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Announcement Bar",
  description: "Manage announcement bar",
};

export default async function AnnouncementBarPage() {
  const announcements = await announcementTextService.list({
    sort_by: "display_order",
    order: "asc",
  });

  return <AnnouncementClient announcements={announcements} />;
}
