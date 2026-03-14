"use client";

import { useState, useTransition } from "react";
import { User, Building2, Calendar, Handshake, Ban, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/utils";
import { useHasPermission } from "@/hooks/use-permissions";
import { getUserDeleteImpact, deleteAppUser } from "@/lib/actions/app-user";
import type { UserDeleteImpact } from "@/lib/actions/app-user";
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
  const canDelete = useHasPermission("users", "delete");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [impact, setImpact] = useState<UserDeleteImpact | null>(null);
  const [isLoadingImpact, startImpactTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  if (!user) return null;

  function handleDeleteClick() {
    if (!user) return;
    startImpactTransition(async () => {
      const data = await getUserDeleteImpact(user.app_user_id);
      setImpact(data);
      setShowDeleteConfirm(true);
    });
  }

  function handleConfirmDelete() {
    if (!user) return;
    startDeleteTransition(async () => {
      const result = await deleteAppUser(user.app_user_id);
      if (result.success) {
        toast.success(`User "${user.username}" has been deleted`);
        setShowDeleteConfirm(false);
        onClose();
      } else {
        toast.error(result.error ?? "Failed to delete user");
      }
    });
  }

  const verified = user.is_verified === 1;
  const businessTypeInfo = user.business_type_id
    ? businessTypeMap.get(user.business_type_id)
    : null;

  return (
  <>
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
          <div className="flex items-center gap-2 mr-auto">
            {canDelete && !user.deleted_at && (
              <Button
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={isLoadingImpact}
              >
                {isLoadingImpact ? <Spinner className="mr-1" /> : <Trash2 className="size-4" />}
                Delete
              </Button>
            )}
            {canBlacklist && !user.deleted_at && (
              <Button
                variant="outline"
                onClick={() => onBlacklist(user)}
              >
                <Ban className="size-4" />
                Blacklist
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Critical delete confirmation */}
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <AlertTriangle className="text-destructive" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete user account?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are about to delete <strong>{user.username}</strong>. This is a critical action
                that affects real user data.
              </p>
              {impact && (impact.partnerCount > 0 || impact.chatSessionCount > 0 || impact.saleListingCount > 0 || impact.rentListingCount > 0) && (
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-1.5">
                  <p className="text-sm font-medium text-destructive">This user has associated data:</p>
                  <ul className="text-sm text-muted-foreground space-y-0.5 list-disc list-inside">
                    {impact.partnerCount > 0 && (
                      <li>{impact.partnerCount} partner {impact.partnerCount === 1 ? "profile" : "profiles"}</li>
                    )}
                    {impact.saleListingCount > 0 && (
                      <li>{impact.saleListingCount} sale {impact.saleListingCount === 1 ? "listing" : "listings"}</li>
                    )}
                    {impact.rentListingCount > 0 && (
                      <li>{impact.rentListingCount} rental {impact.rentListingCount === 1 ? "listing" : "listings"}</li>
                    )}
                    {impact.chatSessionCount > 0 && (
                      <li>{impact.chatSessionCount} chat {impact.chatSessionCount === 1 ? "session" : "sessions"}</li>
                    )}
                  </ul>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                The account will be moved to trash and can be restored within 30 days.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              handleConfirmDelete();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? <><Spinner className="mr-1" /> Deleting{"\u2026"}</> : "Delete User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
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
