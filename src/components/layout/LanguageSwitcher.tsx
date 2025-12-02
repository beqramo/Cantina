'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { useTransition } from 'react';
import { Check } from 'lucide-react';

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

  const isPTActive = locale === 'pt';
  const isENActive = locale === 'en';

  return (
    <div className='flex gap-1 md:gap-2 relative z-10'>
      <Button
        type='button'
        variant={isPTActive ? 'secondary' : 'ghost'}
        size='sm'
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          switchLocale('pt');
        }}
        disabled={isPTActive || isPending}
        aria-label='Switch to Portuguese'
        aria-pressed={isPTActive}
        className='cursor-pointer h-8 px-2 md:h-9 md:px-3 text-xs md:text-sm'>
        {isPTActive && <Check className='h-3 w-3 md:h-3.5 md:w-3.5' />}
        PT
      </Button>
      <Button
        type='button'
        variant={isENActive ? 'secondary' : 'ghost'}
        size='sm'
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          switchLocale('en');
        }}
        disabled={isENActive || isPending}
        aria-label='Switch to English'
        aria-pressed={isENActive}
        className='cursor-pointer h-8 px-2 md:h-9 md:px-3 text-xs md:text-sm'>
        {isENActive && <Check className='h-3 w-3 md:h-3.5 md:w-3.5' />}
        EN
      </Button>
    </div>
  );
}
