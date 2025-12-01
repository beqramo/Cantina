'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  startTransition,
} from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageViewerProps {
  imageUrl: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  showNavigation?: boolean;
}

export function ImageViewer({
  imageUrl,
  alt,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  showNavigation = false,
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((prev) => Math.max(0.5, Math.min(5, prev + delta)));
  }, []);

  // Prevent browser zoom when dialog is open
  useEffect(() => {
    if (!isOpen) return;

    // Store original viewport meta content
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalContent = viewport?.getAttribute('content') || '';

    // Disable browser zoom
    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
      );
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      } else if (showNavigation && onPrevious && e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrevious();
      } else if (showNavigation && onNext && e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      }
    };

    // Prevent touch gestures that trigger browser zoom
    let lastTouchTime = 0;

    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      const timeSinceLastTouch = now - lastTouchTime;
      if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
        e.preventDefault();
      }
      lastTouchTime = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('touchend', preventDoubleTapZoom, {
      passive: false,
    });

    // Add wheel event listener with passive: false to allow preventDefault
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('touchend', preventDoubleTapZoom);
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      // Restore original viewport settings
      if (viewport && originalContent) {
        viewport.setAttribute('content', originalContent);
      }
    };
  }, [isOpen, onClose, showNavigation, onPrevious, onNext, handleWheel]);

  // Touch/pinch zoom handlers
  const touchStartRef = useRef<{
    distance: number;
    center: { x: number; y: number };
  } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent browser zoom when handling touch events
    if (e.touches.length > 1) {
      e.preventDefault();
    }

    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      );
      const center = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
      touchStartRef.current = {
        distance,
        center,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent browser zoom when handling touch events
    if (e.touches.length > 1) {
      e.preventDefault();
    }

    if (e.touches.length === 2 && touchStartRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY,
      );
      const scaleChange = distance / touchStartRef.current.distance;
      const newScale = Math.max(0.5, Math.min(5, scale * scaleChange));
      setScale(newScale);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    setIsDragging(false);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1 && e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double click to zoom
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2);
    } else {
      resetZoom();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Reset state when dialog opens
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
    }
    if (!open) {
      onClose();
    }
  };

  // Reset zoom when image changes
  useEffect(() => {
    if (isOpen) {
      startTransition(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setImageLoaded(false);
      });
    }
  }, [imageUrl, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        key={imageUrl}
        className='fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] sm:w-[calc(100vw-4rem)] sm:h-[calc(100vh-4rem)] max-w-none p-0 gap-0 overflow-hidden bg-black/95 border-0 rounded-lg [&>button]:hidden'
        style={{ touchAction: 'none' }}
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking on the image
          if (e.target === containerRef.current) {
            onClose();
          }
        }}>
        <DialogTitle className='sr-only'>{alt}</DialogTitle>

        {/* Top Controls Bar */}
        <div className='absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent'>
          {/* Zoom indicator */}
          <div className='text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full'>
            {Math.round(scale * 100)}%
          </div>

          {/* Control buttons */}
          <div className='flex gap-1.5'>
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className='p-2 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
              aria-label='Zoom out'>
              <ZoomOut className='h-4 w-4' />
            </button>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 5}
              className='p-2 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
              aria-label='Zoom in'>
              <ZoomIn className='h-4 w-4' />
            </button>
            <button
              onClick={resetZoom}
              disabled={scale === 1 && position.x === 0 && position.y === 0}
              className='p-2 rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
              aria-label='Reset zoom'>
              <RotateCcw className='h-4 w-4' />
            </button>
            <button
              onClick={onClose}
              className='p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors ml-2'
              aria-label='Close'>
              <X className='h-4 w-4' />
            </button>
          </div>
        </div>

        {/* Navigation Buttons */}
        {showNavigation && onPrevious && onNext && (
          <>
            <button
              onClick={onPrevious}
              className='absolute left-3 top-1/2 -translate-y-1/2 z-50 p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors'
              aria-label='Previous image'>
              <ChevronLeft className='h-5 w-5' />
            </button>
            <button
              onClick={onNext}
              className='absolute right-3 top-1/2 -translate-y-1/2 z-50 p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors'
              aria-label='Next image'>
              <ChevronRight className='h-5 w-5' />
            </button>
          </>
        )}

        {/* Image Container */}
        <div
          ref={containerRef}
          className='w-full h-full flex items-center justify-center overflow-hidden'
          style={{ touchAction: 'none' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}>
          <div
            ref={imageRef}
            className={cn(
              'relative transition-transform duration-150 ease-out will-change-transform',
              scale > 1
                ? 'cursor-grab active:cursor-grabbing'
                : 'cursor-zoom-in',
              isDragging && 'transition-none',
            )}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
            }}>
            {/* Loading spinner */}
            {!imageLoaded && (
              <div className='absolute inset-0 flex items-center justify-center min-w-[200px] min-h-[200px]'>
                <div className='animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white'></div>
              </div>
            )}
            <Image
              src={imageUrl}
              alt={alt}
              width={1200}
              height={900}
              className={cn(
                'max-w-[85vw] max-h-[80vh] w-auto h-auto object-contain select-none',
                !imageLoaded && 'opacity-0',
                imageLoaded && 'opacity-100',
              )}
              style={{
                transition: 'opacity 0.2s ease-in-out',
              }}
              onLoad={() => setImageLoaded(true)}
              priority
              unoptimized={imageUrl.startsWith('blob:')}
              draggable={false}
            />
          </div>
        </div>

        {/* Bottom hint */}
        <div className='absolute bottom-0 left-0 right-0 z-50 flex justify-center p-3 bg-gradient-to-t from-black/60 to-transparent'>
          <div className='text-white/60 text-xs'>
            Double-click to zoom • Scroll to adjust
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
