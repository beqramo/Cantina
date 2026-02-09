'use client';

import { Flyer } from '@/components/Flyer';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function FlyerPage() {
  const [variant, setVariant] = useState<
    'pt-indigo' | 'en-indigo' | 'bilingual-indigo' | 'bilingual-bw'
  >('pt-indigo');

  return (
    <div className='min-h-screen bg-white flex flex-col items-center py-10 print:p-0 transition-colors duration-300'>
      {/* Controls - Hidden when printing */}
      <div className='mb-8 flex gap-3 print:hidden flex-wrap justify-center max-w-2xl px-4'>
        <Button
          variant={variant === 'pt-indigo' ? 'default' : 'outline'}
          size='sm'
          className='shadow-sm text-zinc-900 border-zinc-200'
          onClick={() => setVariant('pt-indigo')}>
          PT (Indigo)
        </Button>
        <Button
          variant={variant === 'en-indigo' ? 'default' : 'outline'}
          size='sm'
          className='shadow-sm text-zinc-900 border-zinc-200'
          onClick={() => setVariant('en-indigo')}>
          EN (Indigo)
        </Button>
        <Button
          variant={variant === 'bilingual-indigo' ? 'default' : 'outline'}
          size='sm'
          className='shadow-sm text-zinc-900 border-zinc-200'
          onClick={() => setVariant('bilingual-indigo')}>
          Bilingual (Indigo)
        </Button>
        <Button
          variant={variant === 'bilingual-bw' ? 'default' : 'outline'}
          size='sm'
          className='shadow-sm text-zinc-900 border-zinc-200'
          onClick={() => setVariant('bilingual-bw')}>
          Bilingual (B&W)
        </Button>

        <div className='w-full md:w-auto flex justify-center mt-2 md:mt-0'>
          <Button
            onClick={() => window.print()}
            className='md:ml-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'>
            Print Flyer
          </Button>
        </div>
      </div>

      {/* Container for the Flyer - shadow only visible on screen */}
      <div className='relative print:block flex justify-center w-full min-h-screen print:min-h-0'>
        {/* On screen: Scale transform. On print: Natural flow */}
        <div className='transform scale-[0.6] sm:scale-[0.8] md:scale-100 origin-top print:transform-none print:static print:w-auto print:h-auto'>
          <Flyer variant={variant} />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          header,
          .print\\:hidden,
          footer,
          button,
          .mb-8 {
            display: none !important;
          }
          /* Force backgrounds */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
