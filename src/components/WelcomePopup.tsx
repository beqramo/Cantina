'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Camera,
  Users,
  Info,
  Sparkles,
  UtensilsCrossed,
  CalendarDays,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

const WELCOME_POPUP_KEY = 'cantina-welcome-shown';

export function WelcomePopup() {
  const t = useTranslations('Welcome');
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome popup before
    const hasSeenWelcome = localStorage.getItem(WELCOME_POPUP_KEY);
    if (!hasSeenWelcome) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setIsOpen(true);
        // Log welcome popup shown
        if (analytics) {
          logEvent(analytics, 'welcome_popup_shown');
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(WELCOME_POPUP_KEY, 'true');
    }
    // Log welcome popup dismissed
    if (analytics) {
      logEvent(analytics, 'welcome_popup_dismissed', {
        dont_show_again: dontShowAgain,
      });
    }
    setIsOpen(false);
  };

  const handleGetStarted = () => {
    localStorage.setItem(WELCOME_POPUP_KEY, 'true');
    // Log get started click
    if (analytics) {
      logEvent(analytics, 'welcome_get_started');
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0'>
        {/* Decorative Header with Language Switcher */}
        <div className='relative h-32 bg-linear-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center overflow-hidden'>
          <div className='absolute top-4 right-4 z-50'>
            <LanguageSwitcher />
          </div>

          {/* Background shapes */}
          <div className='absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl' />
          <div className='absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl' />

          <div className='relative z-10 p-4 bg-white/20 backdrop-blur-md rounded-3xl border border-white/30 shadow-xl animate-in zoom-in duration-500'>
            <UtensilsCrossed className='h-10 w-10 text-white' />
          </div>
        </div>

        <div className='px-8 pt-8 pb-4 space-y-6'>
          <DialogHeader className='text-center space-y-2'>
            <DialogTitle className='text-2xl md:text-3xl font-extrabold tracking-tight'>
              {t('title')}
            </DialogTitle>
            <DialogDescription className='text-muted-foreground font-medium'>
              {t('subtitle')}
            </DialogDescription>
          </DialogHeader>

          {/* Core Message */}
          <p className='text-sm text-muted-foreground text-center leading-relaxed'>
            {t('description')}
          </p>

          {/* Features/Info List */}
          <div className='grid gap-4'>
            <div className='flex items-start gap-4 p-4 rounded-2xl bg-muted/50 border border-transparent transition-colors hover:border-primary/20 hover:bg-muted/80'>
              <div className='p-2.5 rounded-xl bg-primary/10 text-primary'>
                <Sparkles className='h-5 w-5' />
              </div>
              <div className='space-y-1'>
                <h4 className='font-bold text-sm leading-none'>
                  {t('workInProgress')}
                </h4>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  {t('workInProgressDescription')}
                </p>
              </div>
            </div>

            <div className='flex items-start gap-4 p-4 rounded-2xl bg-muted/50 border border-transparent transition-colors hover:border-amber-500/20 hover:bg-muted/80'>
              <div className='p-2.5 rounded-xl bg-amber-500/10 text-amber-600'>
                <Users className='h-5 w-5' />
              </div>
              <div className='space-y-1'>
                <h4 className='font-bold text-sm leading-none'>
                  {t('callToAction')}
                </h4>
                <p className='text-xs text-muted-foreground leading-relaxed'>
                  {t('callToActionDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className='flex items-center gap-3 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10'>
            <Info className='h-4 w-4 text-amber-600 shrink-0' />
            <p className='text-[10px] md:text-xs text-muted-foreground font-medium leading-tight italic'>
              {t('notOfficial')}
            </p>
          </div>
        </div>

        <DialogFooter className='px-8 pb-8 pt-2 flex-col gap-4 sm:flex-col'>
          <Button
            onClick={handleGetStarted}
            className='w-full h-12 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all'>
            {t('getStarted')}
          </Button>

          <label className='flex items-center justify-center gap-3 text-xs text-muted-foreground cursor-pointer group hover:text-foreground transition-colors'>
            <div className='relative flex items-center justify-center'>
              <input
                type='checkbox'
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className='peer appearance-none w-4 h-4 rounded border-2 border-muted-foreground/30 checked:bg-primary checked:border-primary transition-all'
              />
              <div className='absolute opacity-0 peer-checked:opacity-100 text-white transition-opacity pointer-events-none'>
                <svg
                  className='w-2.5 h-2.5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='4'
                    d='M5 13l4 4L19 7'
                  />
                </svg>
              </div>
            </div>
            <span className='font-medium'>{t('dontShowAgain')}</span>
          </label>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
