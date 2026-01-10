'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { searchDishes, getDishById } from '@/lib/firestore';
import { Dish } from '@/types';
import { DishCard } from './DishCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DishRequestForm } from './DishRequestForm';
import { STORAGE_KEYS } from '@/lib/constants';
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';
import { useSWRFirebase } from '@/hooks/useSWRFirebase';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache-keys';
import {
  getPendingApprovals,
  PendingApprovalEntry,
  PENDING_UPDATE_EVENT,
} from '@/lib/pending-approvals';

export function DishSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [pendingDishes, setPendingDishes] = useState<Dish[]>([]);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const t = useTranslations('Search');

  // Use SWR for search results
  const { data: dishes, isLoading: searchLoading } = useSWRFirebase({
    cacheKey: debouncedSearch.trim()
      ? CACHE_KEYS.DISHES_SEARCH(debouncedSearch)
      : null,
    fetcher: async () => {
      const results = await searchDishes(debouncedSearch);
      if (analytics) {
        logEvent(analytics, 'search', {
          search_term: debouncedSearch,
        });
      }
      return results;
    },
    ttl: CACHE_TTL.SHORT, // 30 seconds for dynamic search results
    enabled: !!debouncedSearch.trim(),
  });

  // Load pending dishes from centralized Lib
  useEffect(() => {
    const loadPending = () => {
      const items = getPendingApprovals();

      // Convert PendingApprovalEntry[] to Dish[] for UI compatibility
      const mappedDishes: Dish[] = items.map((item) => ({
        id: item.id,
        name: item.name || '',
        imageUrl: item.imageUrl || '',
        images: item.imageUrl ? [item.imageUrl] : [],
        category: undefined,
        tags: [],
        status: 'pending',
        thumbsUp: 0,
        thumbsDown: 0,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.createdAt),
      }));

      setPendingDishes(mappedDishes);
    };

    loadPending();

    // Refresh when approvals change
    window.addEventListener(PENDING_UPDATE_EVENT, loadPending);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.PENDING_APPROVALS) loadPending();
    });

    return () => {
      window.removeEventListener(PENDING_UPDATE_EVENT, loadPending);
      window.removeEventListener('storage', loadPending); // Remove the storage listener too
    };
  }, []);

  const dishesToDisplay = useMemo(() => dishes || [], [dishes]);
  const loading = searchLoading;

  // Filter pending dishes that match the search term
  const matchingPendingDishes = useMemo(() => {
    return debouncedSearch.trim()
      ? pendingDishes.filter((dish) =>
          dish.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
        )
      : [];
  }, [pendingDishes, debouncedSearch]);

  return (
    <div className='space-y-6'>
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
        <Input
          type='text'
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='pl-10'
        />
      </div>

      {/* Tag filters hidden - not usable for users currently */}
      {/* {!debouncedSearch.trim() && (
        <div>
          <h3 className='text-sm font-medium mb-2'>
            {t('filterByTags') || 'Filter by tags'}
          </h3>
          <TagFilter
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
        </div>
      )} */}

      {loading && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className='h-64' />
          ))}
        </div>
      )}

      {/* Show pending dishes submitted by this user */}
      {!loading && matchingPendingDishes.length > 0 && (
        <div className='space-y-3'>
          <h3 className='text-sm font-medium text-muted-foreground'>
            {t('yourPendingDishes')}
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {matchingPendingDishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} showPendingBadge />
            ))}
          </div>
        </div>
      )}

      {!loading &&
        debouncedSearch.trim() &&
        dishesToDisplay.length === 0 &&
        matchingPendingDishes.length === 0 && (
          <Alert>
            <AlertDescription className='flex flex-col gap-4'>
              <p>{t('noResults')}</p>
              <Dialog
                open={showRequestDialog}
                onOpenChange={(open) => {
                  setShowRequestDialog(open);
                  // Log dialog open event
                  if (open && analytics) {
                    logEvent(analytics, 'open_dish_request_dialog', {
                      search_term: debouncedSearch,
                    });
                  }
                  // Reset form submitted state when dialog closes
                  if (!open) {
                    setFormSubmitted(false);
                    // mutatePending(); // Removed legacy SWR call
                  }
                }}>
                <DialogTrigger asChild>
                  <Button variant='outline'>{t('requestDish')}</Button>
                </DialogTrigger>
                <DialogContent>
                  {!formSubmitted && (
                    <DialogHeader>
                      <DialogTitle>{t('requestDish')}</DialogTitle>
                      <DialogDescription>
                        {t('requestDishDescription')}
                      </DialogDescription>
                    </DialogHeader>
                  )}
                  <DishRequestForm
                    initialName={debouncedSearch}
                    onSuccess={() => {
                      setShowRequestDialog(false);
                      if (analytics) {
                        logEvent(analytics, 'suggest_dish', {
                          dish_name_suggestion: debouncedSearch,
                        });
                      }
                    }}
                    onFormSubmitted={() => setFormSubmitted(true)}
                  />
                </DialogContent>
              </Dialog>
            </AlertDescription>
          </Alert>
        )}

      {!loading && dishesToDisplay.length > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {dishesToDisplay.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}
    </div>
  );
}
