'use client';

import { useState } from 'react';
import { Dish } from '@/types';
import { DishCardBase } from './DishCardBase';
import { DishImageUpload } from './DishImageUpload';

interface DishCardProps {
  dish: Dish;
}

export function DishCard({ dish }: DishCardProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleAddImageClick = () => {
    setIsUploadDialogOpen(true);
  };

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
