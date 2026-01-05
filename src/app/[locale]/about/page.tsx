'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ExternalLink,
  Heart,
  Users,
  Code,
  AlertTriangle,
  Compass,
  Camera,
  HandHeart,
  DollarSign,
  Instagram,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const t = useTranslations();

  return (
    <div className='min-h-screen bg-background'>
      {/* Hero Section */}
      <section className='relative overflow-hidden border-b bg-muted/30 py-16 md:py-24'>
        <div className='container relative z-10 mx-auto px-4'>
          <div className='max-w-3xl mx-auto text-center'>
            <div className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-in fade-in slide-in-from-bottom-4'>
              <Heart className='h-3.5 w-3.5 fill-current' />
              <span>{t('About.communityDriven')}</span>
            </div>
            <h1 className='text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
              {t('About.title')}
            </h1>
            <p className='text-xl text-muted-foreground mb-8 leading-relaxed'>
              {t('About.subtitle')}
            </p>
            <div className='flex flex-wrap justify-center gap-4'>
              <div className='flex items-center gap-2 px-4 py-2 rounded-xl bg-background border shadow-sm'>
                <Users className='h-5 w-5 text-primary' />
                <span className='text-sm font-medium'>
                  {t('About.badgeStudents')}
                </span>
              </div>
              <div className='flex items-center gap-2 px-4 py-2 rounded-xl bg-background border shadow-sm'>
                <DollarSign className='h-5 w-5 text-green-500' />
                <span className='text-sm font-medium'>
                  {t('About.badgeNonProfit')}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative Background Elements */}
        <div className='absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2' />
        <div className='absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl translate-y-1/2' />
      </section>

      {/* Content Grid */}
      <div className='container mx-auto px-4 py-16'>
        <div className='max-w-6xl mx-auto'>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {/* Left Column: Mission & Community */}
            <div className='lg:col-span-2 space-y-8'>
              {/* Mission Statement */}
              <div className='group relative overflow-hidden rounded-3xl border bg-card p-8 shadow-sm transition-all hover:shadow-md'>
                <div className='absolute top-0 right-0 p-8 text-primary/5'>
                  <Compass className='h-24 w-24' />
                </div>
                <div className='relative z-10'>
                  <div className='inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-6'>
                    <Compass className='h-6 w-6' />
                  </div>
                  <h2 className='text-2xl font-bold mb-4'>
                    {t('About.mission')}
                  </h2>
                  <p className='text-muted-foreground leading-relaxed text-lg'>
                    {t('About.missionDescription')}
                  </p>
                </div>
              </div>

              {/* Grid of smaller info cards */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Community Driven */}
                <Card className='rounded-2xl border-none bg-muted/50 transition-colors hover:bg-muted/80'>
                  <CardHeader>
                    <div className='p-2.5 w-fit rounded-xl bg-indigo-500/10 text-indigo-600 mb-2'>
                      <Camera className='h-5 w-5' />
                    </div>
                    <CardTitle className='text-lg'>
                      {t('About.communityDriven')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                      {t('About.communityDrivenDescription')}
                    </p>
                  </CardContent>
                </Card>

                {/* Open Source */}
                <Card className='rounded-2xl border-none bg-muted/50 transition-colors hover:bg-muted/80'>
                  <CardHeader>
                    <div className='p-2.5 w-fit rounded-xl bg-emerald-500/10 text-emerald-600 mb-2'>
                      <Code className='h-5 w-5' />
                    </div>
                    <CardTitle className='text-lg'>
                      {t('About.openSource')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                      {t('About.openSourceDescription')}
                    </p>
                    <Link
                      href='https://github.com/beqramo/Cantina'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline hover:gap-3 transition-all'>
                      {t('About.githubLink')}
                      <ExternalLink className='h-4 w-4' />
                    </Link>
                  </CardContent>
                </Card>

                {/* Volunteer */}
                <Card className='rounded-2xl border-none bg-muted/50 transition-colors hover:bg-muted/80'>
                  <CardHeader>
                    <div className='p-2.5 w-fit rounded-xl bg-rose-500/10 text-rose-600 mb-2'>
                      <HandHeart className='h-5 w-5' />
                    </div>
                    <CardTitle className='text-lg'>
                      {t('About.volunteer')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                      {t('About.volunteerDescription')}
                    </p>
                  </CardContent>
                </Card>

                {/* Acknowledgments */}
                <Card className='rounded-2xl border-none bg-muted/50 transition-colors hover:bg-muted/80'>
                  <CardHeader>
                    <div className='p-2.5 w-fit rounded-xl bg-orange-500/10 text-orange-600 mb-2'>
                      <Instagram className='h-5 w-5' />
                    </div>
                    <CardTitle className='text-lg'>
                      {t('About.acknowledgments')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                      {t.rich('About.acknowledgmentsDescription', {
                        instagramLink: () => (
                          <Link
                            href='https://www.instagram.com/comidasdoipb/'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='font-semibold text-orange-600 hover:underline'>
                            @comidasdoipb
                          </Link>
                        ),
                      })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Thank You Note */}
              <div className='rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-primary/5 p-8 text-center'>
                <div className='inline-flex p-3 rounded-full bg-amber-500/10 text-amber-600 mb-4'>
                  <Sparkles className='h-6 w-6' />
                </div>
                <h3 className='text-xl font-bold mb-2'>
                  {t('About.thankYou')}
                </h3>
                <p className='text-muted-foreground max-w-lg mx-auto'>
                  {t('About.thankYouDescription')}
                </p>
              </div>
            </div>

            {/* Right Column: Sidebar info */}
            <div className='space-y-6'>
              {/* Disclaimer - High Priority */}
              <Card className='border-amber-500/50 bg-gradient-to-br from-amber-50 via-amber-50/80 to-orange-50/50 dark:from-amber-950/40 dark:to-amber-950/20 rounded-3xl overflow-hidden shadow-md shadow-amber-500/5'>
                <div className='bg-amber-500/10 dark:bg-amber-500/20 p-4 border-b border-amber-500/20 flex items-center gap-3'>
                  <div className='p-1.5 rounded-lg bg-amber-500 text-white shadow-sm'>
                    <AlertTriangle className='h-4 w-4' />
                  </div>
                  <h3 className='font-extrabold text-amber-900 dark:text-amber-100'>
                    {t('About.disclaimer')}
                  </h3>
                </div>
                <CardContent className='p-6'>
                  <p className='text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-semibold'>
                    {t('About.disclaimerDescription')}
                  </p>
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card className='rounded-3xl shadow-sm'>
                <CardHeader>
                  <CardTitle className='text-lg flex items-center gap-2'>
                    <MessageCircle className='h-5 w-5 text-primary' />
                    {t('About.contact')}
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <p className='text-sm text-muted-foreground'>
                    {t('About.contactDescription')}
                  </p>
                  <Link
                    href='https://www.instagram.com/beqramo98/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white group hover:shadow-lg transition-all'>
                    <div className='flex items-center gap-3'>
                      <Instagram className='h-5 w-5' />
                      <div className='text-left'>
                        <div className='text-xs opacity-80 font-medium'>
                          {t('About.instagramFollow')}
                        </div>
                        <div className='font-bold'>@beqramo98</div>
                      </div>
                    </div>
                    <ExternalLink className='h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity' />
                  </Link>
                </CardContent>
              </Card>

              {/* Cost Notice */}
              <Card className='rounded-3xl border-none bg-muted/30 shadow-none'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-bold flex items-center gap-2 text-muted-foreground'>
                    <DollarSign className='h-4 w-4' />
                    {t('About.costNotice')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-xs text-muted-foreground leading-relaxed'>
                    {t('About.costNoticeDescription')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
