"use client";

import { useState, useTransition } from "react";
import { Search, Ban } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { searchUsersForBlacklist } from "@/lib/actions/blacklist";
import type { AppUser } from "@/types/app-user";

interface BlacklistSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (user: AppUser) => void;
}

export function BlacklistSearchDialog({
  open,
  onOpenChange,
  onSelectUser,
}: BlacklistSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AppUser[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, startTransition] = useTransition();

  function handleSearch() {
    if (query.trim().length < 2) return;

    startTransition(async () => {
      const result = await searchUsersForBlacklist(query);
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

  function handleSelect(user: AppUser) {
    onSelectUser(user);
    resetAndClose();
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      resetAndClose();
    } else {
      onOpenChange(true);
    }
  }

  function resetAndClose() {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Blacklist</DialogTitle>
          <DialogDescription>
            Search for a user by name, phone, email, or company.
          </DialogDescription>
        </DialogHeader>

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
            {isSearching ? (
              <Spinner />
            ) : (
              <Search className="size-4" />
            )}
          </Button>
        </div>

        {hasSearched && results.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No users found.
          </p>
        )}

        {results.length > 0 && (
          <div className="max-h-64 space-y-1.5 overflow-y-auto overscroll-contain">
            {results.map((user) => (
              <button
                key={user.app_user_id}
                type="button"
                onClick={() => handleSelect(user)}
                className="hover:bg-muted w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Ban className="text-muted-foreground size-4 shrink-0" />
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
      </DialogContent>
    </Dialog>
  );
}
