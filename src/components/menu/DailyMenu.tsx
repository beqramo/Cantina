'use client';

import { useState, useMemo } from 'react';
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
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';
import { useSWRFirebase } from '@/hooks/useSWRFirebase';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache-keys';

export function DailyMenu() {
  const t = useTranslations('Menu');

  // Use SWR for fetching current menu
  const {
    data: menu,
    isLoading,
    mutate,
  } = useSWRFirebase({
    cacheKey: CACHE_KEYS.MENU_CURRENT,
    fetcher: async () => {
      const currentMenu = await getCurrentMenu();
      if (currentMenu && analytics) {
        logEvent(analytics, 'view_item_list', {
          item_list_id: 'daily_menu',
          item_list_name: 'Daily Menu',
        });
      }
      return currentMenu;
    },
    ttl: CACHE_TTL.DEFAULT, // 1 minute cache
    swrConfig: {
      refreshInterval: 60000, // Refresh every minute to keep up with time changes
    },
  });

  // Calculate meal type based on current time and menu availability
  const mealType = useMemo(() => {
    if (!menu) return null;
    const currentMeal = getCurrentMealType();

    if (currentMeal === 'dinner' && !menu.dinner) {
      return 'lunch';
    }
    return currentMeal as MealType;
  }, [menu]);

  if (isLoading) {
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
                onImageUploaded={() => mutate()}
              />
            );
          })}
        </div>

        {/* Soup Section */}
        {mealItems.Sopa && mealItems.Sopa.dishName && (
          <div className='mt-6 pt-6 border-t'>
            <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
              <Soup className='h-5 w-5 text-orange-500' />
              {t('soupHeader') || t('soup') || 'Soup'}
            </h3>
            <Card className='border-l-4 border-l-orange-500 border-y border-r border-orange-200 bg-orange-50 dark:bg-orange-950/50 dark:border-orange-900/50 dark:border-l-orange-500 rounded-xl overflow-hidden shadow-sm'>
              <CardContent className='p-5'>
                <p className='font-bold text-base text-orange-900 dark:text-orange-100'>
                  {mealItems.Sopa.dishName}
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
              onImageUploaded={() => mutate()}
            />
          );
        })}
      </div>

      {/* Soup Section */}
      {mealItems.Sopa && mealItems.Sopa.dishName && (
        <div className='mt-6 pt-6 border-t'>
          <h3 className='text-lg font-semibold mb-3 flex items-center gap-2'>
            <Soup className='h-5 w-5 text-orange-500' />
            {t('soupHeader') || t('soup') || 'Soup'}
          </h3>
          <Card className='border-l-4 border-l-orange-500 border-y border-r border-orange-200 bg-orange-50 dark:bg-orange-950/50 dark:border-orange-900/50 dark:border-l-orange-500 rounded-xl overflow-hidden shadow-sm'>
            <CardContent className='p-5'>
              <p className='font-bold text-base text-orange-900 dark:text-orange-100'>
                {mealItems.Sopa.dishName}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
