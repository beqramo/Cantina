'use client';

import { DishSearch } from '@/components/dish/DishSearch';

export default function HomePage() {
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-4xl mx-auto'>
        <h1 className='text-3xl font-bold mb-6'>Cantina IPB</h1>
        <DishSearch />
      </div>
    </div>
  );
}
