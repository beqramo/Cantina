'use client';

import { useState, ReactNode } from 'react';
import Image from 'next/image';
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';
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
import { useTranslateData } from '@/hooks/useTranslateData';
import { useSWRFirebase } from '@/hooks/useSWRFirebase';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache-keys';

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
  const { translateCategory, translateTag } = useTranslateData();
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fetch dish data using SWR if dishId provided and no dish prop
  const { data: fetchedDish } = useSWRFirebase({
    cacheKey: dishId && !providedDish ? CACHE_KEYS.DISH_BY_ID(dishId) : null,
    fetcher: async () => {
      if (!dishId) return null;
      return await getDishById(dishId);
    },
    ttl: CACHE_TTL.LONG, // 5 minutes - dish data doesn't change frequently
    enabled: !!dishId && !providedDish,
  });

  // Use provided dish or fetched dish
  const displayDish = providedDish || fetchedDish;

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

  // Check if image exists (regardless of approval status)
  const hasImageUrl = !!currentImageUrl;
  // Only show image if it exists AND is approved
  const hasImage = hasImageUrl && !isPendingApproval;

  const handleImageClick = () => {
    if (hasImage) {
      setIsImageViewerOpen(true);
      // Log image viewer open event
      if (analytics) {
        logEvent(analytics, 'view_dish_image', {
          dish_id: displayDish?.id || dishId,
          dish_name: name,
          image_count: dishImages.length,
        });
      }
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

  // Category styling configuration - muted, professional colors
  const getCategoryConfig = (cat?: DishCategory | string) => {
    if (!cat) return null;

    const configs: Record<
      string,
      {
        icon: React.ComponentType<{ className?: string }>;
        iconColor: string;
      }
    > = {
      'Sugestão do Chefe': {
        icon: ChefHat,
        iconColor: 'text-amber-500',
      },
      'Dieta Mediterrânica': {
        icon: Leaf,
        iconColor: 'text-emerald-500',
      },
      Alternativa: {
        icon: UtensilsCrossed,
        iconColor: 'text-blue-500',
      },
      Vegetariana: {
        icon: Sparkles,
        iconColor: 'text-purple-500',
      },
    };

    return configs[cat] || null;
  };

  const categoryConfig = getCategoryConfig(category);
  const CategoryIcon = categoryConfig?.icon;

  return (
    <>
      <Card className='overflow-hidden flex flex-col h-full transition-all hover:shadow-lg hover:border-border/80'>
        {/* Image Section */}
        <div
          className='relative aspect-[4/3] w-full cursor-pointer group bg-muted'
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
                className='object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]'
                sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw'
                quality={90}
              />
              {/* Overlay on hover */}
              <div className='absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center'>
                <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                  <div className='bg-black/60 backdrop-blur-sm rounded-full p-2'>
                    <Maximize2 className='h-5 w-5 text-white' />
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
                    className='absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-1.5 transition-all z-10 opacity-70 hover:opacity-100'>
                    <ChevronLeft className='h-4 w-4 text-white' />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateCarousel('next');
                    }}
                    className='absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-1.5 transition-all z-10 opacity-70 hover:opacity-100'>
                    <ChevronRight className='h-4 w-4 text-white' />
                  </button>

                  {/* Image Indicators */}
                  <div className='absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10'>
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
                  <div className='absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-md px-2 py-0.5 text-xs text-white z-10'>
                    {safeImageIndex + 1}/{dishImages.length}
                  </div>
                </>
              )}

              {isPendingApproval && (
                <div className='absolute top-2 right-2 z-10'>
                  <Badge className='bg-amber-500 text-white text-xs'>
                    <Clock className='h-3 w-3 mr-1' />
                    {tMenu('pendingApproval') || 'Pending'}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <div className='absolute inset-0 flex items-center justify-center group-hover:bg-muted/80 transition-colors'>
              <div className='text-center p-4 relative w-full h-full flex flex-col items-center justify-center'>
                {isPendingApproval && (
                  <div className='absolute top-2 right-2 z-10'>
                    <Badge className='bg-amber-500 text-white text-xs'>
                      <Clock className='h-3 w-3 mr-1' />
                      {tMenu('pendingApproval') || 'Pending'}
                    </Badge>
                  </div>
                )}
                <Camera className='h-10 w-10 text-muted-foreground/50 mb-2 group-hover:text-muted-foreground transition-colors' />
                {(onAddImageClick || showDishUpload) && !isPendingApproval && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddImageClick?.();
                    }}
                    variant='outline'
                    size='sm'
                    className='text-xs h-7'>
                    {tMenu('addImage') || 'Add Image'}
                  </Button>
                )}
                {isPendingApproval && (
                  <p className='text-xs text-muted-foreground'>
                    {tMenu('imagePendingReview')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <CardContent className='p-3 flex flex-col flex-1'>
          <div className='flex-1 space-y-2'>
            {/* Category Badge */}
            {category && categoryConfig && CategoryIcon && (
              <div className='flex items-center gap-1.5'>
                <CategoryIcon
                  className={`h-3.5 w-3.5 ${categoryConfig.iconColor}`}
                />
                <span className='text-xs text-muted-foreground font-medium'>
                  {translateCategory(category)}
                </span>
              </div>
            )}

            {/* Dish Name */}
            <h3 className='font-semibold text-sm leading-snug line-clamp-2'>
              {name}
            </h3>

            {/* Tags */}
            {displayDish?.tags && displayDish.tags.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {displayDish.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant='secondary'
                    className='text-[10px] py-0 px-1.5 font-normal'>
                    {translateTag(tag)}
                  </Badge>
                ))}
              </div>
            )}

            {/* Image Provider */}
            {displayDish?.imageProviderNickname && (
              <p className='text-[11px] text-muted-foreground'>
                {t('imageProvidedBy') || 'Image by'}{' '}
                <span className='font-medium'>
                  {displayDish.imageProviderNickname}
                </span>
              </p>
            )}
            {children}
          </div>

          {/* Vote Buttons */}
          <div className='mt-3 pt-2 border-t'>
            {displayDish ? (
              <VoteButtons dish={displayDish} />
            ) : (
              <div className='flex items-center gap-2'>
                <div className='h-7 w-14 bg-muted rounded animate-pulse' />
                <div className='h-7 w-14 bg-muted rounded animate-pulse' />
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
