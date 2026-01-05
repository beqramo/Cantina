'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { uploadImage } from '@/lib/storage';
import { updateMenuItemImage } from '@/lib/firestore';
import { Menu, MealType, DishCategory } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { Turnstile } from '@/components/ui/Turnstile';
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';

interface MenuImageUploadProps {
  menu: Menu;
  mealType: MealType;
  category: DishCategory;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MenuImageUpload({
  menu,
  mealType,
  category,
  isOpen,
  onClose,
  onSuccess,
}: MenuImageUploadProps) {
  const t = useTranslations('Menu');
  const tCommon = useTranslations('Common');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Turnstile callbacks
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
    setError('Security verification failed. Please try again.');
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
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

      const isValidType =
        allowedTypes.includes(fileType) ||
        fileName.endsWith('.heic') ||
        fileName.endsWith('.heif');

      if (!isValidType) {
        setError(
          t('invalidImageType') ||
            'Invalid image type. Please upload a JPEG, PNG, WebP, or HEIC image.',
        );
        e.target.value = '';
        return;
      }

      // Validate file size (max 10MB before compression)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        setError(
          t('imageTooLarge') ||
            'Image file is too large. Please use an image smaller than 10MB.',
        );
        e.target.value = '';
        return;
      }

      setError(null);
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      setError(t('pleaseSelectImage') || 'Please select an image');
      return;
    }

    setLoading(true);
    setError(null);

    if (analytics) {
      logEvent(analytics, 'upload_image_start', {
        item_category: category,
        meal_type: mealType,
      });
    }

    try {
      // Upload image with Turnstile token
      const imageUrl = await uploadImage(imageFile, {
        isRequest: false,
        turnstileToken: turnstileToken || undefined,
      });

      // Update menu item
      await updateMenuItemImage(menu.id, mealType, category, imageUrl);

      if (analytics) {
        logEvent(analytics, 'upload_image_success', {
          item_category: category,
          meal_type: mealType,
        });
      }

      // Reset form
      setImageFile(null);
      setImagePreview(null);
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : tCommon('error');
      setError(errorMessage);

      if (analytics) {
        logEvent(analytics, 'upload_image_error', {
          item_category: category,
          meal_type: mealType,
          error_message: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setImageFile(null);
      setImagePreview(null);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('uploadImage') || 'Upload Image'} - {category}
          </DialogTitle>
          <DialogDescription>
            {t('uploadImageDescription') ||
              'Upload an image for this menu item. The image will be reviewed before being approved.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant='destructive'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className='space-y-4'>
          <div>
            <label className='text-sm font-medium mb-2 block'>
              {t('selectImage') || 'Select Image'}
            </label>
            <Input
              type='file'
              accept='image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif'
              onChange={handleImageChange}
              className='cursor-pointer'
              disabled={loading}
            />
            <p className='text-xs text-muted-foreground mt-1'>
              {t('imageCompressionNotice') ||
                'Images will be automatically compressed to reduce size (max 10MB before compression).'}
            </p>
          </div>

          {imagePreview && (
            <div className='mt-2'>
              <img
                src={imagePreview}
                alt='Preview'
                className='max-w-full rounded-md'
              />
            </div>
          )}

          {/* Turnstile CAPTCHA - only shown when configured */}
          <Turnstile
            onVerify={handleTurnstileVerify}
            onError={handleTurnstileError}
            onExpire={handleTurnstileError}
            theme='auto'
          />

          <div className='flex gap-2 justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={loading}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              type='button'
              onClick={handleSubmit}
              disabled={loading || !imageFile}>
              {loading ? tCommon('loading') : t('upload') || 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
