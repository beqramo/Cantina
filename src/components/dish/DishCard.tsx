'use client';

import { useState } from 'react';
import { Dish } from '@/types';
import { DishCardBase } from './DishCardBase';
import { DishImageUpload } from './DishImageUpload';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DishCardProps {
  dish: Dish;
  showPendingBadge?: boolean;
}

export function DishCard({ dish, showPendingBadge = false }: DishCardProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const tMenu = useTranslations('Menu');

  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleAddImageClick = () => {
    setIsUploadDialogOpen(true);
  };

  // If showing pending badge, use a wrapper to add the badge overlay
  if (showPendingBadge) {
    return (
      <div className='relative'>
        {/* Pending Badge Overlay */}
        <div className='absolute top-2 left-2 z-20'>
          <Badge className='bg-amber-500 hover:bg-amber-500 text-white text-xs shadow-md'>
            <Clock className='h-3 w-3 mr-1' />
            {tMenu('pendingApproval')}
          </Badge>
        </div>
        <div className='opacity-75 pointer-events-none'>
          <DishCardBase
            key={refreshKey}
            imageUrl={dish.imageUrl}
            imageAlt={dish.name}
            name={dish.name}
            category={dish.category}
            dish={dish}
            showDishUpload={false}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <DishCardBase
        key={refreshKey}
        imageUrl={dish.imageUrl}
        imageAlt={dish.name}
        name={dish.name}
        category={dish.category}
        dish={dish}
        showDishUpload={true}
        onAddImageClick={handleAddImageClick}
      />
      <DishImageUpload
        dish={dish}
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </>
  );
}
