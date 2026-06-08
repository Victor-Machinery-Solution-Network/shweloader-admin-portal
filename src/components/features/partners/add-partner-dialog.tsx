"use client";

import { useState, useTransition } from "react";
import { Search, Handshake, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  searchUsersForPartner,
  promoteUserToPartner,
} from "@/lib/actions/partner";
import type { AppUser } from "@/types/app-user";

interface AddPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerTypes: { id: number; name: string }[];
}

/**
 * Admin-initiated "promote an existing user to Partner" flow. Two phases in one
 * dialog: (1) search & pick a user who isn't already an approved partner, then
 * (2) choose a required partner type and confirm. Instant-approves via
 * promoteUserToPartner.
 */
export function AddPartnerDialog({
  open,
  onOpenChange,
  partnerTypes,
}: AddPartnerDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppUser[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, startSearch] = useTransition();
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [partnerTypeId, setPartnerTypeId] = useState("");
  const [isPromoting, startPromote] = useTransition();

  function handleSearch() {
    if (query.trim().length < 2) return;
    startSearch(async () => {
      const result = await searchUsersForPartner(query);
      if (result.success) {
        setResults(result.data);
        setHasSearched(true);
      } else {
        toast.error(result.error ?? "Failed to search users");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  function reset() {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setSelectedUser(null);
    setPartnerTypeId("");
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      reset();
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  }

  function handleConfirm() {
    if (!selectedUser || !partnerTypeId) return;
    startPromote(async () => {
      const result = await promoteUserToPartner(
        selectedUser.app_user_id,
        Number(partnerTypeId),
      );
      if (result.success) {
        toast.success(`${selectedUser.username} is now a partner`);
        reset();
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Failed to add partner");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Partner</DialogTitle>
          <DialogDescription>
            {selectedUser
              ? "Choose a partner type to approve this user as a partner."
              : "Search for a user by name, phone, email, or company."}
          </DialogDescription>
        </DialogHeader>

        {!selectedUser ? (
          <>
            <div className="flex items-center gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search users..."
                autoFocus
              />
              <Button
                onClick={handleSearch}
                disabled={query.trim().length < 2 || isSearching}
                size="icon"
                className="shrink-0"
              >
                {isSearching ? <Spinner /> : <Search className="size-4" />}
              </Button>
            </div>

            {hasSearched && results.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No eligible users found.
              </p>
            )}

            {results.length > 0 && (
              <div className="max-h-64 space-y-1.5 overflow-y-auto overscroll-contain">
                {results.map((user) => (
                  <button
                    key={user.app_user_id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className="hover:bg-muted w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Handshake className="text-muted-foreground size-4 shrink-0" />
                      <span className="text-sm font-medium">{user.username}</span>
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-6 text-xs">
                      <span>{user.email}</span>
                      {user.phone && <span>{user.phone}</span>}
                      {user.company_name && <span>{user.company_name}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Handshake className="text-muted-foreground size-4 shrink-0" />
                <span className="text-sm font-medium">
                  {selectedUser.username}
                </span>
              </div>
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-6 text-xs">
                <span>{selectedUser.email}</span>
                {selectedUser.phone && <span>{selectedUser.phone}</span>}
                {selectedUser.company_name && (
                  <span>{selectedUser.company_name}</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partner-type">
                Partner Type <span className="text-destructive">*</span>
              </Label>
              <Select value={partnerTypeId} onValueChange={setPartnerTypeId}>
                <SelectTrigger id="partner-type" className="w-full">
                  <SelectValue placeholder="Select a partner type" />
                </SelectTrigger>
                <SelectContent>
                  {partnerTypes.map((pt) => (
                    <SelectItem key={pt.id} value={String(pt.id)}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {selectedUser && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedUser(null);
                setPartnerTypeId("");
              }}
              disabled={isPromoting}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!partnerTypeId || isPromoting}
            >
              {isPromoting ? <Spinner /> : "Add Partner"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
