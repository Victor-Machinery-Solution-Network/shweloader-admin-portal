import { PageHeader } from "@/components/shared/page-header";
import { NotificationsClient } from "@/components/features/notifications/notifications-client";

export const metadata = {
  title: "Notifications",
  description: "View all notifications",
};

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="View and manage your notifications"
      />
      <NotificationsClient />
    </>
  );
}
