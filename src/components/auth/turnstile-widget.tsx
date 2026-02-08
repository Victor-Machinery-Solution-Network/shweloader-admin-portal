'use client';

import { useEffect, useRef, useCallback } from 'react';
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

interface TurnstileWidgetProps {
  onTokenChange: (token: string) => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!;

export function TurnstileWidget({ onTokenChange }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => onTokenChange(token),
      'expired-callback': () => onTokenChange(''),
      'error-callback': () => onTokenChange(''),
      theme: 'auto',
      size: 'normal',
    });
  }, [onTokenChange]);

  useEffect(() => {
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
  }, [renderWidget]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={renderWidget}
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  );
}
