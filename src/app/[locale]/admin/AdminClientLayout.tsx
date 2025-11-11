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
    // Check if we're on login route (with or without locale)
    const isLoginRoute =
      pathname?.endsWith('/admin/login') || pathname === '/admin/login';

    console.log('[AdminClientLayout] useEffect triggered:', {
      isLoginRoute,
      loading,
      hasUser: !!user,
      pathname,
    });

    if (isLoginRoute) {
      console.log('[AdminClientLayout] Login route - skipping redirect check');
      return;
    }

    // Protect all other admin routes - just check if user is authenticated
    if (!loading && !user) {
      const loginPath =
        locale === 'en' ? '/admin/login' : `/${locale}/admin/login`;
      console.log('[AdminClientLayout] Redirecting to login:', {
        loginPath,
        reason: 'No authenticated user',
        loading,
      });
      router.push(loginPath);
    } else if (!loading && user) {
      console.log('[AdminClientLayout] User authenticated - allowing access');
    }
  }, [user, loading, router, pathname, locale]);

  // Check if we're on login route
  const isLoginRoute =
    pathname?.endsWith('/admin/login') || pathname === '/admin/login';

  console.log('[AdminClientLayout] Render check:', {
    isLoginRoute,
    loading,
    hasUser: !!user,
    willShowLoading: loading && !isLoginRoute,
    willShowContent: isLoginRoute || !!user,
  });

  // Show loading state while checking auth
  if (loading && !isLoginRoute) {
    console.log('[AdminClientLayout] Showing loading state');
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-muted-foreground'>Loading...</div>
      </div>
    );
  }

  // Don't render protected content if not authenticated (except login page)
  if (!isLoginRoute && !user) {
    console.log(
      '[AdminClientLayout] Not rendering content - not authenticated:',
      {
        hasUser: !!user,
      },
    );
    return null;
  }

  console.log('[AdminClientLayout] Rendering children');
  return <>{children}</>;
}
