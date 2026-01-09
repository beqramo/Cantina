'use client';

import { useState, useMemo } from 'react';
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

// Type for pending dish stored in localStorage
interface PendingDishEntry {
  id: string;
  name: string;
  createdAt: number;
}

export function DishSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
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

  // Use SWR for pending dishes from localStorage
  const { data: pendingDishes, mutate: mutatePending } = useSWRFirebase({
    cacheKey: CACHE_KEYS.DISH_REQUESTS_PENDING,
    fetcher: async () => {
      const pendingDishesJson = localStorage.getItem(
        STORAGE_KEYS.PENDING_DISHES,
      );
      if (!pendingDishesJson) return [];

      const pendingEntries: PendingDishEntry[] = JSON.parse(pendingDishesJson);
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const validEntries = pendingEntries.filter(
        (e) => e.createdAt > thirtyDaysAgo,
      );

      const fetchedDishes: Dish[] = [];
      const stillValidEntries: PendingDishEntry[] = [];

      // Note: We use sequential fetches here to avoid overwhelming but with SWR this happens once per cache lifecycle
      for (const entry of validEntries) {
        const dish = await getDishById(entry.id);
        if (dish && dish.status === 'pending') {
          fetchedDishes.push(dish);
          stillValidEntries.push(entry);
        }
      }

      // Update localStorage with only valid pending dishes
      if (stillValidEntries.length !== validEntries.length) {
        localStorage.setItem(
          STORAGE_KEYS.PENDING_DISHES,
          JSON.stringify(stillValidEntries),
        );
      }

      return fetchedDishes;
    },
    ttl: CACHE_TTL.DEFAULT, // 1 minute
    // Revalidation when dialog closes is handled by mutate() call in Dialog onOpenChange
  });

  const dishesToDisplay = useMemo(() => dishes || [], [dishes]);
  const loading = searchLoading;

  // Filter pending dishes that match the search term
  const matchingPendingDishes = useMemo(() => {
    if (!pendingDishes) return [];
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
                    mutatePending(); // Refresh pending dishes when dialog closes
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
