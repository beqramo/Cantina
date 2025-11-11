'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginAdmin } from '@/lib/auth';
import { useTranslations, useLocale } from 'next-intl';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

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
      router.push(getAdminPath('/admin/dashboard'));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to login. Please check your credentials.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <div className='w-full max-w-md space-y-6'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold'>{t('admin')}</h1>
          <p className='text-muted-foreground mt-2'>{t('login')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <label className='text-sm font-medium mb-2 block'>Email</label>
            <Input type='email' {...register('email')} />
            {errors.email && (
              <p className='text-sm text-destructive mt-1'>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className='text-sm font-medium mb-2 block'>
              {tCommon('password')}
            </label>
            <Input type='password' {...register('password')} />
            {errors.password && (
              <p className='text-sm text-destructive mt-1'>
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type='submit' className='w-full' disabled={loading}>
            {loading ? tCommon('loading') : t('login')}
          </Button>
        </form>
      </div>
    </div>
  );
}
