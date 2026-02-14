import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ROUTES } from '@/lib/constants';

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}

async function HomeRedirect(): Promise<React.ReactNode> {
  const session = await auth();
  redirect(session ? ROUTES.DASHBOARD : ROUTES.LOGIN);
}
