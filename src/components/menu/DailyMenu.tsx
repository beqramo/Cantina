'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentMenu } from '@/lib/firestore';
import { getCurrentMealType, formatMenuDate } from '@/lib/time';
import { Menu, MealType } from '@/types';
import { MenuDishCard } from './MenuDishCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { DISH_CATEGORIES } from '@/lib/constants';
import { FiSearch } from 'react-icons/fi';
import { Soup } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
        // Check if dinner menu exists (dinner is optional on any day)
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
    return (
      <div className='space-y-4'>
        <h2 className='text-2xl font-bold'>{t('dailyMenu')}</h2>
        <div className='flex flex-col items-center justify-center py-12 px-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20'>
          <div className='w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4'>
            <FiSearch className='w-8 h-8 text-muted-foreground' />
          </div>
          <h3 className='text-lg font-semibold text-center mb-2'>
            {t('noMenuAvailable')}
          </h3>
          <p className='text-muted-foreground text-center text-sm max-w-md'>
            {t('noMenuDescription')}
          </p>
        </div>
      </div>
    );
  }

  // Check if dinner menu exists (Saturday has no dinner)
  // If it's dinner time but no dinner menu, show lunch instead
  if (mealType === 'dinner' && !menu.dinner) {
    // Fall back to lunch menu
    if (!menu.lunch) {
      return (
        <div className='space-y-4'>
          <h2 className='text-2xl font-bold'>{t('dailyMenu')}</h2>
          <div className='flex flex-col items-center justify-center py-12 px-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20'>
            <div className='w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4'>
              <FiSearch className='w-8 h-8 text-muted-foreground' />
            </div>
            <h3 className='text-lg font-semibold text-center mb-2'>
              {t('noMenuAvailable')}
            </h3>
            <p className='text-muted-foreground text-center text-sm max-w-md'>
              {t('noMenuDescription')}
            </p>
          </div>
        </div>
      );
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

        {/* Soup Section */}
        {mealItems.soup && mealItems.soup.dishName && (
          <div className='mt-6 pt-6 border-t'>
            <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
              <Soup className='h-5 w-5 text-orange-500' />
              {t('soupHeader') || t('soup') || 'Soup'}
            </h3>
            <Card className='bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/30'>
              <CardContent className='p-4'>
                <p className='font-medium text-base'>
                  {mealItems.soup.dishName}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
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

      {/* Soup Section */}
      {mealItems.soup && mealItems.soup.dishName && (
        <div className='mt-6 pt-6 border-t'>
          <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
            <Soup className='h-5 w-5 text-orange-500' />
            {t('soupHeader') || t('soup') || 'Soup'}
          </h3>
          <Card className='bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/30'>
            <CardContent className='p-4'>
              <p className='font-medium text-base'>{mealItems.soup.dishName}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
