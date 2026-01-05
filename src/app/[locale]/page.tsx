'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { Link } from '@/lib/navigation';
import { DishSearch } from '@/components/dish/DishSearch';
import { DailyMenu } from '@/components/menu/DailyMenu';
import { Info, HeartHandshake, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MISSION_DISMISSED_KEY = 'cantina-mission-dismissed';

export default function HomePage() {
  const t = useTranslations('Home');
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // Default to true to avoid flash

  useEffect(() => {
    const dismissed = localStorage.getItem(MISSION_DISMISSED_KEY);
    if (!dismissed) {
      setIsDismissed(false);
    }
    setIsVisible(true);
  }, []);

  const handleDismissMission = () => {
    localStorage.setItem(MISSION_DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  if (!isVisible) return null;

  return (
    <div className='min-h-screen'>
      {/* Hero Section */}
      <div className='border-b bg-muted/30'>
        <div className='container mx-auto px-4 py-8'>
          <div className='max-w-4xl mx-auto'>
            <h1 className='text-2xl md:text-3xl font-bold mb-2'>Cantina IPB</h1>
            <p className='text-muted-foreground text-sm'>{t('subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='container mx-auto px-4 py-6'>
        <div className='max-w-4xl mx-auto space-y-12'>
          {/* Mission Statement */}
          {!isDismissed && (
            <section className='relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-500/5 via-primary/5 to-transparent p-6 md:p-8 transition-all duration-300 animate-in fade-in slide-in-from-top-4'>
              <Button
                variant='ghost'
                size='icon'
                className='absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground'
                onClick={handleDismissMission}>
                <X className='h-4 w-4' />
              </Button>
              <div className='relative z-10 flex flex-col md:flex-row items-center gap-6 pr-4'>
                <div className='flex-shrink-0 p-3 rounded-xl bg-primary/10 text-primary'>
                  <HeartHandshake className='h-8 w-8' />
                </div>
                <div className='flex-1 text-center md:text-left'>
                  <h2 className='text-xl md:text-2xl font-bold mb-3 flex items-center justify-center md:justify-start gap-2'>
                    {t('missionTitle')}
                  </h2>
                  <p className='text-muted-foreground leading-relaxed mb-4'>
                    {t('missionDescription')}
                  </p>
                  <Link
                    href='/about'
                    className='inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline group'>
                    <Info className='h-4 w-4' />
                    {t('missionLink')}
                    <span className='transition-transform group-hover:translate-x-1'>
                      →
                    </span>
                  </Link>
                </div>
              </div>
              {/* Decorative element */}
              <div className='absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl' />
            </section>
          )}

          <DishSearch />
          <DailyMenu />
        </div>
      </div>
    </div>
  );
}
