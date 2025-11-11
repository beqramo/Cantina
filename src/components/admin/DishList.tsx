'use client';

import { useState, useEffect } from 'react';
import { getAllDishes, deleteDish } from '@/lib/firestore';
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
import { useTranslations } from 'next-intl';
import { Trash2, Edit, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DishList() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const t = useTranslations('Admin');

  useEffect(() => {
    loadDishes();
  }, []);

  const loadDishes = async () => {
    setLoading(true);
    try {
      const allDishes = await getAllDishes();
      setDishes(allDishes);
    } catch (error) {
      console.error('Error loading dishes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this dish?')) {
      try {
        await deleteDish(id);
        loadDishes();
      } catch (error) {
        console.error('Error deleting dish:', error);
      }
    }
  };

  const handleSuccess = () => {
    setShowAddDialog(false);
    setEditingDish(null);
    loadDishes();
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
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl font-bold'>{t('allDishes')}</h2>
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
        {dishes.map((dish) => (
          <Card key={dish.id} className='overflow-hidden'>
            <div className='relative aspect-video w-full'>
              <Image
                src={dish.imageUrl}
                alt={dish.name}
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
              />
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
                      {dish.tags.map((tag) => (
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
    </div>
  );
}
