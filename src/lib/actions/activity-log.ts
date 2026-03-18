"use server";

import { d1 } from "@/lib/api/d1-client";

export interface ActivityLogEntry {
  log_id: number;
  user_id: number | null;
  activity_description: string;
  activity_date: string;
  admin_name: string | null;
}

/** Fetched inside "use cache" — auth is handled by PermissionGate in page.tsx */
export async function getActivityLogs(): Promise<ActivityLogEntry[]> {
  const result = await d1.query<ActivityLogEntry>(
    `SELECT
      al.log_id,
      al.user_id,
      al.activity_description,
      al.activity_date,
      au.username AS admin_name
    FROM admin_activity_log al
    LEFT JOIN admin_user au ON al.user_id = au.user_id
    ORDER BY al.activity_date DESC`,
  );
  return result.results;
}
