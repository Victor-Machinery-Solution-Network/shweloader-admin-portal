/**
 * Main application sidebar navigation
 */

"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Image as ImageIcon,
  Megaphone,
  Shield,
  UserCog,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
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
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, User, LogOut, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { logoutAction } from "@/lib/actions/auth-actions";

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userName = session?.user?.name ?? "Admin User";
  const userEmail = session?.user?.email ?? "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Auto-open collapsible sections based on current route
  const isEquipmentActive = pathname.startsWith(ROUTES.EQUIPMENT);
  const isAttachmentsActive = pathname.startsWith(ROUTES.ATTACHMENTS);
  const isListingsActive = pathname.startsWith(ROUTES.LISTINGS);
  const isArticlesActive = pathname.startsWith("/articles");

  const [isEquipmentOpen, setIsEquipmentOpen] = useState(isEquipmentActive);
  const [isAttachmentsOpen, setIsAttachmentsOpen] =
    useState(isAttachmentsActive);
  const [isListingsOpen, setIsListingsOpen] = useState(isListingsActive);
  const [isArticlesOpen, setIsArticlesOpen] = useState(isArticlesActive);

  // Auto-expand collapsible sections when navigating to their child routes
  useEffect(() => {
    if (isEquipmentActive) setIsEquipmentOpen(true);
    if (isAttachmentsActive) setIsAttachmentsOpen(true);
    if (isListingsActive) setIsListingsOpen(true);
    if (isArticlesActive) setIsArticlesOpen(true);
  }, [pathname, isEquipmentActive, isAttachmentsActive, isListingsActive, isArticlesActive]);

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-4 w-4" aria-hidden="true" />
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
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === ROUTES.DASHBOARD ||
                    pathname === ROUTES.DASHBOARD_OVERVIEW
                  }
                >
                  <Link href={ROUTES.DASHBOARD}>
                    <LayoutDashboard aria-hidden="true" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.DASHBOARD_ANALYTICS}
                >
                  <Link href={ROUTES.DASHBOARD_ANALYTICS}>
                    <BarChart aria-hidden="true" />
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
                  onClick={() => setIsEquipmentOpen(!isEquipmentOpen)}
                >
                  <Wrench aria-hidden="true" />
                  <span>Equipment</span>
                  <ChevronDown
                    className={`ml-auto transition-transform ${isEquipmentOpen ? "" : "-rotate-90"}`}
                    aria-hidden="true"
                  />
                </SidebarMenuButton>
                {isEquipmentOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === ROUTES.EQUIPMENT_MAIN_CATEGORIES}
                      >
                        <Link href={ROUTES.EQUIPMENT_MAIN_CATEGORIES}>
                          <span>Main Categories</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === ROUTES.EQUIPMENT_SUB_CATEGORIES}
                      >
                        <Link href={ROUTES.EQUIPMENT_SUB_CATEGORIES}>
                          <span>Sub Categories</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === ROUTES.EQUIPMENT_MODELS}
                      >
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
                  onClick={() => setIsAttachmentsOpen(!isAttachmentsOpen)}
                >
                  <Package aria-hidden="true" />
                  <span>Attachments</span>
                  <ChevronDown
                    className={`ml-auto transition-transform ${isAttachmentsOpen ? "" : "-rotate-90"}`}
                    aria-hidden="true"
                  />
                </SidebarMenuButton>
                {isAttachmentsOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === ROUTES.ATTACHMENT_CATEGORIES}
                      >
                        <Link href={ROUTES.ATTACHMENT_CATEGORIES}>
                          <span>Categories</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === ROUTES.ATTACHMENT_MODELS}
                      >
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
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.BRANDS}
                >
                  <Link href={ROUTES.BRANDS}>
                    <Tag aria-hidden="true" />
                    <span>Brands</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Locations */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.LOCATIONS}
                >
                  <Link href={ROUTES.LOCATIONS}>
                    <MapPin aria-hidden="true" />
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
                  onClick={() => setIsListingsOpen(!isListingsOpen)}
                >
                  <ShoppingCart aria-hidden="true" />
                  <span>Listings</span>
                  <ChevronDown
                    className={`ml-auto transition-transform ${isListingsOpen ? "" : "-rotate-90"}`}
                    aria-hidden="true"
                  />
                </SidebarMenuButton>
                {isListingsOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === ROUTES.LISTINGS_FOR_SALE}
                      >
                        <Link href={ROUTES.LISTINGS_FOR_SALE}>
                          <span>For Sale</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === ROUTES.LISTINGS_FOR_RENT}
                      >
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
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.ENQUIRIES}
                >
                  <Link href={ROUTES.ENQUIRIES}>
                    <MessageSquare aria-hidden="true" />
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
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.CUSTOMERS}
                >
                  <Link href={ROUTES.CUSTOMERS}>
                    <Users aria-hidden="true" />
                    <span>Customers</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.PARTNERS}
                >
                  <Link href={ROUTES.PARTNERS}>
                    <UserCheck aria-hidden="true" />
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
                  onClick={() => setIsArticlesOpen(!isArticlesOpen)}
                >
                  <FileText aria-hidden="true" />
                  <span>Articles</span>
                  <ChevronDown
                    className={`ml-auto transition-transform ${isArticlesOpen ? "" : "-rotate-90"}`}
                    aria-hidden="true"
                  />
                </SidebarMenuButton>
                {isArticlesOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === ROUTES.ARTICLE_CATEGORIES}
                      >
                        <Link href={ROUTES.ARTICLE_CATEGORIES}>
                          <span>Categories</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === ROUTES.POSTS}
                      >
                        <Link href={ROUTES.POSTS}>
                          <span>Posts</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.CAROUSEL_IMAGES}
                >
                  <Link href={ROUTES.CAROUSEL_IMAGES}>
                    <ImageIcon aria-hidden="true" />
                    <span>Carousel Images</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.ANNOUNCEMENT_BAR}
                >
                  <Link href={ROUTES.ANNOUNCEMENT_BAR}>
                    <Megaphone aria-hidden="true" />
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
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.ADMINS}
                >
                  <Link href={ROUTES.ADMINS}>
                    <Shield aria-hidden="true" />
                    <span>Admins</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.ROLES_PERMISSIONS}
                >
                  <Link href={ROUTES.ROLES_PERMISSIONS}>
                    <UserCog aria-hidden="true" />
                    <span>Roles & Permissions</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === ROUTES.SETTINGS}
                >
                  <Link href={ROUTES.SETTINGS}>
                    <Settings aria-hidden="true" />
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
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src="/avatars/user.png" alt={userName} />
                    <AvatarFallback className="rounded-full">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userEmail}
                    </span>
                  </div>
                  <MoreVertical className="ml-auto size-4" aria-hidden="true" />
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
                      <AvatarImage src="/avatars/user.png" alt={userName} />
                      <AvatarFallback className="rounded-full">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-foreground">
                        {userName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {userEmail}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="focus:bg-sidebar-hover focus:text-sidebar-hover-foreground focus:**:!text-sidebar-hover-foreground">
                  <User className="mr-2 h-4 w-4" aria-hidden="true" />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-sidebar-hover focus:text-sidebar-hover-foreground focus:**:!text-sidebar-hover-foreground">
                  <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={async () => {
                    await logoutAction();
                    window.location.href = "/login";
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
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
