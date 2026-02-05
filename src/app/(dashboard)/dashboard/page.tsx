/**
 * Dashboard page - /dashboard
 * Redirects to /dashboard/overview by default
 */

import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

export default function DashboardPage() {
  redirect(ROUTES.DASHBOARD_OVERVIEW);
}
