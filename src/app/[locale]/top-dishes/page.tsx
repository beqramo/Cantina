'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTopDishes } from '@/lib/firestore';
import { Dish, DishCategory } from '@/types';
import { DishCard } from '@/components/dish/DishCard';
import { Pagination } from '@/components/pagination/Pagination';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { DISHES_PER_PAGE, DISH_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useTranslateData } from '@/hooks/useTranslateData';
import { Trophy } from 'lucide-react';

export default function TopDishesPage() {
  const t = useTranslations();
  const { translateCategory } = useTranslateData();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    DishCategory | undefined
  >(undefined);

  const loadDishes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTopDishes(
        currentPage,
        DISHES_PER_PAGE,
        undefined, // tags
        selectedCategory, // category filter
      );
      setDishes(result.dishes);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error loading top dishes:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedCategory]);

  useEffect(() => {
    loadDishes();
  }, [currentPage, loadDishes]);

  const handleCategoryChange = (category: DishCategory | undefined) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page when category changes
  };

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
                {DISH_CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    variant={
                      selectedCategory === category ? 'default' : 'outline'
                    }
                    size='sm'
                    onClick={() => handleCategoryChange(category)}
                    className='text-xs h-7'>
                    {translateCategory(category)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='container mx-auto px-4 py-6'>
        <div className='max-w-6xl mx-auto'>
          {loading && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className='h-64' />
              ))}
            </div>
          )}

          {!loading && dishes.length > 0 && (
            <>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
                {dishes.map((dish, index) => {
                  const rank = (currentPage - 1) * DISHES_PER_PAGE + index + 1;
                  const isTopThree = rank <= 3;

                  return (
                    <div key={dish.id} className='relative'>
                      <div
                        className={`absolute -top-2 -right-2 z-10 flex items-center justify-center font-bold text-xs shadow-md border transition-transform hover:scale-105 ${
                          isTopThree
                            ? rank === 1
                              ? 'bg-amber-500 text-white border-amber-600 w-8 h-8 rounded-full'
                              : rank === 2
                              ? 'bg-zinc-400 text-white border-zinc-500 w-8 h-8 rounded-full'
                              : 'bg-amber-700 text-white border-amber-800 w-8 h-8 rounded-full'
                            : 'bg-muted text-muted-foreground border-border w-6 h-6 rounded-md'
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
                })}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={hasMore ? currentPage + 1 : currentPage}
                onPageChange={setCurrentPage}
              />
            </>
          )}

          {!loading && dishes.length === 0 && (
            <div className='text-center py-8 text-muted-foreground'>
              {t('Search.noResults')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
