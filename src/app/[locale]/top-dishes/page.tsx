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

export default function TopDishesPage() {
  const t = useTranslations();
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
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-6xl mx-auto'>
        <h1 className='text-3xl font-bold mb-2'>{t('TopDishes.title')}</h1>
        <p className='text-muted-foreground mb-6'>
          {t('TopDishes.description')}
        </p>

        <div className='mb-6'>
          <h3 className='text-sm font-medium mb-3'>
            {t('TopDishes.filterByCategory') || 'Filter by category'}
          </h3>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant={selectedCategory === undefined ? 'default' : 'outline'}
              size='sm'
              onClick={() => handleCategoryChange(undefined)}
              className={`text-sm transition-all ${
                selectedCategory === undefined
                  ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                  : 'bg-transparent'
              }`}>
              {t('TopDishes.allCategories') || 'All Categories'}
            </Button>
            {DISH_CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size='sm'
                onClick={() => handleCategoryChange(category)}
                className={`text-sm transition-all ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                    : 'bg-transparent'
                }`}>
                {category}
              </Button>
            ))}
          </div>
        </div>

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
                      className={`absolute -top-3 -right-3 z-10 flex items-center justify-center font-bold text-sm shadow-lg border-2 transition-all hover:scale-110 ${
                        isTopThree
                          ? rank === 1
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-950 border-yellow-700 w-10 h-10 rounded-full'
                            : rank === 2
                            ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900 border-gray-600 w-10 h-10 rounded-full'
                            : 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50 border-amber-900 w-10 h-10 rounded-full'
                          : 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/20 w-8 h-8 rounded-lg'
                      }`}>
                      {rank === 1 && isTopThree ? (
                        <span className='text-xl'>🥇</span>
                      ) : rank === 2 && isTopThree ? (
                        <span className='text-xl'>🥈</span>
                      ) : rank === 3 && isTopThree ? (
                        <span className='text-xl'>🥉</span>
                      ) : (
                        <span className='text-xs'>{rank}</span>
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
  );
}
