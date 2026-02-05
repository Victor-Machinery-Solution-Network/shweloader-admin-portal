/**
 * Root page - redirect to dashboard
 */

import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';

export default function HomePage() {
  // TODO: Check authentication and redirect accordingly
  // If authenticated, go to dashboard
  // If not authenticated, go to login
  redirect(ROUTES.DASHBOARD);
}