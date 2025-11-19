'use client';

import { DishSearch } from '@/components/dish/DishSearch';
import { DailyMenu } from '@/components/menu/DailyMenu';

export default function HomePage() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-3xl font-bold mb-6'>Cantina</h1>
        <DishSearch />
        <div className='mt-8'>
          <DailyMenu />
        </div>
      </div>
    </div>
  );
}
