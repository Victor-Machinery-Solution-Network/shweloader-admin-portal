"use client";

import { useState } from "react";
import { ClipboardPen, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useHasPermission } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROUTES } from "@/lib/constants";
import { EnquiryManageDialog } from "./enquiry-manage-dialog";
import type {
  EnquiryWithDetails,
  EnquiryStatusType,
} from "@/types/enquiry";

interface RowActionsProps {
  enquiry: EnquiryWithDetails;
  statusTypes: EnquiryStatusType[];
}

export function RowActions({ enquiry, statusTypes }: RowActionsProps) {
  const canEdit = useHasPermission("enquiries", "edit");
  const canOpenChat = useHasPermission("chat", "read");
  const [showManage, setShowManage] = useState(false);

  return (
    <div className="flex justify-end gap-0.5">
      <TooltipProvider>
        {canOpenChat && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <Link href={`${ROUTES.CHAT}?session=${enquiry.chat_session_id}`}>
                  <MessageSquare aria-hidden="true" />
                  <span className="sr-only">Open chat</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Open chat</TooltipContent>
          </Tooltip>
        )}

        {canEdit && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowManage(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ClipboardPen aria-hidden="true" />
                  <span className="sr-only">Manage enquiry</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Manage</TooltipContent>
            </Tooltip>
            {showManage && (
              <EnquiryManageDialog
                enquiry={enquiry}
                statusTypes={statusTypes}
                open={showManage}
                onOpenChange={setShowManage}
              />
            )}
          </>
        )}
      </TooltipProvider>
    </div>
  );
}
