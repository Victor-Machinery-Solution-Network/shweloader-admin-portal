"use client";

import { useState, useEffect } from "react";
import { Search, Handshake, ArrowLeft, Mail, Phone, Building2 } from "lucide-react";
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
  /** Server-prefetched list of eligible (non-approved) users, shown instantly. */
  initialUsers: AppUser[];
}

/** User contact line: email / phone / company, each with a leading icon. */
function UserMeta({ user }: { user: AppUser }) {
  return (
    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-6 text-xs">
      <span className="flex items-center gap-1">
        <Mail className="size-3 shrink-0" />
        {user.email}
      </span>
      {user.phone && (
        <span className="flex items-center gap-1">
          <Phone className="size-3 shrink-0" />
          {user.phone}
        </span>
      )}
      {user.company_name && (
        <span className="flex items-center gap-1">
          <Building2 className="size-3 shrink-0" />
          {user.company_name}
        </span>
      )}
    </div>
  );
}

/**
 * Admin-initiated "promote an existing user to Partner" flow. Two phases in one
 * dialog: (1) browse/search a list of users who aren't already approved partners
 * (the list is server-prefetched so it shows instantly — typing only filters),
 * then (2) choose a required partner type and confirm. Instant-approves via
 * promoteUserToPartner.
 */
export function AddPartnerDialog({
  open,
  onOpenChange,
  partnerTypes,
  initialUsers,
}: AddPartnerDialogProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AppUser[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [partnerTypeId, setPartnerTypeId] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);

  // Empty/short query → the server-prefetched list (no round-trip, derived). A
  // 2+ char query is fetched live (debounced) and shown instead.
  const isSearching = query.trim().length >= 2;
  const displayedUsers = isSearching ? (searchResults ?? []) : initialUsers;
  // Spinner while a search is pending (no results yet for this query, or fetch
  // in flight). setState stays inside the async callback to avoid cascading
  // renders from synchronous setState in the effect body.
  const showSpinner = isSearching && (searchResults === null || isLoading);

  useEffect(() => {
    if (!open || selectedUser || !isSearching) return;
    let active = true;
    const handle = setTimeout(async () => {
      setIsLoading(true);
      const result = await searchUsersForPartner(query);
      if (!active) return;
      setIsLoading(false);
      if (result.success) {
        setSearchResults(result.data);
      } else {
        toast.error(result.error ?? "Failed to load users");
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [open, selectedUser, isSearching, query]);

  function reset() {
    setQuery("");
    setSearchResults(null);
    setIsLoading(false);
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

  async function handleConfirm() {
    if (!selectedUser || !partnerTypeId) return;
    setIsPromoting(true);
    const result = await promoteUserToPartner(
      selectedUser.app_user_id,
      Number(partnerTypeId),
    );
    setIsPromoting(false);
    if (result.success) {
      toast.success(`${selectedUser.username} is now a partner`);
      reset();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Failed to add partner");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Partner</DialogTitle>
          <DialogDescription>
            {selectedUser
              ? "Choose a partner type to approve this user as a partner."
              : "Pick a user to promote, or search by name, phone, email, or company."}
          </DialogDescription>
        </DialogHeader>

        {!selectedUser ? (
          <>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users…"
                className="pl-8"
                autoFocus
              />
            </div>

            <div className="max-h-72 min-h-32 space-y-1.5 overflow-y-auto overscroll-contain">
              {showSpinner && displayedUsers.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : displayedUsers.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No eligible users found.
                </p>
              ) : (
                displayedUsers.map((user) => (
                  <button
                    key={user.app_user_id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className="hover:bg-muted w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Handshake className="text-muted-foreground size-4 shrink-0" />
                      <span className="text-sm font-medium">
                        {user.username}
                      </span>
                    </div>
                    <UserMeta user={user} />
                  </button>
                ))
              )}
            </div>
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
              <UserMeta user={selectedUser} />
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
                setQuery("");
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
