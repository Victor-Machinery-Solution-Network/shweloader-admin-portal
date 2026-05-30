"use client";

import { useMemo } from "react";
import { MessageSquareText } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import type { FilterConfig } from "@/types/data-table-filters";
import { getFeedbackColumns } from "./columns";
import type { AppFeedbackWithUser } from "@/types/feedback";

interface FeedbackClientProps {
  feedback: AppFeedbackWithUser[];
}

export function FeedbackClient({ feedback }: FeedbackClientProps) {
  const columns = useMemo(() => getFeedbackColumns(), []);

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "platform",
        label: "Platform",
        type: "multi-select",
        options: [
          { label: "iOS", value: "ios" },
          { label: "Android", value: "android" },
        ],
      },
    ],
    [],
  );

  if (feedback.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="No feedback yet"
        description="Feedback submitted from the mobile app's Help & Support screen will appear here."
        fullPage={false}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={feedback}
      searchKeys={["user_name", "user_email", "message"]}
      searchPlaceholder="Search feedback"
      filterConfig={filterConfig}
      filterStorageKey="feedback-filters"
      enablePagination
      pageSize={20}
    />
  );
}
