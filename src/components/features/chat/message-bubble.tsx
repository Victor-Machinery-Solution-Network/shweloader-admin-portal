"use client";

import { useState } from "react";
import {
  FileText,
  Check,
  CheckCheck,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { assetUrl } from "@/lib/r2-url";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useHasPermission } from "@/hooks/use-permissions";
import { editMessage, deleteMessage } from "@/lib/actions/chat";
import { cn, formatFileSize } from "@/lib/utils";
import { format } from "date-fns";
import { ProductMessageCard } from "./product-message-card";
import { ChatImageGallery } from "./chat-image-gallery";
import type { ChatMessageWithDetails } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessageWithDetails;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  isGrouped?: boolean; // true if this message continues a group from the same sender
  userLastReadAt?: string | null;
  isLastAdminMessage?: boolean; // only show sent/seen on the very last admin message
  sessionId?: number; // enables the edit/delete menu on admin messages
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function formatTimestamp(dateStr: string): string {
  try {
    const date = dateStr.endsWith("Z") ? new Date(dateStr) : new Date(dateStr + "Z");
    return format(date, "h:mm a");
  } catch {
    return "";
  }
}

function isSeen(messageCreatedAt: string, userLastReadAt: string): boolean {
  const msgDate = messageCreatedAt.endsWith("Z")
    ? new Date(messageCreatedAt)
    : new Date(messageCreatedAt + "Z");
  const readDate = userLastReadAt.endsWith("Z")
    ? new Date(userLastReadAt)
    : new Date(userLastReadAt + "Z");
  return msgDate <= readDate;
}

