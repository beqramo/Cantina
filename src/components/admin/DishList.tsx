'use client';

import { useState, useEffect } from 'react';
import { deleteDish, getDishesPaginated, searchDishes } from '@/lib/firestore';
import { Dish } from '@/types';
import { DishCard } from '@/components/dish/DishCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DishForm } from './DishForm';
import { ImageViewer } from '@/components/dish/ImageViewer';
import { useTranslations } from 'next-intl';
import {
  Trash2,
  Edit,
  Plus,
  Maximize2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { QueryDocumentSnapshot } from 'firebase/firestore';

export function DishList() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [pageStack, setPageStack] = useState<QueryDocumentSnapshot[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 12;
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewingImage, setViewingImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const tSearch = useTranslations('Search');

  useEffect(() => {
    // Reset pagination when search term changes
    setLastDoc(null);
    setPageStack([]);
    loadDishes(null, true);
  }, [debouncedSearch]);

  const loadDishes = async (
    cursor: QueryDocumentSnapshot | null = null,
    reset = false,
  ) => {
    setLoading(true);
    try {
      if (debouncedSearch.trim()) {
        const results = await searchDishes(debouncedSearch, [], true);
        setDishes(results);
        setHasMore(false);
      } else {
        const {
          dishes: paginatedDishes,
          lastDoc: nextCursor,
          hasMore: more,
        } = await getDishesPaginated(PAGE_SIZE, true, cursor || undefined);
        setDishes(paginatedDishes);
        setLastDoc(nextCursor);
        setHasMore(more);
        if (reset) {
          setPageStack([]);
        }
      }
    } catch (error) {
      console.error('Error loading dishes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (lastDoc) {
      setPageStack((prev: QueryDocumentSnapshot[]) => [...prev, lastDoc]);
      loadDishes(lastDoc);
    }
  };

  const handlePrevPage = () => {
    const newStack = [...pageStack];
    newStack.pop(); // Remove current page's start
    const prevCursor =
      newStack.length > 0 ? newStack[newStack.length - 1] : null;
    setPageStack(newStack);
    loadDishes(prevCursor);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this dish?')) {
      try {
        await deleteDish(id);
        const currentCursor =
          pageStack.length > 0 ? pageStack[pageStack.length - 1] : null;
        loadDishes(currentCursor);
      } catch (error) {
        console.error('Error deleting dish:', error);
      }
    }
  };

  const handleSuccess = () => {
    setShowAddDialog(false);
    setEditingDish(null);
    const currentCursor =
      pageStack.length > 0 ? pageStack[pageStack.length - 1] : null;
    loadDishes(currentCursor);
  };

  if (loading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-64' />
        ))}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col md:flex-row gap-4 items-center justify-between mb-6'>
        <div className='flex flex-col md:flex-row gap-4 items-center w-full md:w-auto'>
          <h2 className='text-2xl font-bold'>{t('allDishes')}</h2>
          <div className='relative w-full md:w-80'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              type='text'
              placeholder={tSearch('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10'
            />
          </div>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className='h-4 w-4 mr-2' />
              {t('addDish')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addDish')}</DialogTitle>
            </DialogHeader>
            <DishForm
              onSuccess={handleSuccess}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {dishes.map((dish: Dish) => (
          <Card key={dish.id} className='overflow-hidden'>
            <div
              className={`relative aspect-video w-full ${
                dish.imageUrl ? 'cursor-pointer group' : ''
              }`}
              onClick={() => {
                if (dish.imageUrl) {
                  setViewingImage({ url: dish.imageUrl, alt: dish.name });
                }
              }}
              role={dish.imageUrl ? 'button' : undefined}
              tabIndex={dish.imageUrl ? 0 : undefined}
              onKeyDown={(e) => {
                if (dish.imageUrl && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setViewingImage({ url: dish.imageUrl, alt: dish.name });
                }
              }}
              aria-label={
                dish.imageUrl
                  ? `View full size image of ${dish.name}`
                  : undefined
              }>
              {dish.imageUrl ? (
                <>
                  <Image
                    src={dish.imageUrl}
                    alt={dish.name}
                    fill
                    className='object-cover transition-opacity group-hover:opacity-90'
                    sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                  />
                  <div className='absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors'>
                    <div className='opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
                      <div className='bg-black/60 backdrop-blur-sm rounded-full p-2'>
                        <Maximize2 className='h-6 w-6 md:h-8 md:w-8 text-white' />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className='absolute inset-0 bg-muted flex items-center justify-center'>
                  <p className='text-muted-foreground text-sm'>
                    {t('noImage')}
                  </p>
                </div>
              )}
            </div>
            <CardContent className='p-4'>
              <div className='flex items-start justify-between gap-2 mb-2'>
                <div className='flex-1'>
                  <h3 className='font-semibold text-lg'>{dish.name}</h3>
                  {dish.category && (
                    <Badge variant='secondary' className='mt-1'>
                      {dish.category}
                    </Badge>
                  )}
                  {dish.tags && dish.tags.length > 0 && (
                    <div className='flex flex-wrap gap-1 mt-2'>
                      {dish.tags.map((tag: string) => (
                        <Badge key={tag} variant='outline' className='text-xs'>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className='flex gap-2 mt-4'>
                <Dialog
                  open={editingDish?.id === dish.id}
                  onOpenChange={(open) => !open && setEditingDish(null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setEditingDish(dish)}>
                      <Edit className='h-4 w-4 mr-1' />
                      {t('editDish')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('editDish')}</DialogTitle>
                    </DialogHeader>
                    <DishForm
                      dish={dish}
                      onSuccess={handleSuccess}
                      onCancel={() => setEditingDish(null)}
                    />
                  </DialogContent>
                </Dialog>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={() => handleDelete(dish.id)}>
                  <Trash2 className='h-4 w-4 mr-1' />
                  {t('deleteDish')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {!debouncedSearch.trim() && (
        <div className='flex items-center justify-center gap-4 mt-8'>
          <Button
            variant='outline'
            onClick={handlePrevPage}
            disabled={pageStack.length === 0 || loading}>
            <ChevronLeft className='h-4 w-4 mr-2' />
            {tCommon('previous')}
          </Button>
          <span className='text-sm text-muted-foreground'>
            {tCommon('page')} {pageStack.length + 1}
          </span>
          <Button
            variant='outline'
            onClick={handleNextPage}
            disabled={!hasMore || loading}>
            {tCommon('next')}
            <ChevronRight className='h-4 w-4 ml-2' />
          </Button>
        </div>
      )}
      {viewingImage && (
        <ImageViewer
          imageUrl={viewingImage.url}
          alt={viewingImage.alt}
          isOpen={!!viewingImage}
          onClose={() => setViewingImage(null)}
        />
      )}
    </div>
  );
}
