"use client";

import { useState, useTransition } from "react";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { getAppUserById } from "@/lib/actions/app-user";
import { UserDetailDialog } from "@/components/features/users/user-detail-dialog";
import type { BusinessTypeInfo } from "@/components/features/users/columns";
import type { AppUser } from "@/types/app-user";

interface EnquiryUserCellProps {
  appUserId: number;
  username: string;
  fullName: string | null;
  businessTypeMap: Map<number, BusinessTypeInfo>;
}

/**
 * User cell for the enquiry table. Click loads the full app_user row and
 * opens UserDetailDialog in read-only mode (no Delete/Blacklist footer).
 */
export function EnquiryUserCell({
  appUserId,
  username,
  fullName,
  businessTypeMap,
}: EnquiryUserCellProps) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, startTransition] = useTransition();

  function handleClick() {
    if (isLoading || user) return;
    startTransition(async () => {
      const result = await getAppUserById(appUserId);
      if (!result) {
        toast.error("User not found");
        return;
      }
      setUser(result);
    });
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10">
        <UserRound className="size-3.5 text-violet-500" />
      </div>
      <div className="flex flex-col min-w-0">
        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading}
          className="font-medium text-sm text-left hover:underline cursor-pointer w-fit truncate disabled:opacity-60"
        >
          {username}
        </button>
        <span className="text-muted-foreground text-xs truncate">
          {fullName ?? "—"}
        </span>
      </div>

      <UserDetailDialog
        user={user}
        businessTypeMap={businessTypeMap}
        onClose={() => setUser(null)}
        onBlacklist={() => {}}
        readOnly
      />
    </div>
  );
}