export function MessageBubble({
  message,
  showAvatar = true,
  showTimestamp = true,
  userLastReadAt = null,
  isLastAdminMessage = false,
  sessionId,
}: MessageBubbleProps) {
  const isSystemMessage = message.sender_type === "system";
  const isAdminMessage = message.sender_type === "admin";
  const initials = getInitials(message.sender_name);
  const timestamp = formatTimestamp(message.created_at);

  const { data: session } = useSession();
  const canEdit = useHasPermission("chat", "edit");
  const canDelete = useHasPermission("chat", "delete");

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.message ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDeleted = !!message.deleted_at;

  // System messages render as centered info text
  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-muted/60 text-muted-foreground text-xs rounded-full px-4 py-1.5 max-w-[80%] text-center">
          {message.message}
          {timestamp && (
            <span className="ml-2 opacity-60">{timestamp}</span>
          )}
        </div>
      </div>
    );
  }

  // ── Deleted ───────────────────────────────────────────────────────────────
  // The bubble keeps its place in the thread but shows nothing it used to
  // carry. Whoever pressed delete sees "You deleted this message"; everyone
  // else sees who did it, so the thread stays accountable between admins.
  if (isDeleted) {
    const deletedBySelf =
      message.deleted_by != null &&
      String(message.deleted_by) === String(session?.user?.id ?? "");
    const label = deletedBySelf
      ? "You deleted this message"
      : message.deleted_by_name
        ? `${message.deleted_by_name} deleted this message`
        : "This message was deleted";

    return (
      <div
        className={cn(
          "flex gap-2 items-end min-w-0",
          isAdminMessage ? "flex-row-reverse" : "flex-row",
        )}
      >
        {showAvatar ? (
          <Avatar size="sm" className="shrink-0 mb-0.5">
            <AvatarFallback
              className={cn(
                "text-xs font-medium",
                isAdminMessage
                  ? "bg-primary/60 text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="size-6 shrink-0" />
        )}

        <div
          className={cn(
            "flex flex-col gap-1 max-w-[75%] min-w-0",
            isAdminMessage ? "items-end" : "items-start",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-2 text-sm italic",
              isAdminMessage
                ? "bg-primary/50 text-primary-foreground rounded-br-sm"
                : "bg-muted/60 text-muted-foreground rounded-bl-sm",
            )}
          >
            <Trash2 className="size-3.5 shrink-0 opacity-80" />
            <span className="opacity-90">{label}</span>
          </div>
          {showTimestamp && timestamp && (
            <span className="text-xs text-muted-foreground px-1">{timestamp}</span>
          )}
        </div>
      </div>
    );
  }

  const imageAttachments = message.attachments.filter((a) =>
    a.file_type.startsWith("image/"),
  );
  const fileAttachments = message.attachments.filter(
    (a) => !a.file_type.startsWith("image/"),
  );

  const hasProductRef = message.sale_listing_id || message.rent_listing_id;

  // Only ADMIN messages are ever editable/deletable — a customer's words are
  // theirs. The server enforces this too; this just keeps the menu honest.
  const showEdit = isAdminMessage && canEdit && !!sessionId && !!message.message;
  const showDelete = isAdminMessage && canDelete && !!sessionId;
  const hasActions = showEdit || showDelete;

  async function handleSaveEdit() {
    const next = draft.trim();
    if (!next || next === message.message) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    const res = await editMessage(sessionId!, message.id, next);
    setIsSaving(false);
    if (res.success) {
      setIsEditing(false);
    } else {
      toast.error(res.error ?? "Failed to edit message");
    }
  }

  async function handleDelete() {
    const res = await deleteMessage(sessionId!, message.id);
    if (!res.success) toast.error(res.error ?? "Failed to delete message");
  }

  return (
    <div
      className={cn(
        "group/msg flex gap-2 items-end min-w-0",
        isAdminMessage ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar — only on last message in a consecutive group */}
      {showAvatar ? (
        <Avatar size="sm" className="shrink-0 mb-0.5">
          <AvatarFallback
            className={cn(
              "text-xs font-medium",
              isAdminMessage
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
      ) : (
        /* Invisible spacer to keep alignment (must match Avatar size="sm" = size-6) */
        <div className="size-6 shrink-0" />
      )}

      {/* Bubble */}
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[75%] min-w-0",
          isAdminMessage ? "items-end" : "items-start",
        )}
      >
        {isEditing ? (
          <div className="flex flex-col gap-2 w-72 sm:w-80">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={5000}
              autoFocus
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSaveEdit();
                }
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(message.message ?? "");
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Unified bubble: images + text grouped together */}
            {imageAttachments.length > 0 ? (
              <div
                className={cn(
                  "rounded-2xl overflow-hidden w-72 sm:w-80",
                  isAdminMessage
                    ? "bg-primary rounded-br-sm"
                    : "bg-muted rounded-bl-sm",
                )}
              >
                <ChatImageGallery attachments={imageAttachments} />
                {message.message && (
                  <div
                    className={cn(
                      "px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-all",
                      isAdminMessage
                        ? "text-primary-foreground"
                        : "text-foreground",
                    )}
                  >
                    {message.message}
                  </div>
                )}
              </div>
            ) : message.message ? (
              <div
                className={cn(
                  "rounded-2xl px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-all min-w-[3rem]",
                  isAdminMessage
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm",
                )}
              >
                {message.message}
              </div>
            ) : !hasProductRef && fileAttachments.length === 0 ? (
              <div
                className={cn(
                  "rounded-2xl px-4 py-2 text-sm leading-relaxed min-w-[3rem] italic opacity-60",
                  isAdminMessage
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm",
                )}
              >
                Sent a photo
              </div>
            ) : null}

            {/* PDF/file attachments */}
            {fileAttachments.map((att) => (
              <a
                key={att.id}
                href={assetUrl(att.file_url) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:opacity-80 transition-opacity border",
                  isAdminMessage
                    ? "bg-primary text-primary-foreground border-primary/20"
                    : "bg-muted border-border text-foreground",
                )}
              >
                <FileText className="size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-xs">{att.file_name}</p>
                  <p className="text-xs opacity-70">{formatFileSize(att.file_size)}</p>
                </div>
              </a>
            ))}

            {/* Product reference card */}
            {hasProductRef && (
              <ProductMessageCard
                productName={message.product_name}
                productThumbnail={message.product_thumbnail}
                listingType={message.listing_type}
                listingId={message.sale_listing_id ?? message.rent_listing_id}
                productListId={message.product_list_id}
                customId={message.custom_id}
                brandName={message.brand_name}
                mmkPrice={message.mmk_price}
                usdPrice={message.usd_price}
                displayCurrency={message.display_currency}
              />
            )}
          </>
        )}

        {/* Timestamp + "Edited" + sent/seen ticks — last message in a group */}
        {showTimestamp && timestamp && !isEditing && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground px-1">
            {message.edited_at && <span>Edited</span>}
            {timestamp}
            {isAdminMessage && isLastAdminMessage && (
              userLastReadAt && isSeen(message.created_at, userLastReadAt) ? (
                <CheckCheck className="size-3.5 text-blue-500" />
              ) : (
                <Check className="size-3.5 text-muted-foreground" />
              )
            )}
          </span>
        )}
      </div>

      {/* Hover actions — admin messages only */}
      {hasActions && !isEditing && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                aria-label="Message actions"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isAdminMessage ? "end" : "start"}>
              {showEdit && (
                <DropdownMenuItem
                  onSelect={() => {
                    setDraft(message.message ?? "");
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {showDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                <AlertDialogDescription>
                  The customer will see &ldquo;This message was deleted&rdquo; in
                  its place. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
