import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export const metadata = {
  title: 'Login',
  description: 'Login to your account',
};

async function LoginFormWithReason({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return <LoginForm reason={reason} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  return (
    <Suspense fallback={<LoginForm />}>
      <LoginFormWithReason searchParams={searchParams} />
    </Suspense>
  );
}
