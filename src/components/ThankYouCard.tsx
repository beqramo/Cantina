'use client';

import { useState, useEffect } from 'react';
import {
  getPendingApprovals,
  removePendingApproval,
  updateLastChecked,
  PendingApprovalEntry,
} from '@/lib/pending-approvals';
import { getDishById } from '@/lib/firestore';
import { useTranslations } from 'next-intl';
import { X, ChevronDown, ChevronUp, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Throttle interval: 60 seconds
const CHECK_THROTTLE_MS = 60 * 1000;

interface ApprovedItem extends PendingApprovalEntry {
  dishName: string;
}

export function ThankYouCard() {
  const t = useTranslations('ThankYou');
  const [approvedItems, setApprovedItems] = useState<ApprovedItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkApprovals = async () => {
    const pending = getPendingApprovals();
    if (pending.length === 0) return;

    const newApprovedItems: ApprovedItem[] = [];

    // Process checks
    await Promise.all(
      pending.map(async (entry) => {
        // Skip if checked recently
        if (
          entry.lastChecked &&
          Date.now() - entry.lastChecked < CHECK_THROTTLE_MS
        ) {
          return;
        }

        try {
          // Update last checked immediately
          updateLastChecked(entry.id, entry.imageUrl);

          // Fetch fresh dish data
          const dish = await getDishById(entry.id);

          if (!dish) {
            // Should likely not happen unless deleted. If so, maybe remove pending?
            // For now, let's ignore.
            return;
          }

          if (entry.type === 'dish') {
            if (dish.status === 'approved') {
              // Approved!
              newApprovedItems.push({ ...entry, dishName: dish.name });
              // Remove from pending so we don't show it again after dismiss/reload
              removePendingApproval((e) => e.id === entry.id);
            } else if (dish.status === 'rejected') {
              // Rejected :( Remove silently
            }
          } else if (entry.type === 'image' && entry.imageUrl) {
            const isPending = dish.pendingImages?.some(
              (img) => img.imageUrl === entry.imageUrl,
            );
            const isApproved =
              dish.imageUrl === entry.imageUrl ||
              dish.images?.some((img) => img === entry.imageUrl);

            if (!isPending) {
              if (isApproved) {
                // Approved!
                newApprovedItems.push({ ...entry, dishName: dish.name });
                removePendingApproval(
                  (e) => e.id === entry.id && e.imageUrl === entry.imageUrl,
                );
              } else {
                // Not pending and not approved = Rejected (or deleted)
                // BUT: Give it a grace period (e.g. 5 mins) to account for Firestore consistency/propagation
                // prevents removing a just-uploaded image that hasn't appeared in pendingImages yet
                const isNew = Date.now() - entry.createdAt < 5 * 60 * 1000;
                if (!isNew) {
                  removePendingApproval(
                    (e) => e.id === entry.id && e.imageUrl === entry.imageUrl,
                  );
                }
              }
            }
          }
        } catch (error) {
          console.error('Error checking approval for', entry.id, error);
        }
      }),
    );

    if (newApprovedItems.length > 0) {
      setApprovedItems((prev) => [...prev, ...newApprovedItems]);
      setIsVisible(true);
    }
  };

  const handleDismiss = (index: number) => {
    // Optimistic UI update
    setApprovedItems((prev) => {
      const newItems = prev.filter((_, i) => i !== index);
      if (newItems.length === 0) {
        setIsVisible(false);
      }
      return newItems;
    });
    // Also remove from pending approvals (though it should be gone already from checking loop)
    // But if we want to be safe or if the loop didn't remove it yet
    if (approvedItems[index]) {
      const item = approvedItems[index];
      if (item.type === 'dish') {
        removePendingApproval((e) => e.id === item.id);
      } else {
        removePendingApproval(
          (e) => e.id === item.id && e.imageUrl === item.imageUrl,
        );
      }
    }
  };

  const handleDismissAll = () => {
    setApprovedItems([]);
    setIsVisible(false);
  };

  if (!isVisible || approvedItems.length === 0) return null;

  const firstItem = approvedItems[0];
  const otherItems = approvedItems.slice(1);

  return (
    <div className='w-full max-w-4xl mx-auto mb-6 px-1 transition-all duration-500 ease-in-out'>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border bg-card shadow-sm transition-all',
          'bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4',
        )}>
        {/* Main Card Content (First Item) */}
        <div className='p-4 sm:p-5 flex items-start gap-4'>
          <div className='shrink-0 p-2 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'>
            <Sparkles className='w-5 h-5' />
          </div>

          <div className='flex-1 min-w-0 pt-1'>
            <h3 className='font-semibold text-lg text-foreground mb-1'>
              {t('thankYouTitle')}
            </h3>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {firstItem.type === 'dish'
                ? t('dishApproved', { dish: firstItem.dishName })
                : t('imageApproved', { dish: firstItem.dishName })}
            </p>

            {otherItems.length > 0 && (
              <div className='mt-3 text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1'>
                <CheckCircle className='w-3 h-3' />
                <span>+{otherItems.length} other approvals</span>
              </div>
            )}
          </div>

          <div className='flex flex-col items-end gap-2'>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 text-muted-foreground hover:text-foreground -mr-2 -mt-2'
              onClick={() => handleDismiss(0)}>
              <X className='w-4 h-4' />
              <span className='sr-only'>{t('close')}</span>
            </Button>
            {otherItems.length > 0 && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setIsExpanded(!isExpanded)}
                className='text-xs h-7 px-2'>
                {isExpanded ? (
                  <>
                    {t('hide')} <ChevronUp className='w-3 h-3 ml-1' />
                  </>
                ) : (
                  <>
                    {t('view')} <ChevronDown className='w-3 h-3 ml-1' />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Stacked/Collapsed Items */}
        {otherItems.length > 0 && (
          <div
            className={cn(
              'border-t border-green-100 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/10 overflow-hidden transition-all duration-300 ease-in-out',
              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
            )}>
            {otherItems.map((item, index) => (
              <div
                key={`${item.id}-${item.type}-${index}`}
                className='p-3 px-14 border-b border-green-100 dark:border-green-800/30 last:border-0 flex justify-between items-center text-sm'>
                <span className='text-muted-foreground'>
                  {item.type === 'dish'
                    ? t('dishApproved', { dish: item.dishName })
                    : t('imageApproved', { dish: item.dishName })}
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6 text-muted-foreground hover:text-foreground'
                  onClick={() => handleDismiss(index + 1)} // +1 because index 0 is firstItem
                >
                  <X className='w-3 h-3' />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
