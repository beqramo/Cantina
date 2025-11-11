'use client';

import Image from 'next/image';
import { Dish } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VoteButtons } from './VoteButtons';
import { useTranslations } from 'next-intl';

interface DishCardProps {
  dish: Dish;
}

export function DishCard({ dish }: DishCardProps) {
  const t = useTranslations('Dish');

  return (
    <Card className='overflow-hidden'>
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
        <div className='flex items-start justify-between gap-2'>
          <div className='flex-1'>
            <h3 className='font-semibold text-lg mb-2'>{dish.name}</h3>
            {dish.category && (
              <Badge variant='secondary' className='mb-2'>
                {dish.category}
              </Badge>
            )}
            {dish.tags && dish.tags.length > 0 && (
              <div className='flex flex-wrap gap-1 mb-2'>
                {dish.tags.map((tag) => (
                  <Badge key={tag} variant='outline' className='text-xs'>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {dish.imageProviderNickname && (
              <p className='text-xs text-muted-foreground mt-2'>
                {t('imageProvidedBy') || 'Image provided by'}{' '}
                <span className='font-medium'>
                  {dish.imageProviderNickname}
                </span>
              </p>
            )}
          </div>
        </div>
        <VoteButtons dish={dish} />
      </CardContent>
    </Card>
  );
}
