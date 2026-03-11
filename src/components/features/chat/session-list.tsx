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

type FilterTab = "all" | "unread" | "enquiries" | "closed";

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
      enquiries: sorted.filter((s) => s.enquiry_id != null).length,
      closed: sorted.filter((s) => s.status === "closed").length,
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
      case "enquiries":
        list = list.filter((s) => s.enquiry_id != null);
        break;
      case "closed":
        list = list.filter((s) => s.status === "closed");
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
            <TabsTrigger value="enquiries" className="text-xs gap-1">
              Enquiries
              {counts.enquiries > 0 && <TabCount>{counts.enquiries}</TabCount>}
            </TabsTrigger>
            <TabsTrigger value="closed" className="text-xs gap-1">
              Closed
              {counts.closed > 0 && <TabCount>{counts.closed}</TabCount>}
            </TabsTrigger>
          </TabsList>
        </div>

        {(["all", "unread", "enquiries", "closed"] as FilterTab[]).map(
          (tab) => (
            <TabsContent key={tab} value={tab} className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                {filtered.length > 0 ? (
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
                ) : (
                  <EmptyState
                    icon={MessageSquare}
                    title={
                      search
                        ? "No results found"
                        : tab === "unread"
                          ? "No unread messages"
                          : tab === "enquiries"
                            ? "No enquiry sessions"
                            : tab === "closed"
                              ? "No closed sessions"
                              : "No conversations yet"
                    }
                    description={
                      search
                        ? "Try a different search term."
                        : undefined
                    }
                    fullPage={false}
                  />
                )}
              </ScrollArea>
            </TabsContent>
          ),
        )}
      </Tabs>
    </div>
  );
}
