'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { searchDishes } from '@/lib/firestore';
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

export function DishSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const t = useTranslations('Search');

  useEffect(() => {
    const loadDishes = async () => {
      setLoading(true);
      try {
        let results: Dish[] = [];

        if (debouncedSearch.trim()) {
          // Global search - ignore tags when searching
          results = await searchDishes(debouncedSearch);
        } else {
          // Tag filtering disabled - not usable for users currently
          // else if (selectedTags.length > 0) {
          //   results = await getDishesByTags(selectedTags);
          // } else {
          results = [];
          // }
        }

        setDishes(results);
      } catch (error) {
        console.error('Error loading dishes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDishes();
  }, [debouncedSearch]); // selectedTags removed - filtering disabled

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

      {!loading && debouncedSearch.trim() && dishes.length === 0 && (
        <Alert>
          <AlertDescription className='flex flex-col gap-4'>
            <p>{t('noResults')}</p>
            <Dialog
              open={showRequestDialog}
              onOpenChange={setShowRequestDialog}>
              <DialogTrigger asChild>
                <Button variant='outline'>{t('requestDish')}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('requestDish')}</DialogTitle>
                  <DialogDescription>
                    {t('requestDishDescription')}
                  </DialogDescription>
                </DialogHeader>
                <DishRequestForm
                  initialName={debouncedSearch}
                  onSuccess={() => setShowRequestDialog(false)}
                />
              </DialogContent>
            </Dialog>
          </AlertDescription>
        </Alert>
      )}

      {!loading && dishes.length > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}
    </div>
  );
}
