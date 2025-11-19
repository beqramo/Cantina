'use client';

import { useState, useEffect, ReactNode } from 'react';
import Image from 'next/image';
import {
  Camera,
  Clock,
  Maximize2,
  ChefHat,
  Leaf,
  UtensilsCrossed,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Dish, DishCategory } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VoteButtons } from './VoteButtons';
import { ImageViewer } from './ImageViewer';
import { useTranslations } from 'next-intl';
import { getDishById } from '@/lib/firestore';

interface DishCardBaseProps {
  // Image props
  imageUrl?: string;
  imageAlt: string;
  onImageClick?: () => void;
  onAddImageClick?: () => void;
  isPendingApproval?: boolean;

  // Content props
  name: string;
  category?: DishCategory | string;
  dishId?: string; // If provided, will fetch dish data for tags, vote buttons, etc.

  // Optional override dish data (if already fetched)
  dish?: Dish | null;

  // Children for additional content
  children?: ReactNode;

  // Show upload button for dishes (not menu items)
  showDishUpload?: boolean;
}

export function DishCardBase({
  imageUrl,
  imageAlt,
  onImageClick,
  onAddImageClick,
  isPendingApproval = false,
  name,
  category,
  dishId,
  dish: providedDish,
  children,
  showDishUpload = false,
}: DishCardBaseProps) {
  const t = useTranslations('Dish');
  const tMenu = useTranslations('Menu');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [dish, setDish] = useState<Dish | null>(providedDish || null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Use provided dish or fetched dish
  const displayDish = providedDish || dish;

  // Get all images for the dish (from images array or fallback to imageUrl)
  const dishImages = displayDish?.images || (imageUrl ? [imageUrl] : []);
  const hasMultipleImages = dishImages.length > 1;
  // Ensure currentImageIndex is within bounds (clamp to valid range)
  // This handles cases where the dish changes or images array changes
  const safeImageIndex =
    dishImages.length > 0
      ? Math.max(0, Math.min(currentImageIndex, dishImages.length - 1))
      : 0;
  const currentImageUrl = dishImages[safeImageIndex] || imageUrl || '';

  // Note: safeImageIndex automatically clamps currentImageIndex to valid range
  // So we don't need to reset the index when dish changes - it will be clamped automatically

  // Check if image exists (regardless of approval status)
  const hasImageUrl = !!currentImageUrl;
  // Only show image if it exists AND is approved
  const hasImage = hasImageUrl && !isPendingApproval;

  // Fetch dish data if dishId exists and dish not provided
  useEffect(() => {
    if (dishId && !providedDish) {
      getDishById(dishId).then(setDish).catch(console.error);
    }
  }, [dishId, providedDish]);

  const handleImageClick = () => {
    if (hasImage) {
      setIsImageViewerOpen(true);
      onImageClick?.();
    } else if (onAddImageClick) {
      onAddImageClick();
    }
  };

  const navigateCarousel = (direction: 'prev' | 'next') => {
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      direction === 'next'
        ? (prev + 1) % dishImages.length
        : (prev - 1 + dishImages.length) % dishImages.length,
    );
  };

  // Category styling configuration
  const getCategoryConfig = (cat?: DishCategory | string) => {
    if (!cat) return null;

    const configs: Record<
      string,
      {
        icon: React.ComponentType<{ className?: string }>;
        color: string;
        bgColor: string;
        borderColor: string;
        textColor: string;
      }
    > = {
      'Sugestão do Chefe': {
        icon: ChefHat,
        color: 'bg-gradient-to-r from-amber-500 to-orange-500',
        bgColor: 'bg-amber-100 dark:bg-amber-900/60',
        borderColor: 'border-amber-300 dark:border-amber-700',
        textColor: 'text-amber-900 dark:text-amber-50',
      },
      'Dieta Mediterrânica': {
        icon: Leaf,
        color: 'bg-gradient-to-r from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/60',
        borderColor: 'border-emerald-300 dark:border-emerald-700',
        textColor: 'text-emerald-900 dark:text-emerald-50',
      },
      Alternativa: {
        icon: UtensilsCrossed,
        color: 'bg-gradient-to-r from-blue-500 to-indigo-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/60',
        borderColor: 'border-blue-300 dark:border-blue-700',
        textColor: 'text-blue-900 dark:text-blue-50',
      },
      Vegetariana: {
        icon: Sparkles,
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        bgColor: 'bg-purple-100 dark:bg-purple-900/60',
        borderColor: 'border-purple-300 dark:border-purple-700',
        textColor: 'text-purple-900 dark:text-purple-50',
      },
    };

    return configs[cat] || null;
  };

  const categoryConfig = getCategoryConfig(category);
  const CategoryIcon = categoryConfig?.icon;

  return (
    <>
      <Card className='overflow-hidden flex flex-col h-full transition-shadow hover:shadow-md'>
        {/* Category Header */}
        {category && categoryConfig && (
          <div
            className={`${categoryConfig.bgColor} ${categoryConfig.textColor} border-b ${categoryConfig.borderColor} px-3 py-1.5`}>
            <div className='flex items-center gap-1.5'>
              {CategoryIcon && (
                <div
                  className={`${categoryConfig.color} p-1 rounded shadow-sm`}>
                  <CategoryIcon className='h-3 w-3 text-white' />
                </div>
              )}
              <span
                className={`text-xs font-semibold ${categoryConfig.textColor} truncate`}>
                {category}
              </span>
            </div>
          </div>
        )}

        <div
          className='relative aspect-[3/2] w-full cursor-pointer group'
          onClick={handleImageClick}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleImageClick();
            }
          }}
          aria-label={
            hasImage
              ? `View full size image of ${imageAlt}`
              : onAddImageClick
              ? `Add image for ${imageAlt}`
              : undefined
          }>
          {hasImage ? (
            <>
              <Image
                src={currentImageUrl}
                alt={`${imageAlt} - Image ${safeImageIndex + 1} of ${
                  dishImages.length
                }`}
                fill
                className='object-cover transition-opacity group-hover:opacity-90'
                sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw'
              />
              <div className='absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors'>
                <div className='opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
                  <div className='bg-black/60 backdrop-blur-sm rounded-full p-1.5'>
                    <Maximize2 className='h-4 w-4 md:h-5 md:w-5 text-white' />
                  </div>
                </div>
              </div>

              {/* Carousel Navigation */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateCarousel('prev');
                    }}
                    className='absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-1.5 transition-colors z-10 opacity-60 md:opacity-0 md:group-hover:opacity-100'>
                    <ChevronLeft className='h-4 w-4 text-white' />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateCarousel('next');
                    }}
                    className='absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-1.5 transition-colors z-10 opacity-60 md:opacity-0 md:group-hover:opacity-100'>
                    <ChevronRight className='h-4 w-4 text-white' />
                  </button>

                  {/* Image Indicators */}
                  <div className='absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
                    {dishImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === safeImageIndex
                            ? 'w-4 bg-white'
                            : 'w-1.5 bg-white/50 hover:bg-white/75'
                        }`}
                        aria-label={`Go to image ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Image Counter */}
                  <div className='absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5 text-xs text-white z-10 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
                    {safeImageIndex + 1} / {dishImages.length}
                  </div>
                </>
              )}

              {isPendingApproval && (
                <div className='absolute top-1.5 right-1.5 z-10'>
                  <Badge
                    variant='secondary'
                    className='bg-yellow-500 text-white text-xs px-1.5 py-0.5'>
                    <Clock className='h-2.5 w-2.5 mr-1' />
                    {tMenu('pendingApproval') || 'Pending Approval'}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <div className='absolute inset-0 bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors'>
              <div className='text-center p-3 relative w-full h-full flex flex-col items-center justify-center'>
                {isPendingApproval && (
                  <div className='absolute top-1.5 right-1.5 z-10'>
                    <Badge
                      variant='secondary'
                      className='bg-yellow-500 text-white text-xs px-1.5 py-0.5'>
                      <Clock className='h-2.5 w-2.5 mr-1' />
                      {tMenu('pendingApproval') || 'Pending Approval'}
                    </Badge>
                  </div>
                )}
                <Camera className='h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-60 group-hover:opacity-100 transition-opacity' />
                {(onAddImageClick || showDishUpload) && !isPendingApproval && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddImageClick?.();
                    }}
                    variant='outline'
                    size='sm'
                    className='mt-1 text-xs'>
                    {tMenu('addImage') || 'Add Image'}
                  </Button>
                )}
                {isPendingApproval && (
                  <p className='text-xs text-muted-foreground mt-1'>
                    {tMenu('imagePendingReview') || 'Image pending review'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <CardContent className='p-3 flex flex-col flex-1'>
          <div className='flex-1 space-y-2'>
            <h3 className='font-semibold text-base leading-tight line-clamp-2'>
              {name}
            </h3>
            {displayDish?.tags && displayDish.tags.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {displayDish.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant='outline'
                    className='text-xs py-0 px-1.5'>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            {displayDish?.imageProviderNickname && (
              <p className='text-xs text-muted-foreground'>
                {t('imageProvidedBy') || 'Image provided by'}{' '}
                <span className='font-medium'>
                  {displayDish.imageProviderNickname}
                </span>
              </p>
            )}
            {children}
          </div>
          <div className='mt-3 pt-2 border-t'>
            {displayDish ? (
              <VoteButtons dish={displayDish} />
            ) : (
              <div className='flex items-center gap-3'>
                <div className='h-8 w-16 bg-muted rounded border border-border animate-pulse' />
                <div className='h-8 w-16 bg-muted rounded border border-border animate-pulse' />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {hasImage && dishImages.length > 0 && (
        <ImageViewer
          imageUrl={dishImages[safeImageIndex] || ''}
          alt={`${imageAlt} - Image ${safeImageIndex + 1} of ${
            dishImages.length
          }`}
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          onPrevious={
            hasMultipleImages
              ? () => {
                  navigateCarousel('prev');
                }
              : undefined
          }
          onNext={
            hasMultipleImages
              ? () => {
                  navigateCarousel('next');
                }
              : undefined
          }
          showNavigation={hasMultipleImages}
        />
      )}
    </>
  );
}
