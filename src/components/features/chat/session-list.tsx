"use client";

import { useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabCount } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { SessionCard } from "./session-card";
import type { ChatSessionWithDetails } from "@/types/chat";

interface SessionListProps {
  sessions: ChatSessionWithDetails[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

type FilterTab = "all" | "unread" | "pending" | "resolved";

export function SessionList({ sessions, selectedId, onSelect }: SessionListProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Sorted by last_message_at DESC (should already be sorted from server, but ensure)
  const sorted = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime(),
      ),
    [sessions],
  );

  // Tab counts
  const counts = useMemo(
    () => ({
      all: sorted.length,
      unread: sorted.filter((s) => s.unread_admin_count > 0).length,
      pending: sorted.filter((s) => s.status === "pending").length,
      resolved: sorted.filter((s) => s.status === "resolved").length,
    }),
    [sorted],
  );

  // Filter by tab + search
  const filtered = useMemo(() => {
    let list = sorted;

    switch (activeTab) {
      case "unread":
        list = list.filter((s) => s.unread_admin_count > 0);
        break;
      case "pending":
        list = list.filter((s) => s.status === "pending");
        break;
      case "resolved":
        list = list.filter((s) => s.status === "resolved");
        break;
      default:
        break;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.user_name.toLowerCase().includes(q) ||
          (s.product_name?.toLowerCase().includes(q) ?? false) ||
          (s.user_company?.toLowerCase().includes(q) ?? false) ||
          s.last_message_preview.toLowerCase().includes(q),
      );
    }

    return list;
  }, [sorted, activeTab, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-3 border-b border-border">
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as FilterTab)}
        className="flex flex-col flex-1 min-h-0 gap-0"
      >
        <div className="px-3 pt-2 pb-1 border-b border-border">
          <TabsList variant="line" className="gap-0">
            <TabsTrigger value="all" className="text-xs gap-1">
              All
              {counts.all > 0 && <TabCount>{counts.all}</TabCount>}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs gap-1">
              Unread
              {counts.unread > 0 && <TabCount>{counts.unread}</TabCount>}
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs gap-1">
              Pending
              {counts.pending > 0 && <TabCount>{counts.pending}</TabCount>}
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs gap-1">
              Resolved
              {counts.resolved > 0 && <TabCount>{counts.resolved}</TabCount>}
            </TabsTrigger>
          </TabsList>
        </div>

        {(["all", "unread", "pending", "resolved"] as FilterTab[]).map(
          (tab) => (
            <TabsContent key={tab} value={tab} className="flex-1 min-h-0 mt-0">
              {filtered.length > 0 ? (
                <ScrollArea className="h-full" viewportClassName="[&>div]:!block">
                  <div className="py-1">
                    {filtered.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        isSelected={selectedId === session.id}
                        onClick={() => onSelect(session.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title={
                    search
                      ? "No results found"
                      : tab === "unread"
                        ? "No unread messages"
                        : tab === "pending"
                          ? "No pending sessions"
                          : tab === "resolved"
                            ? "No resolved sessions"
                            : "No conversations yet"
                  }
                  description={
                    search
                      ? "Try a different search term."
                      : undefined
                  }
                />
              )}
            </TabsContent>
          ),
        )}
      </Tabs>
    </div>
  );
}
