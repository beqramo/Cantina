'use client';

import { useState, useEffect } from 'react';
import {
  getPendingDishRequests,
  approveDishRequest,
  rejectDishRequest,
  getMenusWithPendingImages,
  approveMenuItemImage,
  rejectMenuItemImage,
  getDishesWithPendingImages,
  approvePendingDishImage,
  rejectPendingDishImage,
  getDishById,
} from '@/lib/firestore';
import { MealType, DishCategory, Menu, PendingDishImage, Dish } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Check, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { formatMenuDate } from '@/lib/time';
import { ImageViewer } from '@/components/dish/ImageViewer';

// Component for pending dish request card with carousel
function PendingDishRequestCard({
  dish,
  onApprove,
  onReject,
  onOpenImageViewer,
}: {
  dish: Dish;
  onApprove: (dishId: string) => void;
  onReject: (dishId: string) => void;
  onOpenImageViewer: (dishId: string, imageIndex: number) => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const t = useTranslations('Admin');
  const dishImages = dish.images || (dish.imageUrl ? [dish.imageUrl] : []);
  const hasMultipleImages = dishImages.length > 1;
  const currentImage = dishImages[currentImageIndex];

  return (
    <Card className='overflow-hidden flex flex-col h-full'>
      {currentImage && (
        <div
          className='relative aspect-video w-full overflow-hidden bg-muted cursor-pointer group'
          onClick={() => onOpenImageViewer(dish.id, currentImageIndex)}
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenImageViewer(dish.id, currentImageIndex);
            }
          }}
          aria-label={`View full size image of ${dish.name}`}>
          <Image
            src={currentImage}
            alt={`${dish.name} - Image ${currentImageIndex + 1}`}
            fill
            className='object-cover transition-opacity group-hover:opacity-90'
          />
          {/* Overlay on hover */}
          <div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center'>
            <div className='opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
              <div className='bg-black/60 backdrop-blur-sm rounded-full p-2'>
                <Maximize2 className='h-6 w-6 md:h-8 md:w-8 text-white' />
              </div>
            </div>
          </div>

            {/* Carousel Navigation */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(
                      (prev) =>
                        (prev - 1 + dishImages.length) % dishImages.length,
                    );
                  }}
                  className='absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-1.5 transition-colors z-10'>
                  <ChevronLeft className='h-5 w-5 text-white' />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(
                      (prev) => (prev + 1) % dishImages.length,
                    );
                  }}
                  className='absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-1.5 transition-colors z-10'>
                  <ChevronRight className='h-5 w-5 text-white' />
                </button>

                {/* Image Indicators */}
                <div className='absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10'>
                  {dishImages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentImageIndex
                          ? 'w-6 bg-white'
                          : 'w-2 bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Image Counter */}
                <div className='absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-xs text-white z-10'>
                  {currentImageIndex + 1} / {dishImages.length}
                </div>
              </>
            )}
          </div>
        )}
      <CardContent className='p-4 flex flex-col flex-1'>
        <div className='flex-1 space-y-2 mb-4'>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex-1'>
              <h3 className='font-semibold text-lg'>{dish.name}</h3>
              {dish.nickname && (
                <p className='text-sm text-muted-foreground mt-1'>
                  {t('requestedBy') || 'Requested by'}: {dish.nickname}
                </p>
              )}
              {dish.category && (
                <Badge variant='secondary' className='mt-2'>
                  {dish.category}
                </Badge>
              )}
              {dish.tags && dish.tags.length > 0 && (
                <div className='flex flex-wrap gap-1 mt-2'>
                  {dish.tags.map((tag) => (
                    <Badge key={tag} variant='outline' className='text-xs'>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Badge variant='outline'>{dish.status}</Badge>
          </div>
        </div>
        <div className='flex gap-2'>
          <Button onClick={() => onApprove(dish.id)} className='flex-1' size='sm'>
            <Check className='h-4 w-4 mr-2' />
            {t('approve')}
          </Button>
          <Button
            variant='destructive'
            onClick={() => onReject(dish.id)}
            className='flex-1'
            size='sm'>
            <X className='h-4 w-4 mr-2' />
            {t('reject')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for individual dish image approval card with carousel
function DishImageApprovalCard({
  item,
  onApprove,
  onReject,
  onOpenImageViewer,
}: {
  item: { dish: Dish; pendingImages: PendingDishImage[] };
  onApprove: (dishId: string, imageUrl: string, nickname?: string) => void;
  onReject: (dishId: string, imageUrl: string) => void;
  onOpenImageViewer: (dishId: string, imageIndex: number) => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const t = useTranslations('Admin');
  const tMenu = useTranslations('Menu');
  const hasMultipleImages = item.pendingImages.length > 1;

  // Reset index when images array changes (after approve/reject)
  useEffect(() => {
    if (currentImageIndex >= item.pendingImages.length) {
      setCurrentImageIndex(Math.max(0, item.pendingImages.length - 1));
    }
  }, [item.pendingImages.length, currentImageIndex]);

  const currentImage = item.pendingImages[currentImageIndex];

  // If no current image (all approved/rejected), don't render
  if (!currentImage) {
    return null;
  }

  return (
    <Card className='overflow-hidden flex flex-col h-full'>
      {/* Image Carousel */}
      <div
        className='relative aspect-video w-full overflow-hidden bg-muted cursor-pointer group'
        onClick={() => onOpenImageViewer(item.dish.id, currentImageIndex)}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenImageViewer(item.dish.id, currentImageIndex);
          }
        }}
        aria-label={`View full size image of ${item.dish.name}`}>
        <Image
          src={currentImage.imageUrl}
          alt={`${item.dish.name} - Image ${currentImageIndex + 1}`}
          fill
          className='object-cover transition-opacity group-hover:opacity-90'
        />
        {/* Overlay on hover */}
        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center'>
          <div className='opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
            <div className='bg-black/60 backdrop-blur-sm rounded-full p-2'>
              <Maximize2 className='h-6 w-6 md:h-8 md:w-8 text-white' />
            </div>
          </div>
        </div>

        {/* Carousel Navigation */}
        {hasMultipleImages && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(
                  (prev) =>
                    (prev - 1 + item.pendingImages.length) %
                    item.pendingImages.length,
                );
              }}
              className='absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-1.5 transition-colors z-10'>
              <ChevronLeft className='h-5 w-5 text-white' />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(
                  (prev) => (prev + 1) % item.pendingImages.length,
                );
              }}
              className='absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-1.5 transition-colors z-10'>
              <ChevronRight className='h-5 w-5 text-white' />
            </button>

            {/* Image Indicators */}
            <div className='absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10'>
              {item.pendingImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentImageIndex
                      ? 'w-6 bg-white'
                      : 'w-2 bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>

            {/* Image Counter */}
            <div className='absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 text-xs text-white z-10'>
              {currentImageIndex + 1} / {item.pendingImages.length}
            </div>
          </>
        )}
      </div>
      <CardContent className='p-4 flex flex-col flex-1'>
        <div className='flex-1 space-y-2 mb-4'>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex-1'>
              <h3 className='font-semibold text-lg'>{item.dish.name}</h3>
              {hasMultipleImages && (
                <Badge variant='secondary' className='mt-2'>
                  {item.pendingImages.length} {t('imagesPending')}
                </Badge>
              )}
              {currentImage.nickname && (
                <p className='text-sm text-muted-foreground mt-1'>
                  {t('uploadedBy')}: {currentImage.nickname}
                </p>
              )}
              <Badge variant='outline' className='mt-2'>
                {new Date(currentImage.uploadedAt).toLocaleDateString()}
              </Badge>
            </div>
            <Badge variant='outline' className='bg-yellow-500 text-white'>
              {tMenu('pendingApproval') || 'Pending Approval'}
            </Badge>
          </div>
        </div>
        {/* Action Buttons */}
        <div className='flex gap-2'>
          <Button
            onClick={() =>
              onApprove(
                item.dish.id,
                currentImage.imageUrl,
                currentImage.nickname,
              )
            }
            className='flex-1'
            size='sm'>
            <Check className='h-4 w-4 mr-2' />
            {t('approve')}
          </Button>
          <Button
            variant='destructive'
            onClick={() => onReject(item.dish.id, currentImage.imageUrl)}
            className='flex-1'
            size='sm'>
            <X className='h-4 w-4 mr-2' />
            {t('reject')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApprovalList() {
  const [requests, setRequests] = useState<Dish[]>([]);
  const [menuImages, setMenuImages] = useState<
    Array<{
      menu: Menu;
      mealType: MealType;
      category: DishCategory;
      menuItem: { dishName: string; imageUrl?: string };
    }>
  >([]);
  const [dishImages, setDishImages] = useState<
    Array<{
      dish: Dish;
      pendingImages: PendingDishImage[];
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<{
    dishId: string;
    imageIndex: number;
  } | null>(null);
  const [selectedMenuImage, setSelectedMenuImage] = useState<{
    menuId: string;
    mealType: MealType;
    category: DishCategory;
  } | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const t = useTranslations('Admin');
  const tSearch = useTranslations('Search');
  const tMenu = useTranslations('Menu');

  useEffect(() => {
    loadRequests();
    loadMenuImages();
    loadDishImages();
  }, []);

  const loadRequests = async () => {
    try {
      const pending = await getPendingDishRequests();
      setRequests(pending);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const loadMenuImages = async () => {
    try {
      const pending = await getMenusWithPendingImages();
      setMenuImages(pending);
    } catch (error) {
      console.error('Error loading menu images:', error);
    }
  };

  const loadDishImages = async () => {
    setLoading(true);
    try {
      const pending = await getDishesWithPendingImages();
      // Group by dish ID to show all pending images for each dish
      const grouped = new Map<
        string,
        { dish: Dish; pendingImages: PendingDishImage[] }
      >();

      for (const item of pending) {
        if (!grouped.has(item.dish.id)) {
          // Fetch full dish data to get all pending images
          const fullDish = await getDishById(item.dish.id);
          if (fullDish && fullDish.pendingImages) {
            grouped.set(item.dish.id, {
              dish: fullDish,
              pendingImages: fullDish.pendingImages,
            });
          } else {
            grouped.set(item.dish.id, {
              dish: item.dish,
              pendingImages: [item.pendingImage],
            });
          }
        } else {
          // Add this pending image if not already included
          const existing = grouped.get(item.dish.id)!;
          if (
            !existing.pendingImages.some(
              (img) => img.imageUrl === item.pendingImage.imageUrl,
            )
          ) {
            existing.pendingImages.push(item.pendingImage);
          }
        }
      }

      setDishImages(Array.from(grouped.values()));
    } catch (error) {
      console.error('Error loading dish images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveDishRequest(id);
      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('Are you sure you want to reject this request?')) {
      try {
        await rejectDishRequest(id);
        loadRequests();
      } catch (error) {
        console.error('Error rejecting request:', error);
      }
    }
  };

  const handleApproveMenuImage = async (
    menuId: string,
    mealType: MealType,
    category: DishCategory,
  ) => {
    try {
      await approveMenuItemImage(menuId, mealType, category);
      loadMenuImages();
    } catch (error) {
      console.error('Error approving menu image:', error);
    }
  };

  const handleRejectMenuImage = async (
    menuId: string,
    mealType: MealType,
    category: DishCategory,
  ) => {
    if (confirm('Are you sure you want to reject this image?')) {
      try {
        await rejectMenuItemImage(menuId, mealType, category);
        loadMenuImages();
      } catch (error) {
        console.error('Error rejecting menu image:', error);
      }
    }
  };

  const handleApproveDishImage = async (
    dishId: string,
    imageUrl: string,
    nickname?: string,
  ) => {
    try {
      await approvePendingDishImage(dishId, imageUrl, nickname);
      loadDishImages();
      setSelectedImageIndex(null);
    } catch (error) {
      console.error('Error approving dish image:', error);
    }
  };

  const openImageViewer = (dishId: string, imageIndex: number) => {
    setSelectedImageIndex({ dishId, imageIndex });
    setSelectedMenuImage(null);
    setIsImageViewerOpen(true);
  };

  const openMenuImageViewer = (
    menuId: string,
    mealType: MealType,
    category: DishCategory,
  ) => {
    setSelectedMenuImage({ menuId, mealType, category });
    setSelectedImageIndex(null);
    setIsImageViewerOpen(true);
  };

  const navigateCarousel = (
    dishId: string,
    currentIndex: number,
    direction: 'prev' | 'next',
  ) => {
    // Check if it's a dish request
    const dishRequest = requests.find((d) => d.id === dishId);
    if (dishRequest) {
      const dishImages =
        dishRequest.images ||
        (dishRequest.imageUrl ? [dishRequest.imageUrl] : []);
      const totalImages = dishImages.length;
      const newIndex =
        direction === 'next'
          ? (currentIndex + 1) % totalImages
          : (currentIndex - 1 + totalImages) % totalImages;
      setSelectedImageIndex({ dishId, imageIndex: newIndex });
      return;
    }

    // Check if it's a pending dish image
    const dishItem = dishImages.find((item) => item.dish.id === dishId);
    if (dishItem) {
      const totalImages = dishItem.pendingImages.length;
      const newIndex =
        direction === 'next'
          ? (currentIndex + 1) % totalImages
          : (currentIndex - 1 + totalImages) % totalImages;
      setSelectedImageIndex({ dishId, imageIndex: newIndex });
    }
  };

  const handleRejectDishImage = async (dishId: string, imageUrl: string) => {
    if (confirm('Are you sure you want to reject this image?')) {
      try {
        await rejectPendingDishImage(dishId, imageUrl);
        loadDishImages();
      } catch (error) {
        console.error('Error rejecting dish image:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-64' />
        ))}
      </div>
    );
  }

  const hasRequests = requests.length > 0;
  const hasMenuImages = menuImages.length > 0;
  const hasDishImages = dishImages.length > 0;

  if (!hasRequests && !hasMenuImages && !hasDishImages) {
    return (
      <div className='text-center py-8 text-muted-foreground'>
        {tSearch('noResults')}
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Dish Requests Section */}
      {hasRequests && (
        <div>
          <h2 className='text-2xl font-bold mb-4'>
            {t('pendingRequests') || 'Pending Dish Requests'}
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {requests.map((dish) => (
              <PendingDishRequestCard
                key={dish.id}
                dish={dish}
                onApprove={handleApprove}
                onReject={handleReject}
                onOpenImageViewer={openImageViewer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Menu Image Approvals Section */}
      {hasMenuImages && (
        <div>
          <h2 className='text-2xl font-bold mb-4'>
            {tMenu('pendingMenuImages') || 'Pending Menu Images'}
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {menuImages.map((item, index) => (
              <Card
                key={`${item.menu.id}-${item.mealType}-${item.category}-${index}`}
                className='overflow-hidden flex flex-col h-full'>
                {item.menuItem.imageUrl && (
                  <div
                    className='relative aspect-video w-full overflow-hidden bg-muted cursor-pointer group'
                    onClick={() =>
                      openMenuImageViewer(
                        item.menu.id,
                        item.mealType,
                        item.category,
                      )
                    }
                    role='button'
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openMenuImageViewer(
                          item.menu.id,
                          item.mealType,
                          item.category,
                        );
                      }
                    }}
                    aria-label={`View full size image of ${item.menuItem.dishName}`}>
                    <Image
                      src={item.menuItem.imageUrl}
                      alt={item.menuItem.dishName}
                      fill
                      className='object-cover transition-opacity group-hover:opacity-90'
                    />
                    <div className='absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors'>
                      <div className='opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity'>
                        <div className='bg-black/60 backdrop-blur-sm rounded-full p-2'>
                          <Maximize2 className='h-6 w-6 md:h-8 md:w-8 text-white' />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <CardContent className='p-4 flex flex-col flex-1'>
                  <div className='flex-1 space-y-2 mb-4'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1'>
                        <h3 className='font-semibold text-lg'>{item.menuItem.dishName}</h3>
                        <div className='flex gap-2 mt-2'>
                          <Badge variant='secondary'>{item.category}</Badge>
                          <Badge variant='outline'>
                            {item.mealType === 'lunch'
                              ? tMenu('lunch') || 'Lunch'
                              : tMenu('dinner') || 'Dinner'}
                          </Badge>
                          <Badge variant='outline'>
                            {formatMenuDate(item.menu.date)}
                          </Badge>
                        </div>
                      </div>
                      <Badge
                        variant='outline'
                        className='bg-yellow-500 text-white'>
                        {tMenu('pendingApproval') || 'Pending Approval'}
                      </Badge>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      onClick={() =>
                        handleApproveMenuImage(
                          item.menu.id,
                          item.mealType,
                          item.category,
                        )
                      }
                      className='flex-1'
                      size='sm'>
                      <Check className='h-4 w-4 mr-2' />
                      {t('approve')}
                    </Button>
                    <Button
                      variant='destructive'
                      onClick={() =>
                        handleRejectMenuImage(
                          item.menu.id,
                          item.mealType,
                          item.category,
                        )
                      }
                      className='flex-1'
                      size='sm'>
                      <X className='h-4 w-4 mr-2' />
                      {t('reject')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dish Image Approvals Section */}
      {hasDishImages && (
        <div>
          <h2 className='text-2xl font-bold mb-4'>
            {tMenu('pendingDishImages')}
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {dishImages.map((item, dishIndex) => (
              <DishImageApprovalCard
                key={`${item.dish.id}-${dishIndex}`}
                item={item}
                onApprove={handleApproveDishImage}
                onReject={handleRejectDishImage}
                onOpenImageViewer={openImageViewer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Full Screen Image Viewer */}
      {isImageViewerOpen && (selectedImageIndex || selectedMenuImage) && (
        <ImageViewer
          imageUrl={(() => {
            // Check if it's a menu image
            if (selectedMenuImage) {
              const menuItem = menuImages.find(
                (item) =>
                  item.menu.id === selectedMenuImage.menuId &&
                  item.mealType === selectedMenuImage.mealType &&
                  item.category === selectedMenuImage.category,
              );
              return menuItem?.menuItem.imageUrl || '';
            }

            // Check if it's a dish request (has images array)
            if (selectedImageIndex) {
              const dishRequest = requests.find(
                (d) => d.id === selectedImageIndex.dishId,
              );
              if (dishRequest) {
                const dishImages =
                  dishRequest.images ||
                  (dishRequest.imageUrl ? [dishRequest.imageUrl] : []);
                return dishImages[selectedImageIndex.imageIndex] || '';
              }

              // Check if it's a pending dish image
              const dishImageItem = dishImages.find(
                (item) => item.dish.id === selectedImageIndex.dishId,
              );
              if (dishImageItem) {
                return (
                  dishImageItem.pendingImages[selectedImageIndex.imageIndex]
                    ?.imageUrl || ''
                );
              }
            }

            return '';
          })()}
          alt={(() => {
            if (selectedMenuImage) {
              const menuItem = menuImages.find(
                (item) =>
                  item.menu.id === selectedMenuImage.menuId &&
                  item.mealType === selectedMenuImage.mealType &&
                  item.category === selectedMenuImage.category,
              );
              return menuItem?.menuItem.dishName || '';
            }

            if (selectedImageIndex) {
              const dishRequest = requests.find(
                (d) => d.id === selectedImageIndex.dishId,
              );
              if (dishRequest) return dishRequest.name;

              const dishImageItem = dishImages.find(
                (item) => item.dish.id === selectedImageIndex.dishId,
              );
              if (dishImageItem) return dishImageItem.dish.name;
            }

            return '';
          })()}
          isOpen={isImageViewerOpen}
          onClose={() => {
            setIsImageViewerOpen(false);
            setSelectedImageIndex(null);
            setSelectedMenuImage(null);
          }}
          onPrevious={
            selectedImageIndex
              ? () => {
                  if (selectedImageIndex) {
                    navigateCarousel(
                      selectedImageIndex.dishId,
                      selectedImageIndex.imageIndex,
                      'prev',
                    );
                  }
                }
              : undefined
          }
          onNext={
            selectedImageIndex
              ? () => {
                  if (selectedImageIndex) {
                    navigateCarousel(
                      selectedImageIndex.dishId,
                      selectedImageIndex.imageIndex,
                      'next',
                    );
                  }
                }
              : undefined
          }
          key={
            selectedMenuImage
              ? `menu-${selectedMenuImage.menuId}-${selectedMenuImage.mealType}-${selectedMenuImage.category}`
              : `${selectedImageIndex?.dishId}-${selectedImageIndex?.imageIndex}`
          }
          showNavigation={
            selectedImageIndex
              ? (() => {
                  const dishRequest = requests.find(
                    (d) => d.id === selectedImageIndex.dishId,
                  );
                  if (dishRequest) {
                    const dishImages =
                      dishRequest.images ||
                      (dishRequest.imageUrl ? [dishRequest.imageUrl] : []);
                    return dishImages.length > 1;
                  }

                  const dishImageItem = dishImages.find(
                    (item) => item.dish.id === selectedImageIndex.dishId,
                  );
                  if (dishImageItem) {
                    return dishImageItem.pendingImages.length > 1;
                  }

                  return false;
                })()
              : false
          }
        />
      )}
    </div>
  );
}
