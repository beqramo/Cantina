'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { locales } from '@/i18n';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    // Don't switch if already on this locale
    if (locale === newLocale) {
      console.log('Already on locale:', newLocale);
      return;
    }

    console.log('Switching locale from', locale, 'to', newLocale);
    console.log('Current pathname:', pathname);

    // Remove current locale from pathname if present
    let pathWithoutLocale = pathname || '/';
    for (const loc of locales) {
      if (pathname?.startsWith(`/${loc}/`)) {
        pathWithoutLocale = pathname.replace(`/${loc}`, '');
        break;
      } else if (pathname === `/${loc}`) {
        pathWithoutLocale = '/';
        break;
      }
    }

    // Ensure path starts with /
    if (!pathWithoutLocale.startsWith('/')) {
      pathWithoutLocale = '/' + pathWithoutLocale;
    }

    // Build new path with locale prefix
    // With localePrefix: 'as-needed', 'en' doesn't need a prefix
    const newPath =
      newLocale === 'en'
        ? pathWithoutLocale
        : `/${newLocale}${pathWithoutLocale}`;

    console.log('Navigating to:', newPath);

    // Use window.location for full page navigation to ensure middleware processes the locale change
    window.location.href = newPath;
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
        disabled={locale === 'pt'}
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
        disabled={locale === 'en'}
        className='cursor-pointer h-8 px-2 md:h-9 md:px-3 text-xs md:text-sm'>
        EN
      </Button>
    </div>
  );
}
