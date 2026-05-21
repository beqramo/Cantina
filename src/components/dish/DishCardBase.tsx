'use client';

import { useRef, useState, ReactNode } from 'react';
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
  Copy,
  Plus,
} from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Dish, DishCategory } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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
  onAddMoreImageClick?: () => void;
  isPendingApproval?: boolean;
  imageProviderNickname?: string;

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
  onAddMoreImageClick,
  isPendingApproval = false,
  name,
  category,
  dishId,
  dish: providedDish,
  children,
  showDishUpload = false,
  imageProviderNickname,
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

  // Build unified image list: approved images first, then pending (dish-level) images
  const approvedImageUrls: string[] =
    displayDish?.images || (imageUrl ? [imageUrl] : []);
  // When the dish has no approved images and we're falling back to the menu
  // item's `imageUrl`, the `isPendingApproval` prop tells us whether that
  // image is still awaiting admin review. Mark it so the per-image pending
  // badge renders on the very first upload.
  const fallbackImageIsPending =
    !displayDish?.images && !!imageUrl && isPendingApproval;
  // The Firestore converter backfills the legacy `imageProviderNickname` into
  // `imageNicknames` for the primary image, so this lookup is sufficient.
  // Fall back to the `imageProviderNickname` prop (passed by MenuDishCard for
  // the menu-item image, which doesn't go through the dish converter).
  const approvedCardImages = approvedImageUrls.map((url, idx) => ({
    imageUrl: url,
    nickname:
      displayDish?.imageNicknames?.[url] ||
      (idx === 0 ? imageProviderNickname : undefined),
    pending: idx === 0 && fallbackImageIsPending,
  }));
  const pendingCardImages = (displayDish?.pendingImages || []).map((p) => ({
    imageUrl: p.imageUrl,
    nickname: p.nickname,
    pending: true,
  }));
  const allCardImages = [...approvedCardImages, ...pendingCardImages];
  const dishImages = allCardImages.map((i) => i.imageUrl);
  const hasMultipleImages = allCardImages.length > 1;
  // Ensure currentImageIndex is within bounds (clamp to valid range)
  const safeImageIndex =
    allCardImages.length > 0
      ? Math.max(0, Math.min(currentImageIndex, allCardImages.length - 1))
      : 0;
  const currentCardImage = allCardImages[safeImageIndex];
  const currentImageUrl = currentCardImage?.imageUrl || imageUrl || '';

  // Show carousel if we have any image (approved or dish-level pending).
  // `isPendingApproval` is a menu-item-level flag — only applies when there are no images at all.
  const hasImage = allCardImages.length > 0;
  const showMenuPendingPlaceholder = !hasImage && isPendingApproval;

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

  // Custom swipe gesture for the card carousel (mobile-friendly nav)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleCardTouchStart = (e: React.TouchEvent) => {
    if (!hasMultipleImages || e.touches.length !== 1) return;
    swipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleCardTouchEnd = (e: React.TouchEvent) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || !hasMultipleImages) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      navigateCarousel(dx < 0 ? 'next' : 'prev');
    }
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
          onTouchStart={handleCardTouchStart}
          onTouchEnd={handleCardTouchEnd}
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
              {/* Overlay on hover (purely visual — parent handles the click) */}
              <div className='pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center'>
                <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                  <div className='bg-black/60 backdrop-blur-sm rounded-full p-2'>
                    <Maximize2 className='h-5 w-5 text-white' />
                  </div>
                </div>
              </div>

              {/* Add-more image pill (only when image already exists) */}
              {onAddMoreImageClick && (
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMoreImageClick();
                  }}
                  className='absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs text-white transition-all opacity-90 hover:opacity-100 cursor-pointer'
                  aria-label={tMenu('addAnotherImage') || 'Add another image'}
                  title={tMenu('addAnotherImage') || 'Add another image'}>
                  <Plus className='h-3.5 w-3.5' />
                  <span>{tMenu('addImage') || 'Add image'}</span>
                </button>
              )}

              {/* Per-image pending badge (top-right) */}
              {currentCardImage?.pending && (
                <div className='absolute top-2 right-2 z-10'>
                  <Badge className='bg-amber-500 text-white text-xs'>
                    <Clock className='h-3 w-3 mr-1' />
                    {tMenu('pendingApproval') || 'Pending'}
                  </Badge>
                </div>
              )}

              {/* Carousel Navigation */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateCarousel('prev');
                    }}
                    className='absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-1.5 transition-all z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer'
                    aria-label='Previous image'>
                    <ChevronLeft className='h-4 w-4 text-white' />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateCarousel('next');
                    }}
                    className='absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-1.5 transition-all z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer'
                    aria-label='Next image'>
                    <ChevronRight className='h-4 w-4 text-white' />
                  </button>

                  {/* Image Counter */}
                  <div className='absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-md px-2 py-0.5 text-xs text-white z-10'>
                    {safeImageIndex + 1}/{allCardImages.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className='absolute inset-0 flex items-center justify-center group-hover:bg-muted/80 transition-colors'>
              <div className='text-center p-4 relative w-full h-full flex flex-col items-center justify-center'>
                {showMenuPendingPlaceholder && (
                  <div className='absolute top-2 right-2 z-10'>
                    <Badge className='bg-amber-500 text-white text-xs'>
                      <Clock className='h-3 w-3 mr-1' />
                      {tMenu('pendingApproval') || 'Pending'}
                    </Badge>
                  </div>
                )}
                <Camera className='h-10 w-10 text-muted-foreground/50 mb-2 group-hover:text-muted-foreground transition-colors' />
                {(onAddImageClick || showDishUpload) &&
                  !showMenuPendingPlaceholder && (
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
                {showMenuPendingPlaceholder && (
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
            <div
              className='flex items-start gap-2 group/copy cursor-pointer'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                navigator.clipboard.writeText(name).then(() => {
                  toast.success(t('dishNameCopied') || 'Copied to clipboard!');
                });
              }}
              title={t('copyToClipboard') || 'Copy to clipboard'}>
              <h3 className='font-semibold text-sm leading-snug line-clamp-2 flex-1'>
                {name}
              </h3>
              <Copy className='h-3.5 w-3.5 text-muted-foreground opacity-100 md:opacity-0 md:group-hover/copy:opacity-100 transition-opacity shrink-0 mt-0.5' />
            </div>

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

            {/* Image Provider (per-image, including pending) */}
            {currentCardImage?.nickname && (
              <p className='text-[11px] text-muted-foreground'>
                {t('imageProvidedBy') || 'Image by'}{' '}
                <span className='font-medium'>
                  {currentCardImage.nickname}
                </span>
                {currentCardImage.pending && (
                  <span className='ml-1 text-amber-600'>
                    · {tMenu('pendingApproval') || 'Pending'}
                  </span>
                )}
              </p>
            )}
            {children}
          </div>

          {/* Vote Buttons and Actions */}
          <div className='mt-3 pt-2 border-t flex flex-row items-center justify-between'>
            {displayDish ? (
              <VoteButtons dish={displayDish} />
            ) : (
              <div className='flex items-center gap-2'>
                <div className='h-7 w-14 bg-muted rounded animate-pulse' />
                <div className='h-7 w-14 bg-muted rounded animate-pulse' />
              </div>
            )}
            <Button
              variant='outline'
              size='icon'
              className='h-9 w-9 text-muted-foreground shrink-0 mt-0 flex'
              asChild>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(name)}`}
                target='_blank'
                rel='noopener noreferrer'
                onClick={(e) => e.stopPropagation()}
                title={t('searchInGoogle') || 'Search in Google'}>
                <FcGoogle className='h-5 w-5' />
              </a>
            </Button>
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
