import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ROUTES } from '@/lib/constants';

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect(ROUTES.DASHBOARD);
  } else {
    redirect(ROUTES.LOGIN);
  }
}
