/**
 * SWR Firebase Wrapper for Cantina App
 *
 * A simplified SWR wrapper for Firebase data fetching with automatic caching,
 * TTL enforcement, and error handling.
 *
 * @example
 * ```typescript
 * // Fetch with custom fetcher
 * const { data, error, isLoading } = useSWRFirebase({
 *   cacheKey: CACHE_KEYS.DISHES_TOP('all'),
 *   fetcher: () => getTopDishes(10),
 *   ttl: CACHE_TTL.LONG,
 * });
 * ```
 */

import { useCallback, useRef, useEffect } from 'react';
import useSWR, { SWRConfiguration } from 'swr';
import { CACHE_TTL } from '@/lib/cache-keys';

const STORAGE_PREFIX = 'cantina_swr_';

/**
 * Helper to save data to localStorage with a timestamp
 */
function saveToStorage(key: string, data: any, timestamp: number) {
  if (typeof window === 'undefined') return;
  try {
    // Avoid saving large blobs or recursive structures if possible
    localStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ data, timestamp }),
    );
  } catch (e) {
    console.warn('[useSWRFirebase] Storage save failed:', e);
  }
}

/**
 * ISO Date regex for identifying Date strings in JSON
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

/**
 * JSON reviver to restore Date objects
 */
const dateReviver = (_key: string, value: any) => {
  if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
    return new Date(value);
  }
  return value;
};

/**
 * Helper to load data from localStorage
 */
function loadFromStorage(key: string, ttl: number) {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    if (!item) return null;

    const { data, timestamp } = JSON.parse(item, dateReviver);
    if (Date.now() - timestamp < ttl) {
      return { data, timestamp };
    }

    // Clean up expired item
    localStorage.removeItem(STORAGE_PREFIX + key);
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Global fetch registry to ensure "Hard TTL" across all components.
 * This registry persists outside the React lifecycle, ensuring that even if
 * a component unmounts and remounts, or multiple components request the same
 * key, the actual Firebase fetcher only runs once per TTL.
 */
const fetchRegistry = new Map<
  string,
  {
    promise: Promise<any>;
    timestamp: number;
    data: any;
  }
>();

/**
 * Options for useSWRFirebase hook
 */
export interface UseSWRFirebaseOptions<T> {
  /**
   * Cache key for SWR
   */
  cacheKey: string | null;

  /**
   * Fetcher function that returns the data
   */
  fetcher: () => Promise<T>;

  /**
   * Time to live in milliseconds
   * Minimum is 3 seconds (enforced to prevent race conditions)
   * Default is 60 seconds
   */
  ttl?: number;

  /**
   * Whether the query is enabled
   * If false, SWR will not fetch data
   */
  enabled?: boolean;

  /**
   * SWR configuration options
   * Merged with default SWR config
   */
  swrConfig?: SWRConfiguration<T>;
}

/**
 * Response from useSWRFirebase hook
 */
export interface UseSWRFirebaseResponse<T> {
  /** The fetched data */
  data: T | undefined;
  /** Error if fetch failed */
  error: Error | undefined;
  /** Whether data is currently loading (initial load) */
  isLoading: boolean;
  /** Whether data is being revalidated (background refresh) */
  isValidating: boolean;
  /** Manually trigger a revalidation (bypasses TTL) */
  mutate: (data?: T | Promise<T>, options?: any) => Promise<T | undefined>;
}

/**
 * Enforce minimum TTL to prevent race conditions
 */
function enforceMinTTL(ttl?: number): number {
  if (!ttl) return CACHE_TTL.DEFAULT;
  return Math.max(ttl, CACHE_TTL.MIN);
}

/**
 * SWR Firebase wrapper hook
 *
 * Provides a React hook for fetching Firebase data with automatic caching
 * and TTL enforcement.
 *
 * @param options - Configuration options for the Firebase query
 * @returns SWR response with data, error, and loading states
 */
export function useSWRFirebase<T>(
  options: UseSWRFirebaseOptions<T>,
): UseSWRFirebaseResponse<T> {
  const { cacheKey, fetcher, ttl, enabled = true, swrConfig } = options;

  // Enforce minimum TTL
  const enforcedTTL = enforceMinTTL(ttl);

  // Track previous error to avoid logging the same error multiple times
  const prevErrorRef = useRef<Error | null>(null);

  /**
   * Hard TTL fetcher wrapper
   *
   * This logic ensures that no matter how many times SWR calls this fetcher,
   * we only execute the actual 'fetcher' function once per TTL interval.
   */
  const hardTTLFetcher = useCallback(async () => {
    if (!cacheKey) return undefined as any;

    const now = Date.now();
    const existing = fetchRegistry.get(cacheKey);

    // 1. Check in-memory registry first
    if (existing && now - existing.timestamp < enforcedTTL) {
      return existing.promise;
    }

    // 2. Check localStorage if memory is empty or expired
    const stored = loadFromStorage(cacheKey, enforcedTTL);
    if (stored) {
      const storedPromise = Promise.resolve(stored.data);
      fetchRegistry.set(cacheKey, {
        promise: storedPromise,
        timestamp: stored.timestamp,
        data: stored.data,
      });
      return storedPromise;
    }

    // 3. Otherwise, execute a new fetch
    let resolvePromise: (value: T) => void = () => {};
    let rejectPromise: (reason?: any) => void = () => {};

    const fetchPromise = new Promise<T>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    // Execute the actual fetcher
    (async () => {
      try {
        const result = await fetcher();
        const currentNow = Date.now();

        // Update registry with data
        const current = fetchRegistry.get(cacheKey);
        if (current && current.promise === fetchPromise) {
          current.data = result;
        }

        // Persist to localStorage
        saveToStorage(cacheKey, result, currentNow);

        resolvePromise(result);
      } catch (error) {
        // Remove from registry on error so we can retry
        fetchRegistry.delete(cacheKey);
        rejectPromise(error);
      }
    })();

    // Store the pending promise in registry
    fetchRegistry.set(cacheKey, {
      promise: fetchPromise,
      timestamp: now,
      data: undefined,
    });

    return fetchPromise;
  }, [fetcher, cacheKey, enforcedTTL]);

  // SWR configuration with TTL
  const finalSwrConfig: SWRConfiguration<T> = {
    dedupingInterval: enforcedTTL,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    revalidateOnMount: undefined,
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    ...swrConfig,
  };

  // Use SWR hook
  const { data, error, isValidating, mutate } = useSWR<T, Error>(
    enabled ? cacheKey : null,
    hardTTLFetcher,
    finalSwrConfig,
  );

  // Enhanced mutate that clears the hard TTL cache
  const enhancedMutate = useCallback(
    (newData?: T | Promise<T>, options?: any) => {
      if (cacheKey) {
        fetchRegistry.delete(cacheKey);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_PREFIX + cacheKey);
        }
      }
      return mutate(newData, options);
    },
    [mutate, cacheKey],
  );

  // Log errors when they occur
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      prevErrorRef.current = error;
      console.error('[useSWRFirebase] Error:', {
        cacheKey,
        error: error.message,
      });
    } else if (!error) {
      prevErrorRef.current = null;
    }
  }, [error, cacheKey]);

  return {
    data,
    error,
    isLoading: !data && !error && isValidating,
    isValidating,
    mutate: enhancedMutate,
  };
}
