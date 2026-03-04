/**
 * Main application sidebar navigation
 */

"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Handshake,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Megaphone,
  Shield,
  UserCog,
  Trash2,
  Plus,
} from "lucide-react";
import { ROUTES, SESSION_KEYS } from "@/lib/constants";
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
import { usePermissions } from "@/components/providers/permissions-provider";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { permissions, isLoaded: permsLoaded } = usePermissions();

  /** Check read permission for a feature. Shows all while loading to avoid flash. */
  function canRead(feature: string): boolean {
    if (!permsLoaded) return true;
    return permissions.includes(`${feature}:read`);
  }

  /** Check create permission for a feature. */
  function canCreate(feature: string): boolean {
    if (!permsLoaded) return true;
    return permissions.includes(`${feature}:create`);
  }

  const userName = session?.user?.name ?? "Admin User";
  const userEmail = session?.user?.email ?? "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Derived visibility for parent collapsible items
  const showEquipment =
    canRead("equipment_main_categories") ||
    canRead("equipment_sub_categories") ||
    canRead("equipment_models");
  const showAttachments =
    canRead("attachment_categories") || canRead("attachment_models");
  const showListings =
    canRead("sale_listings") || canRead("rent_listings") || canRead("listing_templates");
  const showArticles =
    canRead("articles") || canRead("article_categories");

  // Derived visibility for entire groups
  const showDashboard = canRead("dashboard") || canRead("analytics");
  const showCatalog =
    showEquipment || showAttachments || canRead("brands") || canRead("locations");
  const showMarketplace = showListings || canRead("enquiries");
  const showUsers = canRead("users") || canRead("partners");
  const showContent =
    showArticles || canRead("carousels") || canRead("announcements");
  const showSettings =
    canRead("admin_users") || canRead("roles") || canRead("app_settings") || canRead("trash");

  // Auto-open collapsible sections based on current route
  const isEquipmentActive = pathname.startsWith(ROUTES.EQUIPMENT);
  const isAttachmentsActive = pathname.startsWith(ROUTES.ATTACHMENTS);
  const isListingsActive = pathname.startsWith(ROUTES.LISTINGS) || pathname.startsWith(ROUTES.LISTING_TEMPLATES);
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

  // Predictive prefetching: when a section opens, prefetch child route bundles
  useEffect(() => {
    if (isEquipmentOpen) {
      router.prefetch(ROUTES.EQUIPMENT_MAIN_CATEGORIES);
      router.prefetch(ROUTES.EQUIPMENT_SUB_CATEGORIES);
      router.prefetch(ROUTES.EQUIPMENT_MODELS);
    }
  }, [isEquipmentOpen, router]);

  useEffect(() => {
    if (isAttachmentsOpen) {
      router.prefetch(ROUTES.ATTACHMENT_CATEGORIES);
      router.prefetch(ROUTES.ATTACHMENT_MODELS);
    }
  }, [isAttachmentsOpen, router]);

  useEffect(() => {
    if (isListingsOpen) {
      router.prefetch(ROUTES.LISTINGS_FOR_SALE);
      router.prefetch(ROUTES.LISTINGS_FOR_RENT);
      router.prefetch(ROUTES.LISTINGS_NEW);
      router.prefetch(ROUTES.LISTING_TEMPLATES);
    }
  }, [isListingsOpen, router]);

  useEffect(() => {
    if (isArticlesOpen) {
      router.prefetch(ROUTES.ARTICLE_CATEGORIES);
      router.prefetch(ROUTES.POSTS);
    }
  }, [isArticlesOpen, router]);

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
        {showDashboard && (
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {canRead("dashboard") && (
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
              )}

              {canRead("analytics") && (
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
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* Catalog Management Section */}
        {showCatalog && (
        <SidebarGroup>
          <SidebarGroupLabel>Catalog Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Equipment */}
              {showEquipment && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setIsEquipmentOpen(!isEquipmentOpen)}>
                  <Wrench aria-hidden="true" />
                  <span>Equipment</span>
                  <ChevronDown className={`ml-auto transition-transform ${isEquipmentOpen ? "" : "-rotate-90"}`} aria-hidden="true" />
                </SidebarMenuButton>
                {isEquipmentOpen && (
                  <SidebarMenuSub>
                    {canRead("equipment_main_categories") && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.EQUIPMENT_MAIN_CATEGORIES}>
                        <Link href={ROUTES.EQUIPMENT_MAIN_CATEGORIES}><span>Main Categories</span></Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    )}
                    {canRead("equipment_sub_categories") && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.EQUIPMENT_SUB_CATEGORIES}>
                        <Link href={ROUTES.EQUIPMENT_SUB_CATEGORIES}><span>Sub Categories</span></Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    )}
                    {canRead("equipment_models") && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.EQUIPMENT_MODELS}>
                        <Link href={ROUTES.EQUIPMENT_MODELS}><span>Models</span></Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    )}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              )}

              {/* Attachments */}
              {showAttachments && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setIsAttachmentsOpen(!isAttachmentsOpen)}>
                  <Package aria-hidden="true" />
                  <span>Attachments</span>
                  <ChevronDown className={`ml-auto transition-transform ${isAttachmentsOpen ? "" : "-rotate-90"}`} aria-hidden="true" />
                </SidebarMenuButton>
                {isAttachmentsOpen && (
                  <SidebarMenuSub>
                    {canRead("attachment_categories") && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.ATTACHMENT_CATEGORIES}>
                        <Link href={ROUTES.ATTACHMENT_CATEGORIES}><span>Categories</span></Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    )}
                    {canRead("attachment_models") && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.ATTACHMENT_MODELS}>
                        <Link href={ROUTES.ATTACHMENT_MODELS}><span>Models</span></Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    )}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              )}

              {/* Brands */}
              {canRead("brands") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.BRANDS}>
                  <Link href={ROUTES.BRANDS}><Tag aria-hidden="true" /><span>Brands</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}

              {/* Locations */}
              {canRead("locations") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.LOCATIONS}>
                  <Link href={ROUTES.LOCATIONS}><MapPin aria-hidden="true" /><span>Locations</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* Marketplace Section */}
        {showMarketplace && (
        <SidebarGroup>
          <SidebarGroupLabel>Marketplace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Listings */}
              {showListings && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setIsListingsOpen(!isListingsOpen)}>
                  <ShoppingCart aria-hidden="true" />
                  <span>Listings</span>
                  <ChevronDown className={`ml-auto transition-transform ${isListingsOpen ? "" : "-rotate-90"}`} aria-hidden="true" />
                </SidebarMenuButton>
                {isListingsOpen && (
                  <SidebarMenuSub>
                    {canRead("sale_listings") && (
                    <SidebarMenuSubItem>
                      <div className="flex items-center w-full">
                        <SidebarMenuSubButton asChild isActive={pathname === ROUTES.LISTINGS_FOR_SALE} className="flex-1">
                          <Link href={ROUTES.LISTINGS_FOR_SALE}><span>For Sale</span></Link>
                        </SidebarMenuSubButton>
                        {canCreate("sale_listings") && (
                          <AddListingDropdown pageType="sale" />
                        )}
                      </div>
                    </SidebarMenuSubItem>
                    )}
                    {canRead("rent_listings") && (
                    <SidebarMenuSubItem>
                      <div className="flex items-center w-full">
                        <SidebarMenuSubButton asChild isActive={pathname === ROUTES.LISTINGS_FOR_RENT} className="flex-1">
                          <Link href={ROUTES.LISTINGS_FOR_RENT}><span>For Rent</span></Link>
                        </SidebarMenuSubButton>
                        {canCreate("rent_listings") && (
                          <AddListingDropdown pageType="rent" />
                        )}
                      </div>
                    </SidebarMenuSubItem>
                    )}
                    {canRead("listing_templates") && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.LISTING_TEMPLATES}>
                        <Link href={ROUTES.LISTING_TEMPLATES}><span>Templates</span></Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    )}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              )}

              {/* Enquiries */}
              {canRead("enquiries") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.ENQUIRIES}>
                  <Link href={ROUTES.ENQUIRIES}><MessageSquare aria-hidden="true" /><span>Enquiries</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* Users Section */}
        {showUsers && (
        <SidebarGroup>
          <SidebarGroupLabel>Users</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {canRead("users") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.USERS}>
                  <Link href={ROUTES.USERS}><Users aria-hidden="true" /><span>Users</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}

              {canRead("partners") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.PARTNERS}>
                  <Link href={ROUTES.PARTNERS}><Handshake aria-hidden="true" /><span>Partners</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* Content Section */}
        {showContent && (
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Articles */}
              {showArticles && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setIsArticlesOpen(!isArticlesOpen)}>
                  <FileText aria-hidden="true" />
                  <span>Articles</span>
                  <ChevronDown className={`ml-auto transition-transform ${isArticlesOpen ? "" : "-rotate-90"}`} aria-hidden="true" />
                </SidebarMenuButton>
                {isArticlesOpen && (
                  <SidebarMenuSub>
                    {canRead("article_categories") && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.ARTICLE_CATEGORIES}>
                        <Link href={ROUTES.ARTICLE_CATEGORIES}><span>Categories</span></Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    )}
                    {canRead("articles") && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === ROUTES.POSTS}>
                        <Link href={ROUTES.POSTS}><span>Posts</span></Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    )}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              )}

              {canRead("carousels") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.CAROUSEL_IMAGES}>
                  <Link href={ROUTES.CAROUSEL_IMAGES}><ImageIcon aria-hidden="true" /><span>Carousel Images</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}

              {canRead("announcements") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.ANNOUNCEMENT_BAR}>
                  <Link href={ROUTES.ANNOUNCEMENT_BAR}><Megaphone aria-hidden="true" /><span>Announcement Bar</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* Settings Section */}
        {showSettings && (
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {canRead("admin_users") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.ADMINS}>
                  <Link href={ROUTES.ADMINS}><Shield aria-hidden="true" /><span>Admins</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}

              {canRead("roles") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.ROLES_PERMISSIONS}>
                  <Link href={ROUTES.ROLES_PERMISSIONS}><UserCog aria-hidden="true" /><span>Roles & Permissions</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}

              {canRead("app_settings") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.SETTINGS}>
                  <Link href={ROUTES.SETTINGS}><Settings aria-hidden="true" /><span>General Settings</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}

              {canRead("trash") && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.TRASH}>
                  <Link href={ROUTES.TRASH}><Trash2 aria-hidden="true" /><span>Trash</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}
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
                <DropdownMenuItem
                  className="focus:bg-sidebar-hover focus:text-sidebar-hover-foreground focus:**:!text-sidebar-hover-foreground"
                  onClick={() => router.push(ROUTES.NOTIFICATIONS)}
                >
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

/* ------------------------------------------------------------------ */
/*  + button dropdown for adding a listing                             */
/* ------------------------------------------------------------------ */

function AddListingDropdown({ pageType }: { pageType: "sale" | "rent" }) {
  function handleFillForm() {
<<<<<<< HEAD
    sessionStorage.setItem(SESSION_KEYS.NEW_LISTING_DEFAULT, pageType);
    // Hard navigation ensures the form always re-mounts with the correct preset
    window.location.href = ROUTES.LISTINGS_NEW;
=======
    sessionStorage.removeItem("listing-editor-autosave");
    sessionStorage.setItem("newListingDefault", pageType);
    router.push(ROUTES.LISTINGS_NEW);
>>>>>>> e2ef62b943fa76fc005efabb5fccc73b9c283140
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center size-5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0 mr-1"
          aria-label={`Add ${pageType} listing`}
        >
          <Plus className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuItem onClick={handleFillForm}>
          <FileText className="mr-2 size-4" aria-hidden="true" />
          Fill Form
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/bulk-upload/listings">
            <FileSpreadsheet className="mr-2 size-4" aria-hidden="true" />
            Excel Upload
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
