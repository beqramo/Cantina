/**
 * Image URL caching hook
 *
 * Caches image URLs in localStorage to prevent redundant Firebase Storage fetches.
 * This is particularly useful for dish images that don't change frequently.
 */

import { useEffect, useState } from 'react';

interface CachedImage {
  url: string;
  timestamp: number;
}

const CACHE_PREFIX = 'img_cache_';
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached image URL from localStorage
 */
function getCachedImage(key: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const data: CachedImage = JSON.parse(cached);
    const now = Date.now();

    // Check if expired
    if (now - data.timestamp > DEFAULT_EXPIRY) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return data.url;
  } catch (error) {
    console.error('[useImageCache] Error reading cache:', error);
    return null;
  }
}

/**
 * Set cached image URL in localStorage
 */
function setCachedImage(key: string, url: string): void {
  if (typeof window === 'undefined') return;

  try {
    const data: CachedImage = {
      url,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch (error) {
    console.error('[useImageCache] Error writing cache:', error);
  }
}

/**
 * Hook to cache image URLs
 *
 * @param key - Unique key for this image (e.g., dish ID)
 * @param fetchUrl - Function to fetch the URL if not cached
 * @returns The cached or fetched image URL
 *
 * @example
 * ```typescript
 * const imageUrl = useImageCache('dish-123', async () => {
 *   return await getImageUrl('dish-123');
 * });
 * ```
 */
export function useImageCache(
  key: string | undefined,
  fetchUrl: () => Promise<string>,
): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!key) return null;
    return getCachedImage(key);
  });

  useEffect(() => {
    if (!key) {
      setUrl(null);
      return;
    }

    // Check cache first
    const cached = getCachedImage(key);
    if (cached) {
      setUrl(cached);
      return;
    }

    // Fetch if not cached
    let isMounted = true;

    fetchUrl()
      .then((fetchedUrl) => {
        if (isMounted) {
          setUrl(fetchedUrl);
          setCachedImage(key, fetchedUrl);
        }
      })
      .catch((error) => {
        console.error('[useImageCache] Error fetching image:', error);
        if (isMounted) {
          setUrl(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [key, fetchUrl]);

  return url;
}

/**
 * Clear all image cache entries
 */
export function clearImageCache(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('[clearImageCache] Error clearing cache:', error);
  }
}
