'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  getMenuByDate,
  getPreviousMenuDate,
  getNextMenuDate,
} from '@/lib/firestore';
import {
  formatMenuDate,
  getMenuDisplayDate,
  getCurrentMealType,
} from '@/lib/time';
import { checkApprovalsWithMenu } from '@/lib/pending-approvals';
import { MenuDishCard } from './MenuDishCard';
import { MenuNavigation } from './MenuNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations, useLocale } from 'next-intl';
import { DISH_CATEGORIES } from '@/lib/constants';
import { FiSearch } from 'react-icons/fi';
import { Soup, Sun, Moon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';
import { useSWRFirebase } from '@/hooks/useSWRFirebase';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { MealType } from '@/types';

export function DailyMenu() {
  const t = useTranslations('Menu');
  const locale = useLocale();

  // Initialize with today's display date
  const [selectedDate, setSelectedDate] = useState(() => getMenuDisplayDate());
  // Explicitly track the active tab
  const [activeTab, setActiveTab] = useState<MealType>('lunch');
  const [isLoadingDate, setIsLoadingDate] = useState(false);

  // Create date-based cache key
  const dateCacheKey = `menu_by_date_${selectedDate.getTime()}`;

  // Use SWR for fetching menu for selected date
  const {
    data: menu,
    isLoading,
    mutate,
  } = useSWRFirebase({
    cacheKey: dateCacheKey,
    fetcher: async () => {
      const menu = await getMenuByDate(selectedDate);
      if (menu && analytics) {
        logEvent(analytics, 'view_item_list', {
          item_list_id: 'daily_menu',
          item_list_name: 'Daily Menu',
        });
      }
      return menu;
    },
    ttl: 300000,
    swrConfig: {
      refreshInterval: 300000,
    },
  });

  // Automatically set the tab based on time of day when menu loads or date changes
  // This logic runs whenever we load a new menu to ensure we show the most relevant meal
  useEffect(() => {
    if (!menu) return;

    // Check if we are viewing today's menu
    const now = new Date();
    const isToday =
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();

    if (isToday) {
      // If it's today, follow the time of day logic (dinner after 3pm usually)
      const currentMeal = getCurrentMealType();
      // Only switch to dinner if dinner exists and it's dinner time
      if (currentMeal === 'dinner' && menu.dinner) {
        setActiveTab('dinner');
      } else {
        // Default to lunch otherwise
        setActiveTab('lunch');
      }
    } else {
      // For other days, default to lunch
      setActiveTab('lunch');
    }

    // Check for any newly approved items in this menu
    checkApprovalsWithMenu(menu);
  }, [selectedDate, menu?.id, menu]); // Added menu to deps to ensure re-check on refresh

  // Lazy navigation handlers - fetch only when clicked
  const handlePrevious = useCallback(async () => {
    if (isLoadingDate) return;
    setIsLoadingDate(true);
    try {
      const prevDate = await getPreviousMenuDate(selectedDate, 7);
      if (prevDate) {
        setSelectedDate(prevDate);
      }
    } catch (error) {
      console.error('Error fetching previous date:', error);
    } finally {
      setIsLoadingDate(false);
    }
  }, [selectedDate, isLoadingDate]);

  const handleNext = useCallback(async () => {
    if (isLoadingDate) return;
    setIsLoadingDate(true);
    try {
      const nextDate = await getNextMenuDate(selectedDate, 7);
      if (nextDate) {
        setSelectedDate(nextDate);
      }
    } catch (error) {
      console.error('Error fetching next date:', error);
    } finally {
      setIsLoadingDate(false);
    }
  }, [selectedDate, isLoadingDate]);

  const handleImageUploaded = useCallback(() => {
    mutate();
  }, [mutate]);

  if (isLoading || isLoadingDate) {
    return (
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-64' />
          <div className='flex justify-between'>
            <Skeleton className='h-10 w-24' />
            <Skeleton className='h-10 w-24' />
          </div>
        </div>
        <h2 className='text-2xl font-bold'>{t('dailyMenu') || 'Daily Menu'}</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className='h-64' />
          ))}
        </div>
      </div>
    );
  }

  // Determine availability for rendering tabs
  const hasLunch = !!menu?.lunch;
  const hasDinner = !!menu?.dinner;

  if (!menu || (!hasLunch && !hasDinner)) {
    return (
      <div className='space-y-4'>
        <MenuNavigation
          currentDate={selectedDate}
          onPrevious={handlePrevious}
          onNext={handleNext}
          isLoading={isLoadingDate}
        />
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
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <MenuNavigation
        currentDate={selectedDate}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isLoading={isLoadingDate}
      />

      <div className='space-y-6'>
        <Tabs
          value={activeTab}
          onValueChange={(val: string) => setActiveTab(val as MealType)}
          className='w-full'>
          <div className='flex justify-center mb-8'>
            <TabsList className='grid w-full grid-cols-2 h-14 p-1.5 bg-muted/30 backdrop-blur-md rounded-2xl max-w-[400px] border border-muted-foreground/10 shadow-inner'>
              <TabsTrigger
                value='lunch'
                disabled={!hasLunch}
                className='rounded-xl data-[state=active]:bg-background data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-lg data-[state=active]:ring-1 data-[state=active]:ring-amber-500/10 transition-all duration-300 cursor-pointer group'>
                <div className='flex items-center gap-2.5 px-4'>
                  <Sun className='w-5 h-5 transition-transform group-hover:rotate-12 text-amber-500' />
                  <span className='font-bold text-base'>
                    {t('lunch') || 'Lunch'}
                  </span>
                </div>
              </TabsTrigger>
              <TabsTrigger
                value='dinner'
                disabled={!hasDinner}
                className='rounded-xl data-[state=active]:bg-background data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-lg data-[state=active]:ring-1 data-[state=active]:ring-indigo-500/10 transition-all duration-300 cursor-pointer group'>
                <div className='flex items-center gap-2.5 px-4'>
                  <Moon className='w-5 h-5 transition-transform group-hover:-rotate-12' />
                  <span className='font-bold text-base'>
                    {t('dinner') || 'Dinner'}
                  </span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value='lunch'
            className='mt-0 space-y-6 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500'>
            {activeTab === 'lunch' &&
              (hasLunch ? (
                <MenuGrid
                  menu={menu}
                  mealType='lunch'
                  onImageUploaded={handleImageUploaded}
                  t={t}
                />
              ) : (
                <EmptyMealState t={t} type='lunch' />
              ))}
          </TabsContent>

          <TabsContent
            value='dinner'
            className='mt-0 space-y-6 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500'>
            {activeTab === 'dinner' &&
              (hasDinner ? (
                <MenuGrid
                  menu={menu}
                  mealType='dinner'
                  onImageUploaded={handleImageUploaded}
                  t={t}
                />
              ) : (
                <EmptyMealState t={t} type='dinner' />
              ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Extracted sub-component for cleaner code
const MenuGrid = memo(function MenuGrid({
  menu,
  mealType,
  onImageUploaded,
  t,
}: {
  menu: any;
  mealType: MealType;
  onImageUploaded: () => void;
  t: any;
}) {
  const mealItems = menu[mealType];

  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {DISH_CATEGORIES.map((category) => {
          const menuItem = mealItems[category];
          if (!menuItem || !menuItem.dishName) {
            return null;
          }
          return (
            <MenuDishCard
              key={`${mealType}-${category}`}
              menu={menu}
              mealType={mealType}
              category={category}
              menuItem={menuItem}
              onImageUploaded={onImageUploaded}
            />
          );
        })}
      </div>

      {mealItems.Sopa && mealItems.Sopa.dishName && (
        <div className='mt-8 pt-6 border-t border-dashed border-muted-foreground/20'>
          <Card className='group overflow-hidden border border-border/50 bg-card hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-500 rounded-2xl'>
            <CardContent className='p-0 relative overflow-hidden'>
              <div className='flex flex-col sm:flex-row items-center gap-4 p-5 relative z-10'>
                <div className='shrink-0'>
                  <div className='relative w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm group-hover:scale-105 transition-transform duration-500'>
                    <Soup className='w-6 h-6' />
                  </div>
                </div>

                <div className='flex-1 text-center sm:text-left space-y-1'>
                  <div className='flex items-center justify-center sm:justify-start gap-2'>
                    <span className='px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[9px] font-bold uppercase tracking-wider border border-orange-500/20'>
                      {t('dailySelection') || 'Daily Selection'}
                    </span>
                  </div>

                  <h4 className='text-lg md:text-xl font-bold text-foreground tracking-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-300'>
                    {mealItems.Sopa.dishName}
                  </h4>
                </div>

                <div className='hidden md:block h-8 w-px bg-muted-foreground/10 mx-2' />

                <p className='text-muted-foreground text-xs font-medium sm:max-w-[200px] text-center sm:text-right italic opacity-80'>
                  {t('soupDescription') || 'Freshly prepared daily'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
});

const EmptyMealState = memo(function EmptyMealState({
  t,
  type,
}: {
  t: any;
  type: string;
}) {
  return (
    <div className='flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed bg-muted/30'>
      <div className='w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4'>
        {type === 'lunch' ? (
          <Sun className='w-8 h-8 text-muted-foreground' />
        ) : (
          <Moon className='w-8 h-8 text-muted-foreground' />
        )}
      </div>
      <h3 className='text-xl font-semibold mb-2'>
        {type === 'lunch'
          ? t('noLunch') || 'No Lunch Menu'
          : t('noDinner') || 'No Dinner Menu'}
      </h3>
      <p className='text-muted-foreground text-center max-w-sm'>
        {t('noMenuDesc') ||
          'There is no menu available for this meal time yet.'}
      </p>
    </div>
  );
});
