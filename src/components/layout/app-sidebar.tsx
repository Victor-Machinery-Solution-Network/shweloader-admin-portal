/**
 * Main application sidebar navigation
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  ChevronDown,
  BarChart,
  Wrench,
  Tag,
  MapPin,
  ShoppingCart,
  MessageSquare,
  UserCheck,
  FileText,
  FolderTree,
  Image,
  Megaphone,
  Shield,
  UserCog,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, User, CreditCard, LogOut, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AppSidebar() {
  const pathname = usePathname();

  // Collapsible state for each section
  const [isEquipmentOpen, setIsEquipmentOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isListingsOpen, setIsListingsOpen] = useState(false);
  const [isArticlesOpen, setIsArticlesOpen] = useState(false);

  // Active state helpers - parent items are never active, only submenu items
  const isEquipmentActive = false; // Submenu items handle their own active state

  const isAttachmentsActive = false; // Submenu items handle their own active state

  const isListingsActive = false; // Submenu items handle their own active state

  const isArticlesActive = false; // Submenu items handle their own active state

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Admin Portal</span>
            <span className="text-xs text-muted-foreground">Shweloader</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.DASHBOARD || pathname === ROUTES.DASHBOARD_OVERVIEW}>
                  <Link href={ROUTES.DASHBOARD}>
                    <LayoutDashboard />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.DASHBOARD_ANALYTICS}>
                  <Link href={ROUTES.DASHBOARD_ANALYTICS}>
                    <BarChart />
                    <span>Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Catalog Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Catalog Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Equipment */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isEquipmentActive}
                  onClick={() => setIsEquipmentOpen(!isEquipmentOpen)}
                >
                  <Wrench />
                  <span>Equipment</span>
                  <ChevronDown
                    className={`ml-auto transition-transform ${isEquipmentOpen ? '' : '-rotate-90'}`}
                  />
                </SidebarMenuButton>
                {isEquipmentOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.EQUIPMENT_MAIN_CATEGORIES}>
                        <Link href={ROUTES.EQUIPMENT_MAIN_CATEGORIES}>
                          <span>Main Categories</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.EQUIPMENT_SUB_CATEGORIES}>
                        <Link href={ROUTES.EQUIPMENT_SUB_CATEGORIES}>
                          <span>Sub Categories</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.EQUIPMENT_MODELS}>
                        <Link href={ROUTES.EQUIPMENT_MODELS}>
                          <span>Models</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Attachments */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isAttachmentsActive}
                  onClick={() => setIsAttachmentsOpen(!isAttachmentsOpen)}
                >
                  <Package />
                  <span>Attachments</span>
                  <ChevronDown
                    className={`ml-auto transition-transform ${isAttachmentsOpen ? '' : '-rotate-90'}`}
                  />
                </SidebarMenuButton>
                {isAttachmentsOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.ATTACHMENT_CATEGORIES}>
                        <Link href={ROUTES.ATTACHMENT_CATEGORIES}>
                          <span>Categories</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.ATTACHMENT_MODELS}>
                        <Link href={ROUTES.ATTACHMENT_MODELS}>
                          <span>Models</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Brands */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.BRANDS}>
                  <Link href={ROUTES.BRANDS}>
                    <Tag />
                    <span>Brands</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Locations */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.LOCATIONS}>
                  <Link href={ROUTES.LOCATIONS}>
                    <MapPin />
                    <span>Locations</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Marketplace Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Marketplace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Listings */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isListingsActive}
                  onClick={() => setIsListingsOpen(!isListingsOpen)}
                >
                  <ShoppingCart />
                  <span>Listings</span>
                  <ChevronDown
                    className={`ml-auto transition-transform ${isListingsOpen ? '' : '-rotate-90'}`}
                  />
                </SidebarMenuButton>
                {isListingsOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.LISTINGS_FOR_SALE}>
                        <Link href={ROUTES.LISTINGS_FOR_SALE}>
                          <span>For Sale</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.LISTINGS_FOR_RENT}>
                        <Link href={ROUTES.LISTINGS_FOR_RENT}>
                          <span>For Rent</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              {/* Enquiries */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.ENQUIRIES}>
                  <Link href={ROUTES.ENQUIRIES}>
                    <MessageSquare />
                    <span>Enquiries</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Users Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Users</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.CUSTOMERS}>
                  <Link href={ROUTES.CUSTOMERS}>
                    <Users />
                    <span>Customers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.PARTNERS}>
                  <Link href={ROUTES.PARTNERS}>
                    <UserCheck />
                    <span>Partners</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Articles */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isArticlesActive}
                  onClick={() => setIsArticlesOpen(!isArticlesOpen)}
                >
                  <FileText />
                  <span>Articles</span>
                  <ChevronDown
                    className={`ml-auto transition-transform ${isArticlesOpen ? '' : '-rotate-90'}`}
                  />
                </SidebarMenuButton>
                {isArticlesOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.ARTICLE_CATEGORIES}>
                        <Link href={ROUTES.ARTICLE_CATEGORIES}>
                          <span>Categories</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.POSTS}>
                        <Link href={ROUTES.POSTS}>
                          <span>Posts</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.CAROUSEL_IMAGES}>
                  <Link href={ROUTES.CAROUSEL_IMAGES}>
                    <Image />
                    <span>Carousel Images</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.ANNOUNCEMENT_BAR}>
                  <Link href={ROUTES.ANNOUNCEMENT_BAR}>
                    <Megaphone />
                    <span>Announcement Bar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.ADMINS}>
                  <Link href={ROUTES.ADMINS}>
                    <Shield />
                    <span>Admins</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.ROLES_PERMISSIONS}>
                  <Link href={ROUTES.ROLES_PERMISSIONS}>
                    <UserCog />
                    <span>Roles & Permissions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.SETTINGS}>
                  <Link href={ROUTES.SETTINGS}>
                    <Settings />
                    <span>General Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                >
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src="/avatars/user.png" alt="User" />
                    <AvatarFallback className="rounded-full">AD</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Admin User</span>
                    <span className="truncate text-xs text-muted-foreground">admin@shweloader.com</span>
                  </div>
                  <MoreVertical className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-full">
                      <AvatarImage src="/avatars/user.png" alt="User" />
                      <AvatarFallback className="rounded-full">AD</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-foreground">Admin User</span>
                      <span className="truncate text-xs text-muted-foreground">admin@shweloader.com</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
