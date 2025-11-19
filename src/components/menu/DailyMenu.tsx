'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentMenu } from '@/lib/firestore';
import { getCurrentMealType, formatMenuDate } from '@/lib/time';
import { Menu, MealType } from '@/types';
import { MenuDishCard } from './MenuDishCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { DISH_CATEGORIES } from '@/lib/constants';

export function DailyMenu() {
  const t = useTranslations('Menu');
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const currentMeal = getCurrentMealType();
      setMealType(currentMeal);

      // Load menu for the display date (handled by getCurrentMenu)
      const currentMenu = await getCurrentMenu();

      if (currentMenu && currentMeal) {
        // Check if dinner menu exists (Saturday has no dinner)
        if (currentMeal === 'dinner' && !currentMenu.dinner) {
          // If it's dinner time but no dinner menu, show lunch instead
          setMealType('lunch');
          setMenu(currentMenu);
        } else {
          setMenu(currentMenu);
        }
      } else {
        setMenu(null);
      }
    } catch (error) {
      console.error('❌ DailyMenu - Error loading menu:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();

    // Refresh every minute to check if meal time changed
    const interval = setInterval(loadMenu, 60000);

    return () => clearInterval(interval);
  }, [loadMenu]);

  // Refresh when refreshKey changes (triggered by image upload)
  useEffect(() => {
    if (refreshKey > 0) {
      loadMenu();
    }
  }, [refreshKey, loadMenu]);

  if (loading) {
    return (
      <div className='space-y-4'>
        <h2 className='text-2xl font-bold'>{t('dailyMenu') || 'Daily Menu'}</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className='h-64' />
          ))}
        </div>
      </div>
    );
  }

  if (!mealType || !menu) {
    return null; // Don't show if no menu or meal type
  }

  // Check if dinner menu exists (Saturday has no dinner)
  // If it's dinner time but no dinner menu, show lunch instead
  if (mealType === 'dinner' && !menu.dinner) {
    // Fall back to lunch menu
    if (!menu.lunch) {
      return null; // No menu at all
    }
    // Show lunch menu instead
    const displayMealType = 'lunch' as MealType;
    const mealItems = menu[displayMealType]!;

    return (
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl font-bold'>
            {t('lunchMenu') || 'Lunch Menu'}
          </h2>
          <span className='text-sm text-muted-foreground'>
            {formatMenuDate(menu.date)}
          </span>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {DISH_CATEGORIES.map((category) => {
            const menuItem = mealItems[category];
            if (!menuItem || !menuItem.dishName) {
              return null;
            }
            return (
              <MenuDishCard
                key={category}
                menu={menu}
                mealType={displayMealType}
                category={category}
                menuItem={menuItem}
                onImageUploaded={() => setRefreshKey((prev) => prev + 1)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const mealItems = menu[mealType]!;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>
          {mealType === 'lunch'
            ? t('lunchMenu') || 'Lunch Menu'
            : t('dinnerMenu') || 'Dinner Menu'}
        </h2>
        <span className='text-sm text-muted-foreground'>
          {formatMenuDate(menu.date)}
        </span>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {DISH_CATEGORIES.map((category) => {
          const menuItem = mealItems[category];
          if (!menuItem || !menuItem.dishName) {
            return null;
          }
          return (
            <MenuDishCard
              key={category}
              menu={menu}
              mealType={mealType}
              category={category}
              menuItem={menuItem}
              onImageUploaded={() => setRefreshKey((prev) => prev + 1)}
            />
          );
        })}
      </div>
    </div>
  );
}
