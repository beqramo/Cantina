'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function RulesPage() {
  const t = useTranslations();

  return (
    <div className='min-h-screen'>
      {/* Hero Section */}
      <div className='border-b bg-muted/30'>
        <div className='container mx-auto px-4 py-8'>
          <div className='max-w-3xl mx-auto'>
            <div className='flex items-center gap-3 mb-2'>
              <div className='p-1.5 rounded-md bg-amber-500/10'>
                <BookOpen className='h-4 w-4 text-amber-600 dark:text-amber-400' />
              </div>
              <h1 className='text-2xl md:text-3xl font-bold'>
                {t('Rules.title')}
              </h1>
            </div>
            <p className='text-muted-foreground text-sm'>
              Important guidelines for using the IPB canteen
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-3xl mx-auto'>
          <Card>
            <CardContent className='pt-6'>
              <ol className='space-y-4'>
                <li className='flex gap-3'>
                  <span className='flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium'>
                    1
                  </span>
                  <span className='text-sm text-muted-foreground pt-0.5'>
                    {t('Rules.rule1')}
                  </span>
                </li>
                <li className='flex gap-3'>
                  <span className='flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium'>
                    2
                  </span>
                  <span className='text-sm text-muted-foreground pt-0.5'>
                    {t('Rules.rule2')}{' '}
                    <Link
                      href='https://online.ipb.pt/ui/#/site/sas/senhas'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1'>
                      online.ipb.pt
                      <ExternalLink className='h-3 w-3' />
                    </Link>
                  </span>
                </li>
                <li className='flex gap-3'>
                  <span className='flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium'>
                    3
                  </span>
                  <span className='text-sm text-muted-foreground pt-0.5'>
                    {t('Rules.rule3')}
                  </span>
                </li>
                <li className='flex gap-3'>
                  <span className='flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium'>
                    4
                  </span>
                  <span className='text-sm text-muted-foreground pt-0.5'>
                    {t('Rules.rule4')}
                  </span>
                </li>
                <li className='flex gap-3'>
                  <span className='flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium'>
                    5
                  </span>
                  <span className='text-sm text-muted-foreground pt-0.5'>
                    {t('Rules.rule5')}
                  </span>
                </li>
                <li className='flex gap-3'>
                  <span className='flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium'>
                    6
                  </span>
                  <span className='text-sm text-muted-foreground pt-0.5'>
                    {t('Rules.rule6')}
                  </span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
