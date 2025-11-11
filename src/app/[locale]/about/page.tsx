'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const t = useTranslations();

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-3xl mx-auto space-y-6'>
        <h1 className='text-3xl font-bold'>{t('About.title')}</h1>
        <p className='text-lg text-muted-foreground'>
          {t('About.description')}
        </p>

        <Card>
          <CardHeader>
            <CardTitle>{t('About.openSource')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4'>{t('About.openSourceDescription')}</p>
            <Link
              href='https://github.com/beqramo/Cantina'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-2 text-primary hover:underline'>
              {t('About.githubLink')}
              <ExternalLink className='h-4 w-4' />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('About.costNotice')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t('About.costNoticeDescription')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
