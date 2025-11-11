'use client';

import { useState, useEffect } from 'react';
import { getTopDishes } from '@/lib/firestore';
import { Dish, DishTag } from '@/types';
import { DishCard } from '@/components/dish/DishCard';
import { TagFilter } from '@/components/dish/TagFilter';
import { Pagination } from '@/components/pagination/Pagination';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { DISHES_PER_PAGE } from '@/lib/constants';

export default function TopDishesPage() {
  const t = useTranslations();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedTags, setSelectedTags] = useState<DishTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadDishes();
  }, [currentPage, selectedTags]);

  const loadDishes = async () => {
    setLoading(true);
    try {
      const result = await getTopDishes(
        currentPage,
        DISHES_PER_PAGE,
        selectedTags.length > 0 ? selectedTags : undefined,
      );
      setDishes(result.dishes);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error loading top dishes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-6xl mx-auto'>
        <h1 className='text-3xl font-bold mb-2'>{t('TopDishes.title')}</h1>
        <p className='text-muted-foreground mb-6'>
          {t('TopDishes.description')}
        </p>

        <div className='mb-6'>
          <h3 className='text-sm font-medium mb-2'>
            {t('Search.filterByTags') || 'Filter by tags'}
          </h3>
          <TagFilter
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
          />
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
              {dishes.map((dish, index) => (
                <div key={dish.id} className='relative'>
                  <div className='absolute -top-2 -left-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10'>
                    {(currentPage - 1) * DISHES_PER_PAGE + index + 1}
                  </div>
                  <DishCard dish={dish} />
                </div>
              ))}
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
