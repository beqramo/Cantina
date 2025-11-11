'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function RulesPage() {
  const t = useTranslations();

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-3xl mx-auto space-y-6'>
        <h1 className='text-3xl font-bold'>{t('Rules.title')}</h1>

        <Card>
          <CardContent className='pt-6'>
            <ol className='list-decimal list-inside space-y-4'>
              <li>{t('Rules.rule1')}</li>
              <li>
                {t('Rules.rule2')}{' '}
                <Link
                  href='https://online.ipb.pt/ui/#/site/sas/senhas'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-primary hover:underline inline-flex items-center gap-1'>
                  https://online.ipb.pt/ui/#/site/sas/senhas
                  <ExternalLink className='h-3 w-3' />
                </Link>
                .
              </li>
              <li>{t('Rules.rule3')}</li>
              <li>{t('Rules.rule4')}</li>
              <li>{t('Rules.rule5')}</li>
              <li>{t('Rules.rule6')}</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
