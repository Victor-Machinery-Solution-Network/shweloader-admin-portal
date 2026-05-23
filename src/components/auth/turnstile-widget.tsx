'use client';

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
          theme: 'light' | 'dark' | 'auto';
          size: 'normal' | 'compact';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export interface TurnstileHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  onTokenChange: (token: string) => void;
  /** Disabled is driven by the SERVER-ONLY env var via a prop from the
   *  login page (server component). Never read NEXT_PUBLIC_DISABLE_TURNSTILE
   *  here — that value would be baked into the client bundle. */
  disabled?: boolean;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;

export const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onTokenChange, disabled = false }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    // In dev/test with Turnstile disabled, provide a dummy token immediately
    useEffect(() => {
      if (disabled) onTokenChange('disabled');
    }, [disabled, onTokenChange]);

    useImperativeHandle(ref, () => ({
      reset() {
        if (disabled) { onTokenChange('disabled'); return; }
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
          onTokenChange('');
        }
      },
    }), [disabled, onTokenChange]);

    const renderWidget = useCallback(() => {
      if (disabled) return;
      if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onTokenChange(token),
        'expired-callback': () => onTokenChange(''),
        'error-callback': () => onTokenChange(''),
        theme: 'light',
        size: 'normal',
      });
    }, [disabled, onTokenChange]);

    useEffect(() => {
      if (disabled) return;
      // If script already loaded, render immediately
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        renderWidget();
      }

      return () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [disabled, renderWidget]);

    if (disabled) return null;

    return (
      <>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          onReady={renderWidget}
        />
        {/* Fixed height (65px) prevents layout shift while widget loads */}
        <div ref={containerRef} className="flex min-h-[65px] justify-center" />
      </>
    );
  }
);
