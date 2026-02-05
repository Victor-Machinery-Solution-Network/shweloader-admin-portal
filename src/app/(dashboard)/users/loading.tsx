/**
 * Loading state for users page
 * Automatically shown while page.tsx is loading
 */

import { PageSkeleton } from '@/components/shared/loading-skeleton';

export default function UsersLoading() {
  return <PageSkeleton />;
}
