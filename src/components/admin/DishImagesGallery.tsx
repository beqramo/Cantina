'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Trash2,
  Camera,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { deleteApprovedDishImage } from '@/lib/firestore';
import { invalidateCache } from '@/hooks/useSWRFirebase';
import { CACHE_KEYS } from '@/lib/cache-keys';
import { ImageViewer } from '@/components/dish/ImageViewer';

interface DishImagesGalleryProps {
  dishId: string;
  dishName: string;
  images: string[];
  imageNicknames?: Record<string, string>;
  variant: 'strip' | 'carousel';
  onDeleted?: () => void;
  showDeleteButton?: boolean;
  title?: string;
}

export function DishImagesGallery({
  dishId,
  dishName,
  images,
  imageNicknames,
  variant,
  onDeleted,
  showDeleteButton = true,
  title,
}: DishImagesGalleryProps) {
  const t = useTranslations('Admin');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  // Derive a clamped index every render so deletions don't leave us pointing
  // past the end of the array.
  const safeCurrentIndex =
    images.length > 0
      ? Math.max(0, Math.min(currentIndex, images.length - 1))
      : 0;

  const handleDelete = async (imageUrl: string) => {
    if (!confirm(t('confirmDeleteImage'))) return;
    setDeletingUrl(imageUrl);
    try {
      await deleteApprovedDishImage(dishId, imageUrl);
      invalidateCache(CACHE_KEYS.DISH_BY_ID(dishId));
      onDeleted?.();
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      setDeletingUrl(null);
    }
  };

  if (variant === 'carousel') {
    return (
      <>
        <div className='relative aspect-video w-full overflow-hidden bg-muted'>
          {images.length === 0 ? (
            <div className='absolute inset-0 flex flex-col items-center justify-center text-muted-foreground'>
              <Camera className='h-10 w-10 mb-2 opacity-50' />
              <p className='text-sm'>{t('noImagesYet')}</p>
            </div>
          ) : (
            <CarouselFrame
              images={images}
              imageNicknames={imageNicknames}
              dishName={dishName}
              currentIndex={safeCurrentIndex}
              onIndexChange={setCurrentIndex}
              onOpenViewer={() => setViewerIndex(safeCurrentIndex)}
              onDelete={showDeleteButton ? handleDelete : undefined}
              deletingUrl={deletingUrl}
              t={t}
            />
          )}
        </div>

        {viewerIndex !== null && images[viewerIndex] && (
          <ImageViewer
            imageUrl={images[viewerIndex] || ''}
            alt={`${dishName} - Image ${viewerIndex + 1}`}
            isOpen={viewerIndex !== null}
            onClose={() => setViewerIndex(null)}
            onPrevious={
              images.length > 1
                ? () =>
                    setViewerIndex(
                      (prev) =>
                        ((prev ?? 0) - 1 + images.length) % images.length,
                    )
                : undefined
            }
            onNext={
              images.length > 1
                ? () =>
                    setViewerIndex(
                      (prev) => ((prev ?? 0) + 1) % images.length,
                    )
                : undefined
            }
            showNavigation={images.length > 1}
          />
        )}
      </>
    );
  }

  // strip variant
  return (
    <>
      <div className='border-t bg-muted/30'>
        <div className='px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground'>
          {title || t('currentImages')} ({images.length})
        </div>
        {images.length === 0 ? (
          <div className='px-3 pb-3 text-xs text-muted-foreground'>
            {t('noImagesYet')}
          </div>
        ) : (
          <div className='flex gap-2 overflow-x-auto px-3 pb-3'>
            {images.map((url, idx) => {
              const nickname = imageNicknames?.[url];
              const isDeleting = deletingUrl === url;
              return (
                <div
                  key={url}
                  className='relative shrink-0 w-20 group/thumb'
                  title={nickname ? `${t('uploadedBy')}: ${nickname}` : undefined}>
                  <button
                    type='button'
                    onClick={() => setViewerIndex(idx)}
                    className='relative block w-20 h-20 rounded-md overflow-hidden bg-muted ring-1 ring-border hover:ring-primary transition cursor-pointer'
                    aria-label={`View image ${idx + 1}`}>
                    <Image
                      src={url}
                      alt={`${dishName} image ${idx + 1}`}
                      fill
                      sizes='80px'
                      className='object-cover'
                    />
                  </button>
                  {showDeleteButton && (
                    <button
                      type='button'
                      onClick={() => handleDelete(url)}
                      disabled={isDeleting}
                      className='absolute -top-1.5 -right-1.5 z-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 shadow-md opacity-100 md:opacity-0 md:group-hover/thumb:opacity-100 transition-opacity disabled:opacity-50 cursor-pointer'
                      aria-label={t('deleteImage')}
                      title={t('deleteImage')}>
                      <Trash2 className='h-3 w-3' />
                    </button>
                  )}
                  {nickname && (
                    <p className='mt-1 text-[10px] text-muted-foreground truncate w-20'>
                      {nickname}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewerIndex !== null && images[viewerIndex] && (
        <ImageViewer
          imageUrl={images[viewerIndex] || ''}
          alt={`${dishName} - Image ${viewerIndex + 1}`}
          isOpen={viewerIndex !== null}
          onClose={() => setViewerIndex(null)}
          onPrevious={
            images.length > 1
              ? () =>
                  setViewerIndex(
                    (prev) =>
                      ((prev ?? 0) - 1 + images.length) % images.length,
                  )
              : undefined
          }
          onNext={
            images.length > 1
              ? () =>
                  setViewerIndex(
                    (prev) => ((prev ?? 0) + 1) % images.length,
                  )
              : undefined
          }
          showNavigation={images.length > 1}
        />
      )}
    </>
  );
}

function CarouselFrame({
  images,
  imageNicknames,
  dishName,
  currentIndex,
  onIndexChange,
  onOpenViewer,
  onDelete,
  deletingUrl,
  t,
}: {
  images: string[];
  imageNicknames?: Record<string, string>;
  dishName: string;
  currentIndex: number;
  onIndexChange: (idx: number) => void;
  onOpenViewer: () => void;
  onDelete?: (url: string) => void;
  deletingUrl: string | null;
  t: (key: string) => string;
}) {
  const safeIndex = Math.min(currentIndex, images.length - 1);
  const currentUrl = images[safeIndex] || '';
  const nickname = currentUrl ? imageNicknames?.[currentUrl] : undefined;
  const hasMultiple = images.length > 1;
  const isDeleting = deletingUrl === currentUrl;

  return (
    <>
      <button
        type='button'
        onClick={onOpenViewer}
        className='absolute inset-0 group cursor-pointer'
        aria-label={`View full size image of ${dishName}`}>
        <Image
          src={currentUrl}
          alt={`${dishName} - Image ${safeIndex + 1}`}
          fill
          className='object-cover transition-opacity group-hover:opacity-90'
          sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
        />
        <div className='absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors'>
          <div className='opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
            <div className='bg-black/60 backdrop-blur-sm rounded-full p-2'>
              <Maximize2 className='h-6 w-6 md:h-8 md:w-8 text-white' />
            </div>
          </div>
        </div>
      </button>

      {onDelete && currentUrl && (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            onDelete(currentUrl);
          }}
          disabled={isDeleting}
          className='absolute top-2 right-2 z-20 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1.5 shadow-md transition-opacity disabled:opacity-50 cursor-pointer'
          aria-label={t('deleteImage')}
          title={t('deleteImage')}>
          <Trash2 className='h-4 w-4' />
        </button>
      )}

      {hasMultiple && (
        <>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(
                (safeIndex - 1 + images.length) % images.length,
              );
            }}
            className='absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-1.5 transition-colors z-10 cursor-pointer'
            aria-label='Previous image'>
            <ChevronLeft className='h-5 w-5 text-white' />
          </button>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((safeIndex + 1) % images.length);
            }}
            className='absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-1.5 transition-colors z-10 cursor-pointer'
            aria-label='Next image'>
            <ChevronRight className='h-5 w-5 text-white' />
          </button>

          <div className='absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10'>
            {images.map((_, idx) => (
              <button
                key={idx}
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  onIndexChange(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === safeIndex
                    ? 'w-6 bg-white'
                    : 'w-2 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>

          <div className='absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-xs text-white z-10'>
            {safeIndex + 1} / {images.length}
          </div>
        </>
      )}

      {nickname && (
        <div className='absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-3 pt-6 pb-2'>
          <p className='text-xs text-white'>
            {t('uploadedBy')}: <span className='font-medium'>{nickname}</span>
          </p>
        </div>
      )}
    </>
  );
}
