"use client";

import { User, Building2, Calendar, Handshake, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { useHasPermission } from "@/hooks/use-permissions";
import type { AppUser } from "@/types/app-user";
import type { BusinessTypeInfo } from "./columns";

interface UserDetailDialogProps {
  user: AppUser | null;
  onClose: () => void;
  onBlacklist: (user: AppUser) => void;
  businessTypeMap: Map<number, BusinessTypeInfo>;
}

export function UserDetailDialog({
  user,
  onClose,
  onBlacklist,
  businessTypeMap,
}: UserDetailDialogProps) {
  const canBlacklist = useHasPermission("blacklist", "create");

  if (!user) return null;

  const verified = user.is_verified === 1;
  const businessTypeInfo = user.business_type_id
    ? businessTypeMap.get(user.business_type_id)
    : null;

  return (
    <Dialog open={!!user} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{user.username}</DialogTitle>
            <Badge
              variant={verified ? "success" : "destructive"}
              className="text-xs"
            >
              {verified ? "Verified" : "Unverified"}
            </Badge>
            {user.is_approved_partner === 1 && (
              <Badge variant="success" className="text-xs">
                <Handshake className="size-3" />
                Partner
              </Badge>
            )}
            {user.deleted_at && (
              <Badge variant="destructive" className="text-xs">
                <Ban className="size-3" />
                Blacklisted
              </Badge>
            )}
          </div>
          <DialogDescription>{user.full_name || user.phone}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 pr-1">
          {/* Contact */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="size-4 text-muted-foreground" />
              Contact
            </div>
            <div className="space-y-2.5">
              <DetailRow label="Full Name" value={user.full_name} />
              <DetailRow label="Phone" value={user.phone} />
              <DetailRow label="Email" value={user.email} />
            </div>
          </section>

          <Separator />

          {/* Business */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="size-4 text-muted-foreground" />
              Business
            </div>
            <div className="space-y-2.5">
              <DetailRow label="Company" value={user.company_name} />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-sm shrink-0">Type</span>
                {businessTypeInfo ? (
                  <Badge
                    variant={businessTypeInfo.isListed ? "outline" : "secondary"}
                    className="text-xs"
                  >
                    {businessTypeInfo.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
              <DetailRow label="Address" value={user.address} />
            </div>
          </section>

          <Separator />

          {/* Account */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="size-4 text-muted-foreground" />
              Account
            </div>
            <div className="space-y-2.5">
              <DetailRow label="User ID" value={`#${user.app_user_id}`} />
              <DetailRow label="Joined" value={formatDate(user.created_at)} />
            </div>
          </section>
        </div>

        <DialogFooter>
          {canBlacklist && !user.deleted_at && (
            <Button
              variant="destructive"
              onClick={() => onBlacklist(user)}
              className="mr-auto"
            >
              <Ban className="size-4" />
              Blacklist
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      <span
        className={`text-sm text-right ${value ? "" : "text-muted-foreground"}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
