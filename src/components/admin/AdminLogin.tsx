'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginAdmin } from '@/lib/auth';
import { useTranslations, useLocale } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function AdminLogin() {
  const t = useTranslations('Navigation');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Helper to build locale-aware admin path
  const getAdminPath = (path: string) => {
    return locale === 'en' ? path : `/${locale}${path}`;
  };

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      await loginAdmin(data.email, data.password);
      setSuccess(true);
      // Short delay to let user see success message before redirect
      setTimeout(() => {
        router.push(getAdminPath('/admin/dashboard'));
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to login. Please check your credentials.',
      );
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-md shadow-lg'>
        <CardHeader className='space-y-1 text-center'>
          <CardTitle className='text-2xl font-bold tracking-tight'>
            {t('admin')}
          </CardTitle>
          <CardDescription>{t('login')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            {error && (
              <Alert variant='destructive'>
                <AlertCircle className='h-4 w-4' />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className='border-green-500 text-green-600 dark:text-green-400'>
                <CheckCircle2 className='h-4 w-4 stroke-green-600 dark:stroke-green-400' />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Login successful! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            <div className='space-y-2'>
              <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                Email
              </label>
              <Input
                type='email'
                disabled={loading || success}
                placeholder='admin@example.com'
                {...register('email')}
              />
              {errors.email && (
                <p className='text-sm text-destructive'>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
                {tCommon('password')}
              </label>
              <Input
                type='password'
                disabled={loading || success}
                {...register('password')}
              />
              {errors.password && (
                <p className='text-sm text-destructive'>
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type='submit'
              className='w-full'
              disabled={loading || success}>
              {loading || success ? tCommon('loading') : t('login')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
