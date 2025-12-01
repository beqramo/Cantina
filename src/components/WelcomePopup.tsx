'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Users, Info } from 'lucide-react';

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
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(WELCOME_POPUP_KEY, 'true');
    }
    setIsOpen(false);
  };

  const handleGetStarted = () => {
    localStorage.setItem(WELCOME_POPUP_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-center pb-2'>
          <DialogTitle className='text-xl font-bold'>
            {t('title')}
          </DialogTitle>
          <DialogDescription className='text-muted-foreground'>
            {t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Introduction */}
          <p className='text-sm text-muted-foreground text-center'>
            {t('description')}
          </p>

          {/* Work in Progress Notice */}
          <div className='p-3 rounded-md bg-muted border'>
            <div className='flex items-start gap-3'>
              <div className='p-1.5 rounded-md bg-amber-500/10'>
                <Camera className='h-4 w-4 text-amber-600 dark:text-amber-400' />
              </div>
              <div>
                <h4 className='font-medium text-sm mb-1'>
                  {t('workInProgress')}
                </h4>
                <p className='text-xs text-muted-foreground'>
                  {t('workInProgressDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className='p-3 rounded-md bg-muted border'>
            <div className='flex items-start gap-3'>
              <div className='p-1.5 rounded-md bg-amber-500/10'>
                <Users className='h-4 w-4 text-amber-600 dark:text-amber-400' />
              </div>
              <div>
                <h4 className='font-medium text-sm mb-1'>
                  {t('callToAction')}
                </h4>
                <p className='text-xs text-muted-foreground'>
                  {t('callToActionDescription')}
                </p>
              </div>
            </div>
          </div>

          {/* Not Official Notice */}
          <div className='flex items-center gap-2 p-2 rounded-md bg-amber-500/5 border border-amber-500/20'>
            <Info className='h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0' />
            <p className='text-xs text-muted-foreground'>
              {t('notOfficial')}
            </p>
          </div>
        </div>

        <DialogFooter className='flex-col gap-3 sm:flex-col'>
          <Button
            onClick={handleGetStarted}
            className='w-full'>
            {t('getStarted')}
          </Button>
          <label className='flex items-center justify-center gap-2 text-xs text-muted-foreground cursor-pointer'>
            <input
              type='checkbox'
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className='rounded border-border'
            />
            {t('dontShowAgain')}
          </label>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
