import { createNavigation } from 'next-intl/navigation';
import { locales } from '@/i18n';

export const defaultLocale = 'en' as const;

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

