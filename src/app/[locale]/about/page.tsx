'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ExternalLink,
  Heart,
  Users,
  Code,
  AlertTriangle,
  Target,
  Camera,
  HandHeart,
  DollarSign,
  Instagram,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const t = useTranslations();

  return (
    <div className='min-h-screen'>
      {/* Hero Section */}
      <div className='border-b bg-muted/30'>
        <div className='container mx-auto px-4 py-12'>
          <div className='max-w-3xl mx-auto text-center'>
            <div className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium mb-4'>
              <Heart className='h-3.5 w-3.5' />
              <span>Made with love for IPB students</span>
            </div>
            <h1 className='text-3xl md:text-4xl font-bold mb-3'>
              {t('About.title')}
            </h1>
            <p className='text-lg text-muted-foreground mb-2'>
              {t('About.subtitle')}
            </p>
            <p className='text-muted-foreground max-w-2xl mx-auto text-sm'>
              {t('About.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-3xl mx-auto space-y-6'>
          {/* Disclaimer Card - Most Important */}
          <Card className='border-amber-500/30 bg-amber-500/5'>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-3 text-base'>
                <div className='p-1.5 rounded-md bg-amber-500/10'>
                  <AlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400' />
                </div>
                {t('About.disclaimer')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {t('About.disclaimerDescription')}
              </p>
            </CardContent>
          </Card>

          {/* Mission Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-3 text-base'>
                <div className='p-1.5 rounded-md bg-muted'>
                  <Target className='h-4 w-4 text-foreground/70' />
                </div>
                {t('About.mission')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {t('About.missionDescription')}
              </p>
            </CardContent>
          </Card>

          {/* Acknowledgments Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-3 text-base'>
                <div className='p-1.5 rounded-md bg-muted'>
                  <Instagram className='h-4 w-4 text-foreground/70' />
                </div>
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
                      className='inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400 hover:underline'>
                      @comidasdoipb
                      <ExternalLink className='h-3 w-3' />
                    </Link>
                  ),
                })}
              </p>
            </CardContent>
          </Card>

          {/* Community Driven Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-3 text-base'>
                <div className='p-1.5 rounded-md bg-muted'>
                  <Camera className='h-4 w-4 text-foreground/70' />
                </div>
                {t('About.communityDriven')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {t('About.communityDrivenDescription')}
              </p>
            </CardContent>
          </Card>

          {/* Volunteer Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-3 text-base'>
                <div className='p-1.5 rounded-md bg-muted'>
                  <HandHeart className='h-4 w-4 text-foreground/70' />
                </div>
                {t('About.volunteer')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {t('About.volunteerDescription')}
              </p>
            </CardContent>
          </Card>

          {/* Open Source Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-3 text-base'>
                <div className='p-1.5 rounded-md bg-muted'>
                  <Code className='h-4 w-4 text-foreground/70' />
                </div>
                {t('About.openSource')}
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {t('About.openSourceDescription')}
              </p>
              <div className='p-4 rounded-md bg-muted/50 border'>
                <h4 className='font-medium text-sm mb-2'>
                  {t('About.contributingTitle')}
                </h4>
                <p className='text-sm text-muted-foreground mb-3'>
                  {t('About.contributingDescription')}
                </p>
                <Link
                  href='https://github.com/beqramo/Cantina'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors'>
                  {t('About.githubLink')}
                  <ExternalLink className='h-3.5 w-3.5' />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Cost Notice Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-3 text-base'>
                <div className='p-1.5 rounded-md bg-muted'>
                  <DollarSign className='h-4 w-4 text-foreground/70' />
                </div>
                {t('About.costNotice')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {t('About.costNoticeDescription')}
              </p>
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-3 text-base'>
                <div className='p-1.5 rounded-md bg-muted'>
                  <MessageCircle className='h-4 w-4 text-foreground/70' />
                </div>
                {t('About.contact')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground leading-relaxed mb-3'>
                {t('About.contactDescription')}
              </p>
              <Link
                href='https://www.instagram.com/beqramo98/'
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-colors'>
                <Instagram className='h-4 w-4' />
                @beqramo98
                <ExternalLink className='h-3.5 w-3.5' />
              </Link>
            </CardContent>
          </Card>

          {/* Thank You Card */}
          <Card className='border-amber-500/30 bg-amber-500/5'>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-3 text-base'>
                <div className='p-1.5 rounded-md bg-amber-500/10'>
                  <Users className='h-4 w-4 text-amber-600 dark:text-amber-400' />
                </div>
                {t('About.thankYou')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {t('About.thankYouDescription')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
