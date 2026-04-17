'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocale } from 'next-intl';

export default function AdminClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    const isLoginRoute =
      pathname?.endsWith('/admin/login') || pathname === '/admin/login';

    if (isLoginRoute) {
      return;
    }

    if (!loading && !user) {
      const loginPath =
        locale === 'en' ? '/admin/login' : `/${locale}/admin/login`;
      router.push(loginPath);
    }
  }, [user, loading, router, pathname, locale]);

  const isLoginRoute =
    pathname?.endsWith('/admin/login') || pathname === '/admin/login';

  if (loading && !isLoginRoute) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-muted-foreground'>Loading...</div>
      </div>
    );
  }

  if (!isLoginRoute && !user) {
    return null;
  }

  return <>{children}</>;
}
