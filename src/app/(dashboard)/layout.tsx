/**
 * Dashboard layout - includes sidebar and header
 * Route group (dashboard) doesn't affect URLs
 * All pages under (dashboard) will have this layout
 */

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AuthSessionProvider } from '@/components/providers/session-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthSessionProvider>
  );
}
