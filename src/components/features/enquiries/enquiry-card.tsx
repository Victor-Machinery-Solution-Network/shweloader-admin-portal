"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MessageSquare, ArrowRight, MoreVertical, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn, timeAgo } from "@/lib/utils";
import { createSessionForEnquiry } from "@/lib/actions/chat";
import { deleteEnquiry } from "@/lib/actions/enquiry";
import type { EnquiryWithDetails } from "@/types/enquiry";

interface EnquiryCardProps {
  enquiry: EnquiryWithDetails;
  canDelete: boolean;
  canChat: boolean;
}

function getStatusVariant(
  statusName: string | null,
): "warning" | "success" | "secondary" {
  switch (statusName) {
    case "Pending":
      return "warning";
    case "Replied":
      return "success";
    default:
      return "secondary";
  }
}

export function EnquiryCard({ enquiry, canDelete, canChat }: EnquiryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const hasSes = enquiry.session_id != null;
  const statusVariant = getStatusVariant(enquiry.status_name);

  function handleAction() {
    if (hasSes) {
      router.push(`/chat?session=${enquiry.session_id}`);
      return;
    }

    startTransition(async () => {
      const result = await createSessionForEnquiry(enquiry.id);
      if (result.success && result.sessionId) {
        router.push(`/chat?session=${result.sessionId}`);
      } else {
        toast.error(result.error ?? "Failed to start conversation");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEnquiry(enquiry.id);
      if (result.success) {
        toast.success("Enquiry deleted");
      } else {
        toast.error(result.error ?? "Failed to delete enquiry");
      }
    });
  }

  const threadInfo =
    enquiry.message_count > 0 && enquiry.last_reply_at
      ? `${enquiry.message_count} ${enquiry.message_count === 1 ? "message" : "messages"} · Last reply ${timeAgo(enquiry.last_reply_at)}`
      : null;

  return (
    <div className="ring-foreground/10 bg-card rounded-2xl ring-1 p-4 flex gap-3">
      {/* Thumbnail */}
      <div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {enquiry.thumbnail_url ? (
          <Image
            src={enquiry.thumbnail_url}
            alt={enquiry.model_name ?? "Product"}
            width={48}
            height={48}
            className="object-cover size-full"
          />
        ) : (
          <div className="size-full bg-muted flex items-center justify-center">
            <MessageSquare className="size-5 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {/* Row 1: user name + status badge + timestamp */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">
              {enquiry.user_name ?? "Unknown user"}
            </span>
            {enquiry.user_company && (
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                &middot; {enquiry.user_company}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {enquiry.status_name && (
              <Badge variant={statusVariant}>{enquiry.status_name}</Badge>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" aria-hidden="true" />
              {timeAgo(enquiry.created_at)}
            </span>
          </div>
        </div>

        {/* Row 2: model name + listing type badge */}
        {(enquiry.model_name || enquiry.listing_type) && (
          <div className="flex items-center gap-2">
            {enquiry.model_name && (
              <span className="text-xs text-muted-foreground truncate">
                {enquiry.model_name}
              </span>
            )}
            {enquiry.listing_type && (
              <Badge
                variant={enquiry.listing_type === "sale" ? "equipment" : "attachment"}
              >
                {enquiry.listing_type === "sale" ? "For Sale" : "For Rent"}
              </Badge>
            )}
          </div>
        )}

        {/* Row 3: message preview */}
        {enquiry.message && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">
            {enquiry.message}
          </p>
        )}

        {/* Row 4: thread info + actions */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {/* Thread preview */}
          <div className="flex items-center gap-1.5 min-w-0">
            {threadInfo ? (
              <>
                <MessageSquare className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <span className="text-xs text-muted-foreground truncate">
                  {threadInfo}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">No replies yet</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {canChat && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleAction}
                disabled={isPending}
              >
                {hasSes ? "View Thread" : isPending ? "Starting…" : "Reply"}
                <ArrowRight className="size-3" aria-hidden="true" />
              </Button>
            )}

            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="More options"
                    disabled={isPending}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
