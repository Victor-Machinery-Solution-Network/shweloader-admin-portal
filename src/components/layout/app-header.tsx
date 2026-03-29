/**
 * Main application header
 */

"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User, Bell, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/actions/auth-actions";
import { ROUTES } from "@/lib/constants";
import { assetUrl } from "@/lib/r2-url";

export function AppHeader() {
  const router = useRouter();
  const { data: session } = useSession();

  const userName = session?.user?.name ?? "Admin User";
  const userEmail = session?.user?.email ?? "";
  const avatarSrc = assetUrl(session?.user?.avatar_url) ?? undefined;
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex flex-1 items-center justify-end">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="User profile"
              >
                <Avatar className="size-8">
                  <AvatarImage src={avatarSrc} alt={userName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    <AvatarImage src={avatarSrc} alt={userName} />
                    <AvatarFallback>{initials}</AvatarFallback>
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
              <DropdownMenuItem onClick={() => router.push(ROUTES.PROFILE)}>
                <User className="mr-2 size-4" aria-hidden="true" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(ROUTES.NOTIFICATIONS)}
              >
                <Bell className="mr-2 size-4" aria-hidden="true" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={async () => {
                  await logoutAction();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="mr-2 size-4" aria-hidden="true" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
