'use client';

import { useTranslations } from 'next-intl';
import { DishSearch } from '@/components/dish/DishSearch';
import { DailyMenu } from '@/components/menu/DailyMenu';

export default function HomePage() {
  const t = useTranslations('Home');

  return (
    <div className='min-h-screen'>
      {/* Hero Section */}
      <div className='border-b bg-muted/30'>
        <div className='container mx-auto px-4 py-8'>
          <div className='max-w-4xl mx-auto'>
            <h1 className='text-2xl md:text-3xl font-bold mb-2'>Cantina IPB</h1>
            <p className='text-muted-foreground text-sm'>{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='container mx-auto px-4 py-6'>
        <div className='max-w-4xl mx-auto space-y-8'>
          <DishSearch />
          <DailyMenu />
        </div>
      </div>
    </div>
  );
}
