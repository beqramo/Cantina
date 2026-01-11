'use client';

import { useState, useEffect } from 'react';
import {
  getPendingApprovals,
  removePendingApproval,
  updateLastChecked,
  getResolvedApprovals,
  addResolvedApproval,
  removeResolvedApproval,
  RESOLVED_UPDATE_EVENT,
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
    const syncApprovals = () => {
      const items = getResolvedApprovals();
      setApprovedItems(items as ApprovedItem[]);
      if (items.length > 0) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key?.includes('resolved_approvals')) syncApprovals();
    };

    syncApprovals();
    checkApprovals();

    window.addEventListener(RESOLVED_UPDATE_EVENT, syncApprovals);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(RESOLVED_UPDATE_EVENT, syncApprovals);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const checkApprovals = async () => {
    const pending = getPendingApprovals();
    if (pending.length === 0) return;

    const newApprovedItems: ApprovedItem[] = [];

    // Process checks
    await Promise.all(
      pending.map(async (entry) => {
        // Skip if checked recently (within 60s)
        if (
          entry.lastChecked &&
          Date.now() - entry.lastChecked < CHECK_THROTTLE_MS
        ) {
          return;
        }

        try {
          updateLastChecked(entry.id, entry.imageUrl);
          const dish = await getDishById(entry.id);

          if (!dish) {
            removePendingApproval((e) => e.id === entry.id);
            return;
          }

          if (entry.type === 'dish') {
            if (dish.status === 'approved') {
              // Double check if still pending (parallel logic safety)
              const currentPending = getPendingApprovals();
              if (
                currentPending.some(
                  (e) => e.id === entry.id && e.type === 'dish',
                )
              ) {
                addResolvedApproval({ ...entry, dishName: dish.name });
                removePendingApproval((e) => e.id === entry.id);
              }
            } else if (dish.status === 'rejected') {
              removePendingApproval((e) => e.id === entry.id);
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
                // Double check if it's still pending before resolving (parallel logic safety)
                const currentPending = getPendingApprovals();
                const stillPending = currentPending.some(
                  (e) => e.id === entry.id && e.imageUrl === entry.imageUrl,
                );

                if (stillPending) {
                  addResolvedApproval({ ...entry, dishName: dish.name });
                  removePendingApproval(
                    (e) => e.id === entry.id && e.imageUrl === entry.imageUrl,
                  );
                }
              } else {
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
  };

  const handleDismiss = (index: number) => {
    const item = approvedItems[index];
    if (!item) return;

    removeResolvedApproval(
      (e) =>
        e.id === item.id &&
        e.type === item.type &&
        (e.imageUrl ?? '') === (item.imageUrl ?? ''),
    );
  };

  const handleDismissAll = () => {
    approvedItems.forEach((_, i) => handleDismiss(i));
  };

  if (approvedItems.length === 0) return null;

  const firstItem = approvedItems[0];
  const otherItems = approvedItems.slice(1);

  return (
    <div className='w-full max-w-4xl mx-auto mb-8 px-2 transition-all duration-500 ease-in-out'>
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border backdrop-blur-2xl transition-all duration-500',
          'bg-card/95 border-border shadow-2xl shadow-black/5',
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-4 scale-95',
        )}>
        {/* Subtle decorative glow */}
        <div className='absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/3 rounded-full blur-3xl' />
        <div className='absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-500/3 rounded-full blur-3xl' />

        {/* Main Card Content (First Item) */}
        <div className='p-4 sm:p-5 flex items-start gap-4'>
          <div className='shrink-0 w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20'>
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
