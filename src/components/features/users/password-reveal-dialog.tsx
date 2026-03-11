"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface PasswordRevealDialogProps {
  password: string | null;
  onClose: () => void;
}

export function PasswordRevealDialog({
  password,
  onClose,
}: PasswordRevealDialogProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success("Password copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog
      open={!!password}
      onOpenChange={() => {
        // Prevent closing on backdrop click — must click "Done"
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>User Created Successfully</DialogTitle>
          <DialogDescription>
            Share this password with the user. It will not be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <code className="bg-muted flex-1 rounded-lg px-4 py-3 font-mono text-sm select-all">
            {password}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="size-4 text-green-600" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onClose();
              setCopied(false);
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
