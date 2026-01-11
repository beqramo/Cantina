'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMenuDate } from '@/lib/time';
import { useLocale } from 'next-intl';

import { memo } from 'react';

interface MenuNavigationProps {
  currentDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  isLoading: boolean;
}

export const MenuNavigation = memo(function MenuNavigation({
  currentDate,
  onPrevious,
  onNext,
  isLoading,
}: MenuNavigationProps) {
  const t = useTranslations('Menu');
  const locale = useLocale();

  return (
    <div className='flex items-center justify-between mb-8'>
      <Button
        variant='outline'
        size='sm'
        onClick={onPrevious}
        disabled={isLoading}
        className='flex items-center gap-2 cursor-pointer hover:bg-muted/80 transition-colors'>
        <ChevronLeft className='h-4 w-4' />
        <span className='hidden sm:inline'>{t('previous') || 'Previous'}</span>
      </Button>

      <div className='text-center'>
        <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1'>
          {t('dailyMenu') || 'Daily Menu'}
        </h2>
        <div className='font-bold text-xl md:text-2xl tracking-tight'>
          {formatMenuDate(currentDate, locale)}
        </div>
        {isToday(currentDate) && (
          <div className='text-xs font-medium text-primary mt-0.5'>
            {t('today') || 'Today'}
          </div>
        )}
      </div>

      <Button
        variant='outline'
        size='sm'
        onClick={onNext}
        disabled={isLoading}
        className='flex items-center gap-2 cursor-pointer hover:bg-muted/80 transition-colors'>
        <span className='hidden sm:inline'>{t('next') || 'Next'}</span>
        <ChevronRight className='h-4 w-4' />
      </Button>
    </div>
  );
});

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
