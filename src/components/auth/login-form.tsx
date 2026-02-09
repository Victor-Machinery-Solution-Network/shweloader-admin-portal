'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useActionState } from 'react';
import { loginAction, type LoginState } from '@/lib/actions/auth-actions';
import { TurnstileWidget } from '@/components/auth/turnstile-widget';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { toast } from 'sonner';

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<
    LoginState | undefined,
    FormData
  >(loginAction, undefined);

  const [email, setEmail] = useState('');
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<HTMLInputElement>(null);

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
    if (turnstileRef.current) turnstileRef.current.value = token;
  }, []);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (emailInvalid) setEmailInvalid(false);
  }

  function handleEmailBlur() {
    if (email.length > 0 && !EMAIL_REGEX.test(email)) {
      setEmailInvalid(true);
    }
  }

  // Show toast on error and refocus password field
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
      passwordRef.current?.focus();
    }
  }, [state]);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Branding */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Lock className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{APP_NAME}</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your resources2
        </p>
      </div>

      {/* Login card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-2" data-invalid={emailInvalid || undefined}>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={isPending}
                  aria-invalid={emailInvalid}
                  aria-describedby={emailInvalid ? 'email-error' : undefined}
                  className="pl-9"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                />
              </div>
              {emailInvalid && (
                <p id="email-error" className="text-xs text-destructive">
                  Please enter a valid email address.
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="pl-9 pr-9"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Turnstile */}
            <TurnstileWidget onTokenChange={handleTurnstileToken} />
            <input ref={turnstileRef} type="hidden" name="cf-turnstile-response" />

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={isPending || !turnstileToken}
            >
              {isPending ? (
                <>
                  <Spinner className="mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Footer hint */}
      <p className="text-xs text-muted-foreground">
        Contact your administrator if you need access.
      </p>
    </div>
  );
}
