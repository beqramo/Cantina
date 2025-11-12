'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Maximize2 } from 'lucide-react';
import { Dish } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VoteButtons } from './VoteButtons';
import { ImageViewer } from './ImageViewer';
import { useTranslations } from 'next-intl';

interface DishCardProps {
  dish: Dish;
}

export function DishCard({ dish }: DishCardProps) {
  const t = useTranslations('Dish');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  return (
    <>
      <Card className='overflow-hidden'>
        <div
          className='relative aspect-video w-full cursor-pointer group'
          onClick={() => setIsImageViewerOpen(true)}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsImageViewerOpen(true);
            }
          }}
          aria-label={`View full size image of ${dish.name}`}>
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
      <ImageViewer
        imageUrl={dish.imageUrl}
        alt={dish.name}
        isOpen={isImageViewerOpen}
        onClose={() => setIsImageViewerOpen(false)}
      />
    </>
  );
}
