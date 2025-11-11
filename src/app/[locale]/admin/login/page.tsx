'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { useLocale } from 'next-intl';

export default function AdminLoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  // Helper to build locale-aware admin path
  const getAdminPath = (path: string) => {
    return locale === 'en' ? path : `/${locale}${path}`;
  };

  useEffect(() => {
    if (!loading && user) {
      router.push(getAdminPath('/admin/dashboard'));
    }
  }, [user, loading, router, locale]);

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-muted-foreground'>Loading...</div>
      </div>
    );
  }

  return <AdminLogin />;
}
