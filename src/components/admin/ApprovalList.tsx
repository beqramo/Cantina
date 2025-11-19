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
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div>
            <CardTitle>{dish.name}</CardTitle>
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
      </CardHeader>
      <CardContent>
        {currentImage && (
          <div className='relative w-full h-64 mb-4 rounded-md overflow-hidden bg-muted'>
            <Image
              src={currentImage}
              alt={`${dish.name} - Image ${currentImageIndex + 1}`}
              fill
              className='object-cover cursor-pointer'
              onClick={() => onOpenImageViewer(dish.id, currentImageIndex)}
            />
            {/* Full screen button */}
            <button
              onClick={() => onOpenImageViewer(dish.id, currentImageIndex)}
              className='absolute top-2 right-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-2 transition-colors z-10'>
              <Maximize2 className='h-4 w-4 text-white' />
            </button>

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
        <div className='flex gap-2'>
          <Button onClick={() => onApprove(dish.id)} className='flex-1'>
            <Check className='h-4 w-4 mr-2' />
            {t('approve')}
          </Button>
          <Button
            variant='destructive'
            onClick={() => onReject(dish.id)}
            className='flex-1'>
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
  const currentImage = item.pendingImages[currentImageIndex];

  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div>
            <CardTitle>{item.dish.name}</CardTitle>
            {hasMultipleImages && (
              <Badge variant='secondary' className='mt-2'>
                {item.pendingImages.length}{' '}
                {t('imagesPending') || 'images pending'}
              </Badge>
            )}
            {currentImage.nickname && (
              <p className='text-sm text-muted-foreground mt-1'>
                {t('uploadedBy') || 'Uploaded by'}: {currentImage.nickname}
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
      </CardHeader>
      <CardContent>
        {/* Image Carousel */}
        <div className='relative w-full mb-4'>
          <div className='relative w-full h-64 rounded-md overflow-hidden bg-muted'>
            <Image
              src={currentImage.imageUrl}
              alt={`${item.dish.name} - Image ${currentImageIndex + 1}`}
              fill
              className='object-cover cursor-pointer'
              onClick={() => onOpenImageViewer(item.dish.id, currentImageIndex)}
            />
            {/* Full screen button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenImageViewer(item.dish.id, currentImageIndex);
              }}
              className='absolute top-2 right-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full p-2 transition-colors z-10'
              aria-label='View full screen'>
              <Maximize2 className='h-4 w-4 text-white' />
            </button>

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
            className='flex-1'>
            <Check className='h-4 w-4 mr-2' />
            {t('approve')}
          </Button>
          <Button
            variant='destructive'
            onClick={() => onReject(item.dish.id, currentImage.imageUrl)}
            className='flex-1'>
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
      <div className='space-y-4'>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-32' />
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
          <div className='space-y-4'>
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
          <div className='space-y-4'>
            {menuImages.map((item, index) => (
              <Card
                key={`${item.menu.id}-${item.mealType}-${item.category}-${index}`}>
                <CardHeader>
                  <div className='flex items-start justify-between'>
                    <div>
                      <CardTitle>{item.menuItem.dishName}</CardTitle>
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
                </CardHeader>
                <CardContent>
                  {item.menuItem.imageUrl && (
                    <div className='relative w-full h-48 mb-4 rounded-md overflow-hidden'>
                      <Image
                        src={item.menuItem.imageUrl}
                        alt={item.menuItem.dishName}
                        fill
                        className='object-cover'
                      />
                    </div>
                  )}
                  <div className='flex gap-2'>
                    <Button
                      onClick={() =>
                        handleApproveMenuImage(
                          item.menu.id,
                          item.mealType,
                          item.category,
                        )
                      }
                      className='flex-1'>
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
                      className='flex-1'>
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
            {tMenu('pendingDishImages') || 'Pending Dish Images'}
          </h2>
          <div className='space-y-4'>
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
      {isImageViewerOpen && selectedImageIndex && (
        <ImageViewer
          imageUrl={(() => {
            // Check if it's a dish request (has images array)
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

            return '';
          })()}
          alt={(() => {
            const dishRequest = requests.find(
              (d) => d.id === selectedImageIndex.dishId,
            );
            if (dishRequest) return dishRequest.name;

            const dishImageItem = dishImages.find(
              (item) => item.dish.id === selectedImageIndex.dishId,
            );
            if (dishImageItem) return dishImageItem.dish.name;

            return '';
          })()}
          isOpen={isImageViewerOpen}
          onClose={() => {
            setIsImageViewerOpen(false);
            setSelectedImageIndex(null);
          }}
          onPrevious={() => {
            if (selectedImageIndex) {
              navigateCarousel(
                selectedImageIndex.dishId,
                selectedImageIndex.imageIndex,
                'prev',
              );
            }
          }}
          onNext={() => {
            if (selectedImageIndex) {
              navigateCarousel(
                selectedImageIndex.dishId,
                selectedImageIndex.imageIndex,
                'next',
              );
            }
          }}
          key={`${selectedImageIndex.dishId}-${selectedImageIndex.imageIndex}`}
          showNavigation={(() => {
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
          })()}
        />
      )}
    </div>
  );
}
