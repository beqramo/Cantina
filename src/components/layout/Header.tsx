'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/ui/Logo';
import { ExternalLink } from 'lucide-react';

export function Header() {
  const t = useTranslations('Navigation');
  const { user } = useAuth();
  const pathname = usePathname();

  // pathname from next-intl navigation is already without locale prefix
  const isAdminRoute = pathname?.startsWith('/admin');
  const isFlyerRoute = pathname?.startsWith('/flyer');

  if (isFlyerRoute) return null;

  const navLinks = !isAdminRoute
    ? [
        { href: '/', label: t('home') },
        { href: '/top-dishes', label: t('topDishes') },
        { href: '/about', label: t('about') },
        { href: '/rules', label: t('rules') },
      ]
    : [
        { href: '/admin/dashboard', label: t('dashboard') },
        { href: '/admin/approvals', label: t('approvals') },
      ];

  return (
    <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60'>
      {/* Top Row: Logo and Controls */}
      <div className='container flex h-12 md:h-16 items-center justify-between px-3 md:px-4'>
        <div className='flex items-center gap-2 md:gap-6'>
          <Link
            href='/'
            className='shrink-0 hover:opacity-80 transition-opacity'>
            <Logo className='text-lg md:text-xl' />
          </Link>
          {/* Desktop Navigation - Inline with logo */}
          <nav className='hidden md:flex items-center gap-4'>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className='flex items-center gap-1 md:gap-4 shrink-0'>
          {!isAdminRoute && (
            <a
              href='https://online.ipb.pt/ui/#/site/sas/senhas'
              target='_blank'
              rel='noopener noreferrer'>
              <Button
                size='sm'
                className='h-8 px-2.5 text-[11px] font-semibold sm:text-xs md:h-9 md:px-4 md:text-sm bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md border-0 tracking-tight sm:tracking-normal'>
                {t('orderNow') || 'Order Now'}
                <ExternalLink className='w-3 h-3 ml-1.5 opacity-90 hidden sm:inline-block' />
              </Button>
            </a>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
          {user && !isAdminRoute && (
            <Link href='/admin/dashboard'>
              <Button
                variant='outline'
                size='sm'
                className='h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm'>
                {t('admin')}
              </Button>
            </Link>
          )}
        </div>
      </div>
      {/* Bottom Row: Mobile Navigation Links - Always Visible */}
      <div className='md:hidden border-t'>
        <nav className='container px-3'>
          <div className='flex items-center gap-2 overflow-x-auto scrollbar-hide py-2'>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap text-xs font-medium transition-colors px-2 py-1 rounded-md ${
                  pathname === link.href
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-primary hover:bg-accent'
                }`}>
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
