'use client';

import { useState, memo } from 'react';
import { MenuItem, DishCategory } from '@/types';
import { Menu, MealType } from '@/types';
import { DishCardBase } from '@/components/dish/DishCardBase';
import { MenuImageUpload } from './MenuImageUpload';
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';

interface MenuDishCardProps {
  menu: Menu;
  mealType: MealType;
  category: DishCategory;
  menuItem: MenuItem;
  onImageUploaded?: () => void;
}

export const MenuDishCard = memo(function MenuDishCard({
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
        onImageClick={() => {
          if (analytics) {
            logEvent(analytics, 'select_content', {
              content_type: 'dish',
              content_id: menuItem.dishId || menuItem.dishName,
              item_name: menuItem.dishName,
              item_category: category,
            });
          }
        }}
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
});
