'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DishList } from '@/components/admin/DishList';
import { Button } from '@/components/ui/button';
import { logoutAdmin } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Calendar } from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const t = useTranslations('Navigation');
  const tMenu = useTranslations('Menu');
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
        <h1 className='text-3xl font-bold'>{t('dashboard')}</h1>
        <div className='flex gap-2'>
          <Link href={getAdminPath('/admin/menu')}>
            <Button variant='outline'>
              <Calendar className='h-4 w-4 mr-2' />
              {tMenu('menuManagement') || 'Menu Management'}
            </Button>
          </Link>
          <Button variant='outline' onClick={handleLogout}>
            {t('logout')}
          </Button>
        </div>
      </div>
      <DishList />
    </div>
  );
}
