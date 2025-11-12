'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uploadImage } from '@/lib/storage';
import { createDishRequest } from '@/lib/firestore';
import { DishCategory, DishTag } from '@/types';
import { useTranslations } from 'next-intl';
import { DISH_CATEGORIES } from '@/lib/constants';
import { STORAGE_KEYS } from '@/lib/constants';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TagFilter } from './TagFilter';

const requestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  nickname: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface DishRequestFormProps {
  initialName?: string;
  onSuccess?: () => void;
}

export function DishRequestForm({
  initialName = '',
  onSuccess,
}: DishRequestFormProps) {
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<DishTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load nickname from localStorage on mount
  useEffect(() => {
    const savedNickname = localStorage.getItem(STORAGE_KEYS.NICKNAME);
    if (savedNickname) {
      setValue('nickname', savedNickname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      name: initialName,
      nickname: '',
    },
  });

  const category = watch('category');
  const nickname = watch('nickname');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (including HEIC for iPhone support)
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
      ];
      const fileName = file.name.toLowerCase();
      const fileType = file.type.toLowerCase();

      // Check MIME type or file extension (for HEIC files where MIME might not be set)
      const isValidType =
        allowedTypes.includes(fileType) ||
        fileName.endsWith('.heic') ||
        fileName.endsWith('.heif');

      if (!isValidType) {
        setError(
          'Invalid image type. Please upload a JPEG, PNG, WebP, or HEIC image.',
        );
        e.target.value = ''; // Reset input
        return;
      }

      // Validate file size (max 10MB before compression)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        setError(
          'Image file is too large. Please use an image smaller than 10MB.',
        );
        e.target.value = ''; // Reset input
        return;
      }

      setError(null); // Clear any previous errors
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: RequestFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Get or create user ID
      let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      }

      // Save nickname to localStorage if provided
      if (data.nickname && data.nickname.trim()) {
        localStorage.setItem(STORAGE_KEYS.NICKNAME, data.nickname.trim());
      }

      // Upload image if provided
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, true);
      }

      // Create request
      await createDishRequest(
        data.name,
        imageUrl,
        (category as DishCategory) || null,
        selectedTags,
        userId,
        data.nickname?.trim() || undefined,
      );

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Alert>
        <AlertDescription>{tCommon('success')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
      {error && (
        <Alert variant='destructive'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <label className='text-sm font-medium mb-2 block'>
          {t('dishName')}
        </label>
        <Input {...register('name')} />
        {errors.name && (
          <p className='text-sm text-destructive mt-1'>{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className='text-sm font-medium mb-2 block'>
          {t('nickname') || 'Nickname'} ({t('optional')})
        </label>
        <Input
          {...register('nickname')}
          placeholder={t('nicknamePlaceholder') || 'Your nickname (optional)'}
        />
        <p className='text-xs text-muted-foreground mt-1'>
          {t('nicknameDescription') ||
            'This will be shown as "Image provided by [nickname]" if you upload an image'}
        </p>
      </div>

      <div>
        <label className='text-sm font-medium mb-2 block'>
          {t('dishImage')} ({t('optional')})
        </label>
        <Input
          type='file'
          accept='image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif'
          onChange={handleImageChange}
          className='cursor-pointer'
        />
        <p className='text-xs text-muted-foreground mt-1'>
          Images will be automatically compressed to reduce size (max 10MB
          before compression). iPhone HEIC images are automatically converted to
          JPEG.
        </p>
        {imagePreview && (
          <div className='mt-2'>
            <img
              src={imagePreview}
              alt='Preview'
              className='max-w-xs rounded-md'
            />
          </div>
        )}
      </div>

      <div>
        <label className='text-sm font-medium mb-2 block'>
          {t('category')} ({t('optional')})
        </label>
        <Select
          value={category || ''}
          onValueChange={(value) => setValue('category', value)}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectCategory')} />
          </SelectTrigger>
          <SelectContent>
            {DISH_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className='text-sm font-medium mb-2 block'>
          {t('tags') || 'Tags'} ({t('optional')})
        </label>
        <TagFilter selectedTags={selectedTags} onTagsChange={setSelectedTags} />
      </div>

      <div className='flex gap-2 justify-end'>
        <Button type='submit' disabled={loading}>
          {loading ? tCommon('loading') : t('save')}
        </Button>
      </div>
    </form>
  );
}
