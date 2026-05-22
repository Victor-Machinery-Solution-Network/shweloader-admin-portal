"use client";

import { useState, useEffect, useTransition } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import {
  getBlacklistImpactPreview,
  blacklistUser,
} from "@/lib/actions/blacklist";
import type { AppUser } from "@/types/app-user";
import type { BlacklistImpactPreview } from "@/types/blacklist";

interface BlacklistConfirmDialogProps {
  user: AppUser | null;
  onClose: () => void;
}

export function BlacklistConfirmDialog({
  user,
  onClose,
}: BlacklistConfirmDialogProps) {
  const [preview, setPreview] = useState<BlacklistImpactPreview | null>(null);
  const [loading, startLoading] = useTransition();
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;
    startLoading(async () => {
      try {
        setPreview(await getBlacklistImpactPreview(user.app_user_id));
      } catch {
        toast.error("Failed to load impact preview");
        onClose();
      }
    });
  }, [user, onClose]);

  function handleOpenChange(open: boolean) {
    if (isPending) return;
    if (!open) {
      setPreview(null);
      setReason("");
      onClose();
    }
  }

  function handleConfirm(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) return;

    startTransition(async () => {
      const result = await blacklistUser(user.app_user_id, reason);
      if (result.success) {
        toast.success("User blacklisted");
        setPreview(null);
        setReason("");
        onClose();
      } else {
        toast.error(result.error ?? "Failed to blacklist user");
      }
    });
  }

  const impacts = [
    { label: "Sale listings", count: preview?.sale_listing_count ?? 0 },
    { label: "Rent listings", count: preview?.rent_listing_count ?? 0 },
    { label: "Partners", count: preview?.partner_count ?? 0 },
  ].filter((item) => item.count > 0);

  return (
    <AlertDialog open={!!user} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10">
            <Ban className="text-destructive" aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>
            Blacklist {user?.username ?? "user"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will soft-delete the user and all associated data. This action
            can be reversed from the Blacklist tab.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="size-6" />
          </div>
        ) : (
          preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium">{preview.user.username}</span>
                  <span className="text-muted-foreground text-xs truncate">
                    {preview.user.full_name || preview.user.phone}
                  </span>
                </div>
                {preview.user.email && (
                  <span className="text-muted-foreground text-xs shrink-0">
                    {preview.user.email}
                  </span>
                )}
              </div>

              {impacts.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium">
                      Data that will be soft-deleted
                    </span>
                    <div className="space-y-1">
                      {impacts.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {item.label}
                          </span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-1.5">
                <label htmlFor="blacklist-reason" className="text-sm font-medium">
                  Reason <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="blacklist-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Fraudulent activity, spam, terms violation"
                  rows={3}
                />
              </div>
            </div>
          )
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending || loading || !reason.trim()}
          >
            {isPending ? (
              <>
                <Spinner className="mr-1" /> Blacklisting&hellip;
              </>
            ) : (
              <>
                <Ban className="size-4" />
                Confirm Blacklist
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
