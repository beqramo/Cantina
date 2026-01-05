'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ExternalLink,
  BookOpen,
  Utensils,
  LogIn,
  Coffee,
  CreditCard,
  Sandwich,
  RefreshCw,
} from 'lucide-react';
import { Link } from '@/lib/navigation';

export default function RulesPage() {
  const t = useTranslations();

  const rules = [
    {
      id: 1,
      icon: Utensils,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      text: t('Rules.rule1'),
    },
    {
      id: 2,
      icon: LogIn,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      text: (
        <>
          {t('Rules.rule2')}{' '}
          <Link
            href='https://online.ipb.pt/ui/#/site/sas/senhas'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 hover:underline'>
            online.ipb.pt
            <ExternalLink className='h-3 w-3' />
          </Link>
        </>
      ),
    },
    {
      id: 3,
      icon: Coffee,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      text: t('Rules.rule3'),
    },
    {
      id: 4,
      icon: CreditCard,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      text: t('Rules.rule4'),
    },
    {
      id: 5,
      icon: Sandwich,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      text: t('Rules.rule5'),
    },
    {
      id: 6,
      icon: RefreshCw,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      text: t('Rules.rule6'),
    },
  ];

  return (
    <div className='min-h-screen bg-background'>
      {/* Hero Section */}
      <section className='relative overflow-hidden border-b bg-muted/30 py-12 md:py-20'>
        <div className='container relative z-10 mx-auto px-4'>
          <div className='max-w-3xl mx-auto text-center'>
            <div className='inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-6 animate-in zoom-in duration-500'>
              <BookOpen className='h-8 w-8' />
            </div>
            <h1 className='text-3xl md:text-5xl font-extrabold tracking-tight mb-4'>
              {t('Rules.title')}
            </h1>
            <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
              {t('Rules.subtitle')}
            </p>
          </div>
        </div>
        {/* Decorative element */}
        <div className='absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2' />
      </section>

      {/* Rules Grid */}
      <div className='container mx-auto px-4 py-16'>
        <div className='max-w-5xl mx-auto'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {rules.map((rule) => {
              const Icon = rule.icon;
              return (
                <Card
                  key={rule.id}
                  className='group relative overflow-hidden rounded-3xl border-none bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-1'>
                  <CardHeader className='pb-2'>
                    <div
                      className={`p-3 w-fit rounded-2xl ${rule.bgColor} ${rule.color} transition-transform group-hover:scale-110 duration-300`}>
                      <Icon className='h-6 w-6' />
                    </div>
                  </CardHeader>
                  <CardContent className='pt-2'>
                    <div className='text-xs font-bold text-muted-foreground/50 mb-2 uppercase tracking-wider'>
                      {t('Rules.ruleNumber')} #{rule.id}
                    </div>
                    <div className='text-base font-medium leading-relaxed text-foreground/90'>
                      {rule.text}
                    </div>
                  </CardContent>
                  {/* Subtle background detail */}
                  <div
                    className={`absolute -right-4 -bottom-4 opacity-[0.03] transition-opacity group-hover:opacity-[0.08]`}>
                    <Icon className='h-24 w-24' />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Additional Info Footer */}
          <div className='mt-16 p-8 rounded-3xl bg-muted/30 border border-dashed text-center'>
            <p className='text-muted-foreground max-w-2xl mx-auto italic'>
              "{t('Rules.footerNote')}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
