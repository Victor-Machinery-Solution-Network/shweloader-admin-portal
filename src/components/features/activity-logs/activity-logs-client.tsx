"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { useHasPermission } from "@/hooks/use-permissions";
import { ClipboardList } from "lucide-react";
import { getColumns } from "./columns";
import type { ActivityLogEntry } from "@/lib/actions/activity-log";
import type { FilterConfig } from "@/types/data-table-filters";

interface ActivityLogsClientProps {
  logs: ActivityLogEntry[];
}

export function ActivityLogsClient({ logs }: ActivityLogsClientProps) {
  const columns = useMemo(() => getColumns(), []);
  const canExport = useHasPermission("admin_users", "export");

  const filterConfig = useMemo<FilterConfig[]>(
    () => [
      {
        columnId: "admin_name",
        label: "Admin",
        type: "multi-select",
      },
      {
        columnId: "activity_date",
        label: "Date",
        type: "date-range",
      },
    ],
    [],
  );

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No activity logs"
        description="Admin actions will be recorded here."
        fullPage={false}
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={logs}
      searchKeys={["admin_name", "activity_description"]}
      searchPlaceholder="Search logs..."
      filterConfig={filterConfig}
      filterStorageKey="activity-logs-filters"
      enablePagination
      pageSize={20}
      enableExport={canExport}
      exportFileName="activity-logs"
    />
  );
}
