'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { useTransition } from 'react';

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
    // Don't switch if already on this locale
    if (locale === newLocale) {
      return;
    }

    // Save user's preference to cookie so it persists
    setLocaleCookie(newLocale);

    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div className='flex gap-1 md:gap-2 relative z-10'>
      <Button
        type='button'
        variant={locale === 'pt' ? 'default' : 'outline'}
        size='sm'
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          switchLocale('pt');
        }}
        disabled={locale === 'pt' || isPending}
        className='cursor-pointer h-8 px-2 md:h-9 md:px-3 text-xs md:text-sm'>
        PT
      </Button>
      <Button
        type='button'
        variant={locale === 'en' ? 'default' : 'outline'}
        size='sm'
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          switchLocale('en');
        }}
        disabled={locale === 'en' || isPending}
        className='cursor-pointer h-8 px-2 md:h-9 md:px-3 text-xs md:text-sm'>
        EN
      </Button>
    </div>
  );
}
