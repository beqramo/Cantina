'use client';

import { useRouter } from 'next/navigation';
import { ApprovalList } from '@/components/admin/ApprovalList';
import { Button } from '@/components/ui/button';
import { logoutAdmin } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

export default function AdminApprovalsPage() {
  const router = useRouter();
  const t = useTranslations('Admin');
  const tNav = useTranslations('Navigation');
  const locale = useLocale();

  // Helper to build locale-aware admin path
  const getAdminPath = (path: string) => {
    return locale === 'en' ? path : `/${locale}${path}`;
  };

  const handleLogout = async () => {
    await logoutAdmin();
    router.push(getAdminPath('/admin/login'));
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold'>{t('pendingRequests')}</h1>
        <Button variant='outline' onClick={handleLogout}>
          {tNav('logout')}
        </Button>
      </div>
      <ApprovalList />
    </div>
  );
}
