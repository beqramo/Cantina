'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageViewerProps {
  imageUrl: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({
  imageUrl,
  alt,
  isOpen,
  onClose,
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(5, prev + delta)));
  };

  // Touch/pinch zoom handlers
  const touchStartRef = useRef<{
    distance: number;
    center: { x: number; y: number };
  } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        key={imageUrl}
        className='max-w-[95vw] max-h-[95vh] w-full h-full p-0 gap-0 overflow-hidden bg-black/95 [&>button]:hidden'
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking on the image
          if (e.target === containerRef.current) {
            onClose();
          }
        }}>
        <DialogTitle className='sr-only'>{alt}</DialogTitle>
        <div className='absolute top-4 right-4 z-50 flex gap-2'>
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className='p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            aria-label='Zoom out'>
            <ZoomOut className='h-5 w-5' />
          </button>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 5}
            className='p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            aria-label='Zoom in'>
            <ZoomIn className='h-5 w-5' />
          </button>
          <button
            onClick={resetZoom}
            disabled={scale === 1}
            className='p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            aria-label='Reset zoom'>
            <Maximize2 className='h-5 w-5' />
          </button>
          <button
            onClick={onClose}
            className='p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors'
            aria-label='Close'>
            <X className='h-5 w-5' />
          </button>
        </div>

        <div
          ref={containerRef}
          className='w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing'
          onWheel={handleWheel}
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
              'relative transition-transform duration-200 ease-out',
              scale > 1 && 'cursor-grab active:cursor-grabbing',
            )}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center center',
            }}>
            {!imageLoaded && (
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white'></div>
              </div>
            )}
            <Image
              src={imageUrl}
              alt={alt}
              width={1200}
              height={800}
              className='max-w-[90vw] max-h-[90vh] object-contain'
              onLoad={() => setImageLoaded(true)}
              priority
              unoptimized={imageUrl.startsWith('blob:')}
            />
          </div>
        </div>

        <div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/70 text-sm bg-black/50 px-3 py-1 rounded-full'>
          {Math.round(scale * 100)}% • Double-click to zoom • Scroll to zoom
        </div>
      </DialogContent>
    </Dialog>
  );
}
