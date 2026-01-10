'use client';

import { useState, useEffect } from 'react';
import {
  getPendingApprovals,
  PendingApprovalEntry,
} from '@/lib/pending-approvals';
import { useTranslations } from 'next-intl';
import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PendingReviewCard() {
  const t = useTranslations('PendingReview');
  const [pendingItems, setPendingItems] = useState<PendingApprovalEntry[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Function to checking pending items
    const checkItems = () => {
      const items = getPendingApprovals();
      setPendingItems(items);
      if (items.length > 0) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Initial check
    checkItems();

    // Listen for custom event (same window)
    const handleCustomUpdate = () => checkItems();

    // Listen for storage event (other tabs)
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'cantina_pending_approvals') {
        checkItems();
      }
    };

    window.addEventListener('cantina:pending-update', handleCustomUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('cantina:pending-update', handleCustomUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  if (!isVisible || pendingItems.length === 0) return null;

  // Logic to determine what text to show
  // User requested "only one" card.
  // We prioritize the latest one? Or just a summary?
  // "only one when user submitted the image and it is waitinf for the approval."
  // Let's grab the most recent one.
  const latestItem = pendingItems[pendingItems.length - 1]; // items are usually pushed, so last is newest?
  // pending-approvals.ts uses push(). So last is newest.

  const count = pendingItems.length;

  return (
    <div className='w-full max-w-4xl mx-auto mb-6 px-1 transition-all duration-500 ease-in-out'>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all',
          'bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4',
        )}>
        <div className='p-4 sm:p-5 flex items-start gap-4'>
          <div className='shrink-0 p-2 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'>
            <Clock className='w-5 h-5' />
          </div>

          <div className='flex-1 min-w-0 pt-1'>
            <h3 className='font-semibold text-lg text-foreground mb-1'>
              {t('title')}
            </h3>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {count === 1
                ? latestItem.type === 'dish'
                  ? t('singleDish', { dish: latestItem.name ?? '' })
                  : t('singleImage', { dish: latestItem.name ?? '' })
                : t('multipleItems', { count })}
            </p>
          </div>

          <div className='flex flex-col items-end gap-2'>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-muted-foreground hover:text-foreground -mr-2 -mt-2'
              onClick={() => setIsVisible(false)}>
              <X className='w-4 h-4' />
              <span className='sr-only'>{t('close')}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
