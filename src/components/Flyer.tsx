import { Logo } from '@/components/ui/Logo';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type FlyerVariant =
  | 'pt-indigo'
  | 'en-indigo'
  | 'bilingual-indigo'
  | 'bilingual-bw';

interface FlyerProps {
  variant: FlyerVariant;
}

export function Flyer({ variant }: FlyerProps) {
  const isIndigo = variant.includes('indigo');
  const isBilingual = variant.includes('bilingual');
  const isEnglish = variant.includes('en');

  // Purely Black and White for printing as per user request
  const textColor = '#000000';
  const bgColor = '#ffffff';

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between overflow-hidden shadow-2xl transition-all',
        'w-[210mm] h-[297mm] p-[60px]',
        'print:shadow-none print:w-[210mm] print:h-[297mm] print:p-[40px] print:m-0',
        // Border logic: simple black border on screen, none on print
        'border border-black print:border-none',
      )}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}>
      {/* Decoration Circle - Subtle grayscale */}
      <div
        className='absolute -top-[100px] -right-[100px] w-[500px] h-[500px] rounded-full z-0 pointer-events-none opacity-5'
        style={{
          background: `radial-gradient(circle, ${textColor} 0%, transparent 70%)`,
        }}
      />

      <div className='relative z-10 h-full flex flex-col items-center text-center'>
        {/* Header */}
        <div className='w-full flex justify-start mb-[60px]'>
          <Logo className='text-[32px]' forceTheme='light' />
        </div>

        {/* Headline */}
        <div className='mb-[40px] w-full'>
          {isEnglish ? (
            <>
              <h1 className='text-[64px] font-extrabold leading-[1.1] mb-6 tracking-tight'>
                Know what you are eating today?
              </h1>
              <p className='text-[28px] opacity-80 font-medium'>
                Daily menu with photos.
              </p>
            </>
          ) : isBilingual ? (
            <>
              <h1 className='text-[44px] font-extrabold leading-[1.1] mb-2 tracking-tight'>
                Sabe o que vais comer hoje?
              </h1>
              <h1
                className='text-[38px] font-extrabold leading-[1.1] mb-5 tracking-tight'
                style={{ color: 'rgba(0,0,0,0.5)' }}>
                Know what you&apos;re having?
              </h1>
              <div
                className='w-[50px] h-[3px] mx-auto my-6 rounded-full'
                style={{ backgroundColor: textColor, opacity: 0.3 }}
              />
              <p className='text-[28px] opacity-80 font-medium'>
                Ementa Completa com Fotos • Full Menu with Photos
              </p>
            </>
          ) : (
            <>
              <h1 className='text-[64px] font-extrabold leading-[1.1] mb-6 tracking-tight'>
                Sabe o que vais comer hoje?
              </h1>
              <p className='text-[28px] opacity-80 font-medium'>
                Ementa do dia com fotos.
              </p>
            </>
          )}
        </div>

        {/* QR Section */}
        <div className='grow flex flex-col justify-center items-center gap-6 mt-[-40px]'>
          <div
            className='rounded-[32px] flex justify-center items-center p-6 bg-white shadow-lg print:shadow-none print:bg-transparent'
            style={{
              width: '360px',
              height: '360px',
              border: `6px solid ${textColor}`,
            }}>
            {/* QR Code SVG */}
            <img
              src='/qr-code.png'
              alt='QR Code'
              className='w-full h-full object-contain'
            />
          </div>
          <p className='font-bold text-[24px] uppercase tracking-[4px] opacity-90 mt-[20px]'>
            {isEnglish ? 'Scan Here' : 'Digitaliza / Scan'}
          </p>
        </div>

        {/* Footer */}
        <div className='w-full flex flex-col items-center gap-6 pt-[30px] self-end'>
          <div className='text-[36px] font-extrabold tracking-tighter'>
            www.cantina-ipb.vercel.app
          </div>
          <p
            className='w-full text-[20px] opacity-80 pt-[20px] font-medium'
            style={{ borderTop: `1px solid rgba(0,0,0,0.1)` }}>
            {isEnglish
              ? 'By students, for students.'
              : 'Por alunos, para alunos • By students, for students.'}
          </p>
        </div>
      </div>
    </div>
  );
}
