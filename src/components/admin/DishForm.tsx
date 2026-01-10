'use client';

import { useState } from 'react';
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
import { createDish, updateDish } from '@/lib/firestore';
import { Dish as DishType, DishCategory, DishTag } from '@/types';
import { useTranslations } from 'next-intl';
import { DISH_CATEGORIES, DISH_TAGS } from '@/lib/constants';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TagFilter } from '@/components/dish/TagFilter';

const dishSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
});

type DishFormData = z.infer<typeof dishSchema>;

interface DishFormProps {
  dish?: DishType;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DishForm({ dish, onSuccess, onCancel }: DishFormProps) {
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    dish?.imageUrl || null,
  );
  const [selectedTags, setSelectedTags] = useState<DishTag[]>(dish?.tags || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DishFormData>({
    resolver: zodResolver(dishSchema),
    defaultValues: {
      name: dish?.name || '',
      category: dish?.category || '',
    },
  });

  const category = watch('category');

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

  const onSubmit = async (data: DishFormData) => {
    setLoading(true);
    setError(null);

    try {
      let imageUrl = dish?.imageUrl || '';

      if (imageFile) {
        // Include dish name so the server can send an email notification
        const nameForNotification = data.name || dish?.name || '';
        imageUrl = await uploadImage(imageFile, {
          dishName: nameForNotification,
        });
      }

      if (dish) {
        // Update existing dish
        await updateDish(dish.id, {
          name: data.name,
          imageUrl,
          category: (category as DishCategory) || null,
          tags: selectedTags,
        });
      } else {
        // Create new dish
        await createDish(
          data.name,
          imageUrl,
          (category as DishCategory) || undefined,
          selectedTags,
        );
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
          {t('dishImage')}
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
        {onCancel && (
          <Button type='button' variant='outline' onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
        <Button type='submit' disabled={loading}>
          {loading ? tCommon('loading') : t('save')}
        </Button>
      </div>
    </form>
  );
}
