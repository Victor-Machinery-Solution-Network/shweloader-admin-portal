import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export const metadata = {
  title: 'Login',
  description: 'Login to your account',
};

// Server-only flag — never NEXT_PUBLIC_ (which is baked into the client bundle
// and visible to anyone inspecting the JS).
const turnstileDisabled = process.env.DISABLE_TURNSTILE === 'true';

async function LoginFormWithReason({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return <LoginForm reason={reason} turnstileDisabled={turnstileDisabled} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  return (
    <Suspense fallback={<LoginForm turnstileDisabled={turnstileDisabled} />}>
      <LoginFormWithReason searchParams={searchParams} />
    </Suspense>
  );
}
