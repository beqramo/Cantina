'use client';

import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';
import { getTopDishes } from '@/lib/firestore';
import { Dish, DishCategory } from '@/types';
import { DishCard } from '@/components/dish/DishCard';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { DISHES_PER_PAGE, DISH_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useTranslateData } from '@/hooks/useTranslateData';
import { Trophy } from 'lucide-react';
import { useSWRFirebase } from '@/hooks/useSWRFirebase';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache-keys';

// Memoized component for dish item with rank badge
const DishWithRank = memo(({ dish, rank }: { dish: Dish; rank: number }) => {
  const isTopThree = rank <= 3;

  return (
    <div className='relative'>
      <div
        className={`absolute -top-2 -right-2 z-10 flex items-center justify-center font-bold text-xs shadow-lg border transition-transform hover:scale-105 ${
          isTopThree
            ? rank === 1
              ? 'bg-amber-500 text-white border-amber-600 w-8 h-8 rounded-full'
              : rank === 2
              ? 'bg-zinc-400 text-white border-zinc-500 w-8 h-8 rounded-full'
              : 'bg-amber-700 text-white border-amber-800 w-8 h-8 rounded-full'
            : 'bg-background/95 backdrop-blur-sm text-foreground border-border/50 w-6 h-6 rounded-md shadow-md'
        }`}>
        {rank === 1 && isTopThree ? (
          <span className='text-sm'>🥇</span>
        ) : rank === 2 && isTopThree ? (
          <span className='text-sm'>🥈</span>
        ) : rank === 3 && isTopThree ? (
          <span className='text-sm'>🥉</span>
        ) : (
          <span>{rank}</span>
        )}
      </div>
      <DishCard dish={dish} />
    </div>
  );
});

DishWithRank.displayName = 'DishWithRank';

export default function TopDishesPage() {
  const t = useTranslations();
  const { translateCategory } = useTranslateData();
  const [selectedCategory, setSelectedCategory] = useState<
    DishCategory | undefined
  >(undefined);

  // Use SWR for caching top dishes data
  const {
    data: dishes,
    isLoading,
    error,
  } = useSWRFirebase({
    cacheKey: CACHE_KEYS.DISHES_TOP(selectedCategory),
    fetcher: async () => {
      const result = await getTopDishes(
        DISHES_PER_PAGE,
        undefined, // tags
        selectedCategory, // category filter
      );
      return result.dishes;
    },
    ttl: CACHE_TTL.LONG, // 5 minutes - top dishes don't change frequently
  });

  // Log page view on mount
  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'view_top_dishes');
    }
  }, []);

  const handleCategoryChange = useCallback(
    (category: DishCategory | undefined) => {
      setSelectedCategory(category);
      // Log category filter change
      if (analytics) {
        logEvent(analytics, 'filter_category', {
          category: category || 'all',
          page: 'top_dishes',
        });
      }
      // SWR will re-fetch when selectedCategory changes
    },
    [],
  );

  // Memoize skeleton arrays
  const initialSkeletons = useMemo(() => [1, 2, 3], []);

  // Memoize category buttons
  const categoryButtons = useMemo(
    () =>
      DISH_CATEGORIES.map((category) => (
        <Button
          key={category}
          variant={selectedCategory === category ? 'default' : 'outline'}
          size='sm'
          onClick={() => handleCategoryChange(category)}
          className='text-xs h-7'>
          {translateCategory(category)}
        </Button>
      )),
    [selectedCategory, handleCategoryChange, translateCategory],
  );

  return (
    <div className='min-h-screen'>
      {/* Hero Section */}
      <div className='border-b bg-muted/30'>
        <div className='container mx-auto px-4 py-8'>
          <div className='max-w-6xl mx-auto'>
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-1.5 rounded-md bg-amber-500/10'>
                <Trophy className='h-4 w-4 text-amber-600 dark:text-amber-400' />
              </div>
              <h1 className='text-2xl md:text-3xl font-bold'>
                {t('TopDishes.title')}
              </h1>
            </div>
            <p className='text-muted-foreground text-sm mb-6'>
              {t('TopDishes.description')}
            </p>

            {/* Category Filter */}
            <div>
              <h3 className='text-xs font-medium text-muted-foreground mb-2'>
                {t('TopDishes.filterByCategory') || 'Filter by category'}
              </h3>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant={
                    selectedCategory === undefined ? 'default' : 'outline'
                  }
                  size='sm'
                  onClick={() => handleCategoryChange(undefined)}
                  className='text-xs h-7'>
                  {t('TopDishes.allCategories') || 'All Categories'}
                </Button>
                {categoryButtons}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='container mx-auto px-4 py-6'>
        <div className='max-w-6xl mx-auto'>
          {isLoading && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {initialSkeletons.map((i) => (
                <Skeleton key={i} className='h-64' />
              ))}
            </div>
          )}

          {error && (
            <div className='text-center py-8 text-destructive'>
              {t('Common.errorLoadingData') || 'Error loading dishes'}
            </div>
          )}

          {!isLoading && !error && dishes && dishes.length > 0 && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
              {dishes.map((dish, index) => (
                <DishWithRank key={dish.id} dish={dish} rank={index + 1} />
              ))}
            </div>
          )}

          {!isLoading && !error && (!dishes || dishes.length === 0) && (
            <div className='text-center py-8 text-muted-foreground'>
              {t('Search.noResults')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
