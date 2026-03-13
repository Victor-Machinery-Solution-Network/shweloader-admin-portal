/**
 * Dashboard layout - includes sidebar and header
 * Route group (dashboard) doesn't affect URLs
 * All pages under (dashboard) will have this layout
 *
 * With cacheComponents enabled (PPR):
 * - Static shell (sidebar, headers, nav) pre-rendered at build time
 * - Cached data (use cache) populated at build time for static pages,
 *   on first request for PPR pages, and shared across all routes
 * - updateTag in server actions for immediate invalidation after mutations
 */

import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AuthSessionProvider } from '@/components/providers/session-provider';
import { PermissionsProvider } from '@/components/providers/permissions-provider';
import { PusherProvider } from '@/components/providers/pusher-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
      <PermissionsProvider>
      <PusherProvider>
      <SidebarProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main id="main-content" className="flex min-w-0 flex-1 flex-col p-6 overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      </PusherProvider>
      </PermissionsProvider>
    </AuthSessionProvider>
  );
}
