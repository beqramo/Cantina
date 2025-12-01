'use client';

import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: TurnstileOptions
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'invisible';
  language?: string;
}

interface TurnstileProps {
  /** Callback when verification succeeds, receives the token */
  onVerify: (token: string) => void;
  /** Callback when verification fails */
  onError?: () => void;
  /** Callback when token expires (after ~5 minutes) */
  onExpire?: () => void;
  /** Theme preference */
  theme?: 'light' | 'dark' | 'auto';
  /** Widget size - use 'invisible' for seamless UX */
  size?: 'normal' | 'compact' | 'invisible';
  /** Language code (e.g., 'pt', 'en') */
  language?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Cloudflare Turnstile CAPTCHA Component
 *
 * Usage:
 * ```tsx
 * const [token, setToken] = useState<string | null>(null);
 *
 * <Turnstile
 *   onVerify={setToken}
 *   onError={() => setToken(null)}
 *   theme="auto"
 * />
 *
 * // Then include token in your form submission
 * formData.append('turnstile-token', token);
 * ```
 */
export function Turnstile({
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
  language,
  className = '',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return;

    // Remove existing widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Widget might already be removed
      }
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'error-callback': onError,
      'expired-callback': onExpire,
      theme,
      size,
      language,
    });
  }, [siteKey, onVerify, onError, onExpire, theme, size, language]);

  useEffect(() => {
    // If Turnstile not configured, skip
    if (!siteKey) {
      console.warn('[Turnstile] Site key not configured');
      // Auto-verify in dev mode
      if (process.env.NODE_ENV === 'development') {
        onVerify('dev-mode-token');
      }
      return;
    }

    // Load script if not already loaded
    if (!scriptLoadedRef.current && !window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
      script.async = true;
      script.defer = true;

      window.onTurnstileLoad = () => {
        scriptLoadedRef.current = true;
        renderWidget();
      };

      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget might already be removed
        }
      }
    };
  }, [siteKey, renderWidget, onVerify]);

  // If not configured, show nothing (or a placeholder in dev)
  if (!siteKey) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className={`text-xs text-muted-foreground ${className}`}>
          [Turnstile disabled - dev mode]
        </div>
      );
    }
    return null;
  }

  return <div ref={containerRef} className={className} />;
}

/**
 * Hook to manage Turnstile state
 */
export function useTurnstile() {
  const tokenRef = useRef<string | null>(null);

  const setToken = useCallback((token: string) => {
    tokenRef.current = token;
  }, []);

  const clearToken = useCallback(() => {
    tokenRef.current = null;
  }, []);

  const getToken = useCallback(() => tokenRef.current, []);

  return {
    setToken,
    clearToken,
    getToken,
  };
}

