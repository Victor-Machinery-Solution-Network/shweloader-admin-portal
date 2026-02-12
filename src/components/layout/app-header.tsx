/**
 * Main application header
 */

'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Bell, User } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/overview': 'Overview',
  '/dashboard/analytics': 'Analytics',
  '/equipment/main-categories': 'Main Categories',
  '/equipment/sub-categories': 'Sub Categories',
  '/equipment/models': 'Equipment Models',
  '/attachments/categories': 'Attachment Categories',
  '/attachments/models': 'Attachment Models',
  '/brands': 'Brands',
  '/locations': 'Locations',
  '/listings/for-sale': 'Listings For Sale',
  '/listings/for-rent': 'Listings For Rent',
  '/enquiries': 'Enquiries',
  '/customers': 'Customers',
  '/partners': 'Partners',
  '/articles/categories': 'Article Categories',
  '/articles/posts': 'Posts',
  '/carousel-images': 'Carousel Images',
  '/announcement-bar': 'Announcement Bar',
  '/admins': 'Admins',
  '/roles-permissions': 'Roles & Permissions',
  '/settings': 'General Settings',
};

export function AppHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Dashboard';

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4 mx-2 !self-center" />
      <div className="flex flex-1 items-center justify-between">
        <h1 className="text-base font-medium text-pretty">{title}</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="User profile">
            <User className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
