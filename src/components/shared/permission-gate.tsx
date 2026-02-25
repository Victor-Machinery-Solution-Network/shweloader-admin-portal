import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { auth } from "@/lib/auth";
import { getCachedPermissionsForRole } from "@/lib/cache";
import { EmptyState } from "@/components/shared/empty-state";

interface PermissionGateProps {
  feature: string | string[];
  permission?: string;
  children: React.ReactNode;
}

/**
 * Async server component that checks RBAC permissions before rendering children.
 * Place inside Suspense, wrapping cached content components.
 *
 * - Reads JWT session (no DB call) + cached permissions (~5ms when warm)
 * - Supports OR logic for arrays: access granted if ANY feature matches
 * - Renders inline "Access Denied" if unauthorized (no redirect — avoids loops)
 */
export async function PermissionGate({
  feature,
  permission = "read",
  children,
}: PermissionGateProps) {
  const session = await auth();
  if (!session?.user?.role_id) {
    redirect("/login");
  }

  const perms = await getCachedPermissionsForRole(session.user.role_id);
  const features = Array.isArray(feature) ? feature : [feature];
  const hasAccess = features.some((f) => perms.includes(`${f}:${permission}`));

  if (!hasAccess) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access Denied"
        description="You don't have permission to view this page. Contact your administrator to request access."
      />
    );
  }

  return <>{children}</>;
}
