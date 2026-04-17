'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { useLocale } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const { user, loading, authError } = useAuth();
  const router = useRouter();
  const locale = useLocale();

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

  return (
    <div className='space-y-4'>
      {authError && (
        <div className='container mx-auto max-w-md px-4 pt-6'>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Session</AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        </div>
      )}
      <AdminLogin />
    </div>
  );
}
