'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { useTransition } from 'react';
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';

// Helper to set cookie
function setLocaleCookie(locale: string) {
  // Set cookie with 1 year expiry
  const maxAge = 60 * 60 * 24 * 365; // 1 year in seconds
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: 'en' | 'pt') => {
    // Save user's preference to cookie so it persists
    setLocaleCookie(newLocale);

    if (analytics) {
      logEvent(analytics, 'change_language', {
        language: newLocale,
      });
    }

    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  // Show only the button for the language we can switch TO
  const targetLocale = locale === 'pt' ? 'en' : 'pt';
  const targetLabel = targetLocale === 'pt' ? 'PT' : 'EN';
  const ariaLabel = `Switch to ${
    targetLocale === 'pt' ? 'Portuguese' : 'English'
  }`;

  return (
    <div className='relative z-10'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          switchLocale(targetLocale);
        }}
        disabled={isPending}
        aria-label={ariaLabel}
        className='cursor-pointer h-8 px-2 md:h-9 md:px-3 text-xs md:text-sm'>
        {targetLabel}
      </Button>
    </div>
  );
}
