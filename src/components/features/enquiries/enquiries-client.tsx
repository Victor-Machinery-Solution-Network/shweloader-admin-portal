"use client";

import { useState, useMemo } from "react";
import { MessageSquare, Search } from "lucide-react";
import { useHasPermission } from "@/hooks/use-permissions";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabCount,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { EnquiryCard } from "./enquiry-card";
import type { EnquiryWithDetails, EnquiryStatusType } from "@/types/enquiry";

interface EnquiriesClientProps {
  enquiries: EnquiryWithDetails[];
  statusTypes: EnquiryStatusType[];
}

type TabValue = "all" | "pending" | "replied" | "resolved";

export function EnquiriesClient({
  enquiries,
}: EnquiriesClientProps) {
  const canDelete = useHasPermission("enquiries", "delete");
  const canChat = useHasPermission("chat", "edit");

  const [search, setSearch] = useState("");
  const [listingTypeFilter, setListingTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  // Counts derived from unfiltered enquiries (search/listing-type don't affect counts)
  const allCount = enquiries.length;
  const pendingCount = useMemo(
    () =>
      enquiries.filter(
        (e) => e.status_name?.toLowerCase() === "pending",
      ).length,
    [enquiries],
  );
  const repliedCount = useMemo(
    () =>
      enquiries.filter(
        (e) => e.status_name?.toLowerCase() === "replied",
      ).length,
    [enquiries],
  );
  const resolvedCount = useMemo(
    () =>
      enquiries.filter(
        (e) => e.status_name?.toLowerCase() === "resolved",
      ).length,
    [enquiries],
  );

  const filteredEnquiries = useMemo(() => {
    let result = enquiries;

    // Tab filter
    if (activeTab !== "all") {
      result = result.filter(
        (e) => e.status_name?.toLowerCase() === activeTab,
      );
    }

    // Search filter
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.user_name?.toLowerCase().includes(term) ||
          e.user_company?.toLowerCase().includes(term) ||
          e.model_name?.toLowerCase().includes(term) ||
          e.message?.toLowerCase().includes(term),
      );
    }

    // Listing type filter
    if (listingTypeFilter !== "all") {
      result = result.filter((e) => e.listing_type === listingTypeFilter);
    }

    return result;
  }, [enquiries, activeTab, search, listingTypeFilter]);

  if (enquiries.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No enquiries yet"
        description="User enquiries will appear here."
      />
    );
  }

  const tabContent = (
    <div className="flex flex-col gap-3">
      {/* Filters row */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search enquiries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
          <SelectTrigger className="w-[140px] shrink-0">
            <SelectValue placeholder="Listing type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sale">For Sale</SelectItem>
            <SelectItem value="rent">For Rent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Enquiry cards */}
      {filteredEnquiries.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No enquiries found"
          description="Try adjusting your filters"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredEnquiries.map((enquiry) => (
            <EnquiryCard
              key={enquiry.id}
              enquiry={enquiry}
              canDelete={canDelete}
              canChat={canChat}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as TabValue)}
    >
      <TabsList variant="segment">
        <TabsTrigger value="all">
          All <TabCount>{allCount}</TabCount>
        </TabsTrigger>
        <TabsTrigger value="pending">
          Pending <TabCount>{pendingCount}</TabCount>
        </TabsTrigger>
        <TabsTrigger value="replied">
          Replied <TabCount>{repliedCount}</TabCount>
        </TabsTrigger>
        <TabsTrigger value="resolved">
          Resolved <TabCount>{resolvedCount}</TabCount>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all">{tabContent}</TabsContent>
      <TabsContent value="pending">{tabContent}</TabsContent>
      <TabsContent value="replied">{tabContent}</TabsContent>
      <TabsContent value="resolved">{tabContent}</TabsContent>
    </Tabs>
  );
}
