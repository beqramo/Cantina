'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

export function Header() {
  const t = useTranslations('Navigation');
  const { user } = useAuth();
  const pathname = usePathname();

  // pathname from next-intl navigation is already without locale prefix
  const isAdminRoute = pathname?.startsWith('/admin');

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
          <Link href='/' className='text-base md:text-xl font-bold shrink-0'>
            Cantina IPB
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
