/**
 * Centralized cache key definitions for SWR Firebase queries
 *
 * Cache keys are used to identify and deduplicate requests.
 * They should be unique and include all parameters that affect the query result.
 */

import { DishCategory, DishTag } from '@/types';

export const CACHE_KEYS = {
  // Dish queries
  DISH_BY_ID: (id: string) => `dish:${id}`,
  DISHES_ALL: 'dishes:all',
  DISHES_SEARCH: (term: string, tags?: DishTag[]) =>
    `dishes:search:${term}:${tags?.join(',') || 'none'}`,
  DISHES_TOP: (category?: DishCategory) => `dishes:top:${category || 'all'}`,
  DISHES_BY_TAGS: (tags: DishTag[]) => `dishes:tags:${tags.join(',')}`,

  // Pending dish requests
  DISH_REQUESTS_PENDING: 'dish-requests:pending',

  // Menu queries
  MENU_BY_DATE: (date: string) => `menu:${date}`,
  MENU_CURRENT: 'menu:current',
  MENU_WEEK: (startDate: string) => `menu:week:${startDate}`,
} as const;

/**
 * Cache TTL (Time To Live) configurations in milliseconds
 */
export const CACHE_TTL = {
  // Minimum TTL - enforced to prevent race conditions
  MIN: 3 * 1000, // 3 seconds

  // Short TTL for frequently changing data
  SHORT: 30 * 1000, // 30 seconds

  // Default TTL for most queries
  DEFAULT: 60 * 1000, // 1 minute

  // Long TTL for stable data
  LONG: 5 * 60 * 1000, // 5 minutes

  // Very long TTL for rarely changing data
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;
