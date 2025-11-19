'use client';

import { useState } from 'react';
import { MenuItem, DishCategory } from '@/types';
import { Menu, MealType } from '@/types';
import { DishCardBase } from '@/components/dish/DishCardBase';
import { MenuImageUpload } from './MenuImageUpload';

interface MenuDishCardProps {
  menu: Menu;
  mealType: MealType;
  category: DishCategory;
  menuItem: MenuItem;
  onImageUploaded?: () => void;
}

export function MenuDishCard({
  menu,
  mealType,
  category,
  menuItem,
  onImageUploaded,
}: MenuDishCardProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const handleUploadSuccess = () => {
    onImageUploaded?.();
  };

  const handleAddImageClick = () => {
    setIsUploadDialogOpen(true);
  };

  return (
    <>
      <DishCardBase
        imageUrl={menuItem.imageUrl}
        imageAlt={menuItem.dishName}
        onAddImageClick={handleAddImageClick}
        isPendingApproval={menuItem.imagePendingApproval === true}
        name={menuItem.dishName}
        category={category}
        dishId={menuItem.dishId}
      />

      <MenuImageUpload
        menu={menu}
        mealType={mealType}
        category={category}
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </>
  );
}
