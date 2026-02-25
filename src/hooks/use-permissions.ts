import { usePermissions } from "@/components/providers/permissions-provider";

/**
 * Check if the current user has a specific permission.
 * Returns false while permissions are still loading.
 */
export function useHasPermission(
  feature: string,
  permission: string,
): boolean {
  const { permissions, isLoaded } = usePermissions();
  if (!isLoaded) return false;
  return permissions.includes(`${feature}:${permission}`);
}

/**
 * Check if the current user has ANY of the specified permissions.
 */
export function useHasAnyPermission(
  checks: Array<{ feature: string; permission: string }>,
): boolean {
  const { permissions, isLoaded } = usePermissions();
  if (!isLoaded) return false;
  return checks.some((c) =>
    permissions.includes(`${c.feature}:${c.permission}`),
  );
}
