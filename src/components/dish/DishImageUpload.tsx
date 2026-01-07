'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  addPendingDishImage,
  hasDeviceUploadedDishImage,
} from '@/lib/firestore';
import { Dish } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import { STORAGE_KEYS } from '@/lib/constants';
import { Turnstile } from '@/components/ui/Turnstile';

interface DishImageUploadProps {
  dish: Dish;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DishImageUpload({
  dish,
  isOpen,
  onClose,
  onSuccess,
}: DishImageUploadProps) {
  const t = useTranslations('Dish');
  const tCommon = useTranslations('Common');
  const tMenu = useTranslations('Menu');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Turnstile callbacks
  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
    setError('Security verification failed. Please try again.');
  }, []);

  // Note: Users can upload multiple images even if they have pending ones

  // Load saved nickname
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNickname = localStorage.getItem(STORAGE_KEYS.NICKNAME);
      if (savedNickname) {
        setNickname(savedNickname);
      }
    }
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
          tMenu('invalidImageType') ||
            'Invalid image type. Please upload a JPEG, PNG, WebP, or HEIC image.',
        );
        e.target.value = '';
        return;
      }

      // Validate file size (max 10MB before compression)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        setError(
          tMenu('imageTooLarge') ||
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
      setError(tMenu('pleaseSelectImage') || 'Please select an image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Upload image with Turnstile token and metadata for notification
      const imageUrl = await uploadImage(imageFile, {
        isRequest: false,
        turnstileToken: turnstileToken || undefined,
        dishName: dish.name,
        nickname: nickname.trim(),
      });

      // Add pending image to dish
      await addPendingDishImage(
        dish.id,
        imageUrl,
        nickname.trim() || undefined,
      );

      // Save nickname to localStorage if provided
      if (nickname.trim()) {
        localStorage.setItem(STORAGE_KEYS.NICKNAME, nickname.trim());
      }

      // Reset form
      setImageFile(null);
      setImagePreview(null);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
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
            {t('uploadImage') || 'Upload Image'} - {dish.name}
          </DialogTitle>
          <DialogDescription>
            {t('uploadImageDescription') ||
              'Upload an image for this dish. The image will be reviewed before being approved.'}
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
              {tMenu('selectImage') || 'Select Image'}
            </label>
            <Input
              type='file'
              accept='image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif'
              onChange={handleImageChange}
              className='cursor-pointer'
              disabled={loading}
            />
            <p className='text-xs text-muted-foreground mt-1'>
              {tMenu('imageCompressionNotice') ||
                'Images will be automatically compressed to reduce size (max 10MB before compression).'}
            </p>
          </div>

          <div>
            <label className='text-sm font-medium mb-2 block'>
              {t('nickname') || 'Nickname'} ({t('optional') || 'Optional'})
            </label>
            <Input
              type='text'
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('nicknamePlaceholder') || 'Your nickname'}
              disabled={loading}
            />
            <p className='text-xs text-muted-foreground mt-1'>
              {t('nicknameDescription') ||
                'If provided, your nickname will be shown when the image is approved.'}
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
