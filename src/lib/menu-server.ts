/**
 * Server-side menu processing utilities
 * Handles menu upload, dish matching, and dish creation using Firebase Admin SDK
 */

import { adminDb } from './firebase-admin';
import { MenuJSON, MenuDayJSON, MenuItems, DishCategory } from '@/types';
import { DISH_CATEGORIES } from '@/lib/constants';
import { parseMenuDate } from '@/lib/time';
import * as admin from 'firebase-admin';

// Helper function to normalize strings for search (same as in firestore.ts)
function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .trim();
}

// Helper function to generate comprehensive search tokens (same as in firestore.ts)
function generateSearchTokens(name: string): string[] {
  const tokens = new Set<string>();

  // Normalize the full name
  const normalized = normalizeSearchTerm(name);

  // Add the full normalized name
  if (normalized.length > 0) {
    tokens.add(normalized);
  }

  // Split into words and add each word
  const words = normalized.split(/\s+/).filter((word) => word.length > 0);

  words.forEach((word) => {
    if (word.length > 0) {
      tokens.add(word);

      // Add word prefixes (for partial matching)
      const minPrefix = word.length <= 4 ? 2 : 3;
      for (let i = minPrefix; i <= word.length; i++) {
        tokens.add(word.substring(0, i));
      }

      // Add word suffixes (for matching end of words)
      if (word.length > 3) {
        for (let i = 1; i <= Math.min(3, word.length - 2); i++) {
          tokens.add(word.substring(i));
        }
      }
    }
  });

  // Add bigrams (pairs of consecutive words)
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    tokens.add(bigram);
    for (let j = 3; j <= bigram.length; j++) {
      tokens.add(bigram.substring(0, j));
    }
  }

  // Add trigrams (three consecutive words) if available
  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    tokens.add(trigram);
  }

  // Add combined word prefixes (first letters of each word)
  if (words.length >= 2) {
    const initials = words.map((w) => w[0]).join('');
    if (initials.length >= 2) {
      tokens.add(initials);
    }
  }

  // Add word combinations without common connectors
  const connectors = new Set([
    'de',
    'com',
    'e',
    'ao',
    'a',
    'à',
    'do',
    'da',
    'dos',
    'das',
    'em',
    'no',
    'na',
  ]);
  const significantWords = words.filter(
    (w) => !connectors.has(w) && w.length > 1,
  );

  // Add each significant word prefix
  significantWords.forEach((word) => {
    for (let i = 2; i <= word.length; i++) {
      tokens.add(word.substring(0, i));
    }
  });

  // Add combinations of significant words
  if (significantWords.length >= 2) {
    for (let i = 0; i < significantWords.length; i++) {
      for (let j = i + 1; j < significantWords.length; j++) {
        tokens.add(`${significantWords[i]} ${significantWords[j]}`);
      }
    }
  }

  // Add original words (before normalization) in lowercase for exact matches with accents
  const originalWords = name
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  originalWords.forEach((word) => {
    if (word.length > 0) {
      tokens.add(word);
      for (let i = 2; i <= word.length; i++) {
        tokens.add(word.substring(0, i));
      }
    }
  });

  // Add the original name lowercase
  const originalLower = name.toLowerCase().trim();
  if (originalLower.length > 0 && originalLower !== normalized) {
    tokens.add(originalLower);
  }

  return Array.from(tokens);
}

// Cache for dishes to avoid repeated queries
let dishesCache: Map<
  string,
  { id: string; name: string; normalized: string }
> | null = null;
let dishesCacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get all dishes with caching to improve performance
 */
async function getAllDishesCached(): Promise<
  Map<string, { id: string; name: string; normalized: string }>
> {
  const now = Date.now();

  // Return cached dishes if still valid
  if (dishesCache && now - dishesCacheTimestamp < CACHE_TTL) {
    return dishesCache;
  }

  // Fetch all dishes
  const dishesSnapshot = await adminDb
    .collection('dishes')
    .where('status', '==', 'approved')
    .get();

  // Build cache map
  dishesCache = new Map();
  for (const doc of dishesSnapshot.docs) {
    const data = doc.data();
    const dishName = data.name || '';
    const normalized = normalizeSearchTerm(dishName);
    dishesCache.set(doc.id, {
      id: doc.id,
      name: dishName,
      normalized,
    });
  }

  dishesCacheTimestamp = now;
  return dishesCache;
}

/**
 * Match a dish by name (normalized comparison) using Admin SDK with caching
 * Returns dish ID if found, null otherwise
 */
export async function matchDishByNameServer(
  name: string,
): Promise<{ id: string; name: string } | null> {
  if (!name.trim()) return null;

  const normalizedInput = normalizeSearchTerm(name);
  const dishesMap = await getAllDishesCached();

  // First try exact match
  for (const dish of dishesMap.values()) {
    if (dish.normalized === normalizedInput) {
      return { id: dish.id, name: dish.name };
    }
  }

  // If no exact match, try partial match (contains)
  for (const dish of dishesMap.values()) {
    if (
      dish.normalized.includes(normalizedInput) ||
      normalizedInput.includes(dish.normalized)
    ) {
      return { id: dish.id, name: dish.name };
    }
  }

  return null;
}

/**
 * Create a dish record from menu item (without image) using Admin SDK
 * Includes all necessary fields like nameTokens for searchability
 */
export async function createDishFromMenuItemServer(
  name: string,
  category: DishCategory,
): Promise<string> {
  const now = admin.firestore.Timestamp.now();
  const nameTokens = generateSearchTokens(name);

  // Create dish document - conditionally include images field only if it has values
  const dishDoc: Record<string, unknown> = {
    name: name.trim(),
    nameTokens,
    imageUrl: '', // Empty string for dishes without images
    category: category || null,
    tags: [],
    status: 'approved',
    requestedBy: null,
    nickname: null,
    imageProviderNickname: null,
    thumbsUp: 0,
    thumbsDown: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Only include images field if there are images (don't set to undefined)
  // Since we're creating without images, we don't include the field at all

  const docRef = await adminDb.collection('dishes').add(dishDoc);
  return docRef.id;
}

/**
 * Process menu items for a single meal (lunch or dinner) using Admin SDK
 * Matches dishes or creates new ones
 */
async function processMealItemsServer(mealItems: {
  'Sugestão do Chefe': string;
  'Dieta Mediterrânica': string;
  Alternativa: string;
  Vegetariana: string;
  Sopa?: string; // Optional soup name
}): Promise<MenuItems> {
  const processedItems: MenuItems = {
    'Sugestão do Chefe': { dishName: '' },
    'Dieta Mediterrânica': { dishName: '' },
    Alternativa: { dishName: '' },
    Vegetariana: { dishName: '' },
  };

  for (const category of DISH_CATEGORIES) {
    const dishName = mealItems[category];
    if (!dishName || !dishName.trim()) {
      continue; // Skip empty items
    }

    // Try to match existing dish
    const match = await matchDishByNameServer(dishName);

    if (match) {
      // Dish exists, link it
      processedItems[category] = {
        dishId: match.id,
        dishName: match.name, // Use the matched name (might be slightly different)
      };
    } else {
      // Dish doesn't exist, create it
      const dishId = await createDishFromMenuItemServer(dishName, category);
      processedItems[category] = {
        dishId,
        dishName,
      };
    }
  }

  // Process soup (optional, not a dish category)
  if (mealItems.Sopa && mealItems.Sopa.trim()) {
    processedItems.Sopa = {
      dishName: mealItems.Sopa.trim(),
      // No dishId for soup as it's not linked to a dish
    };
  }

  return processedItems;
}

/**
 * Process menu JSON upload server-side using Admin SDK
 * Supports both single day object and array of days
 * Dinner is optional on any day
 */
export async function processMenuUploadServer(
  menuData: MenuJSON,
): Promise<Array<{ date: Date; lunch: MenuItems; dinner?: MenuItems }>> {
  const processedMenus: Array<{
    date: Date;
    lunch: MenuItems;
    dinner?: MenuItems;
  }> = [];

  // Normalize to array format
  const menuArray: MenuDayJSON[] = Array.isArray(menuData)
    ? menuData
    : [menuData];

  for (const menuDay of menuArray) {
    // Validate date format (DD/MM/YYYY)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(menuDay.date)) {
      console.warn(`Invalid date format: ${menuDay.date}. Expected DD/MM/YYYY`);
      continue;
    }

    // Convert date string to Date object
    const date = parseMenuDate(menuDay.date);

    // Process lunch items (always required)
    // Handle both "soup" and "Sopa" field names for backward compatibility
    const lunchSoup =
      (menuDay.lunch as Record<string, unknown>).Sopa ||
      (menuDay.lunch as Record<string, unknown>).soup ||
      undefined;
    const lunchSoupStr = typeof lunchSoup === 'string' ? lunchSoup : undefined;
    const lunchItems = await processMealItemsServer({
      'Sugestão do Chefe': menuDay.lunch['Sugestão do Chefe'],
      'Dieta Mediterrânica': menuDay.lunch['Dieta Mediterrânica'],
      Alternativa: menuDay.lunch.Alternativa,
      Vegetariana: menuDay.lunch.Vegetariana,
      Sopa: lunchSoupStr,
    });

    // Process dinner items (optional on any day)
    // Only process dinner if at least one field has content
    let dinnerItems: MenuItems | undefined;
    if (menuDay.dinner) {
      // Handle both "soup" and "Sopa" field names for backward compatibility
      const dinnerSoup =
        (menuDay.dinner as Record<string, unknown>).Sopa ||
        (menuDay.dinner as Record<string, unknown>).soup ||
        undefined;
      const dinnerSoupStr =
        typeof dinnerSoup === 'string' ? dinnerSoup : undefined;
      const hasDinnerData =
        DISH_CATEGORIES.some((category) => menuDay.dinner![category]?.trim()) ||
        (dinnerSoupStr && dinnerSoupStr.trim());
      if (hasDinnerData) {
        dinnerItems = await processMealItemsServer({
          'Sugestão do Chefe': menuDay.dinner['Sugestão do Chefe'],
          'Dieta Mediterrânica': menuDay.dinner['Dieta Mediterrânica'],
          Alternativa: menuDay.dinner.Alternativa,
          Vegetariana: menuDay.dinner.Vegetariana,
          Sopa: dinnerSoupStr,
        });
        // Verify that processed dinner has at least one dish
        const hasProcessedDishes =
          DISH_CATEGORIES.some((category) =>
            dinnerItems![category]?.dishName?.trim(),
          ) ||
          (dinnerItems.Sopa && dinnerItems.Sopa.dishName?.trim());
        if (!hasProcessedDishes) {
          dinnerItems = undefined; // Don't include empty dinner
        }
      }
    }

    processedMenus.push({
      date,
      lunch: lunchItems,
      dinner: dinnerItems,
    });
  }

  return processedMenus;
}

/**
 * Create a menu using Admin SDK
 */
export async function createMenuServer(
  date: Date,
  lunch: MenuItems,
  dinner?: MenuItems,
): Promise<string> {
  const now = admin.firestore.Timestamp.now();
  // Normalize date to start of day (00:00:00) in UTC for consistent comparison
  const normalizedDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dateTimestamp = admin.firestore.Timestamp.fromDate(normalizedDate);

  const menuData: {
    date: admin.firestore.Timestamp;
    lunch: MenuItems;
    dinner?: MenuItems;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
  } = {
    date: dateTimestamp,
    lunch,
    createdAt: now,
    updatedAt: now,
  };

  // Only add dinner if provided (dinner is optional on any day)
  if (dinner) {
    menuData.dinner = dinner;
  }

  const docRef = await adminDb.collection('menus').add(menuData);
  return docRef.id;
}

/**
 * Update a menu using Admin SDK
 */
export async function updateMenuServer(
  menuId: string,
  updates: {
    lunch?: MenuItems;
    dinner?: MenuItems | null; // null to remove dinner
  },
): Promise<void> {
  const updateData: {
    lunch?: MenuItems;
    dinner?: MenuItems | null;
    updatedAt: admin.firestore.Timestamp;
  } = {
    ...updates,
    updatedAt: admin.firestore.Timestamp.now(),
  };

  // If dinner is explicitly set to null, remove it from Firestore
  if (updates.dinner === null) {
    updateData.dinner = null;
  }

  await adminDb.collection('menus').doc(menuId).update(updateData);
}

/**
 * Get menu by date using Admin SDK
 */
export async function getMenuByDateServer(date: Date): Promise<{
  id: string;
  date: Date;
  lunch: MenuItems;
  dinner?: MenuItems;
} | null> {
  // Normalize date to start of day (00:00:00) in UTC
  const startOfDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  // Start of next day (exclusive upper bound)
  const startOfNextDay = new Date(startOfDay);
  startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);

  const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay);
  const endTimestamp = admin.firestore.Timestamp.fromDate(startOfNextDay);

  // Query for dates >= start of day AND < start of next day
  const snapshot = await adminDb
    .collection('menus')
    .where('date', '>=', startTimestamp)
    .where('date', '<', endTimestamp)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  const menuDate =
    (data.date as admin.firestore.Timestamp)?.toDate() || new Date();

  return {
    id: doc.id,
    date: menuDate,
    lunch: data.lunch as MenuItems,
    dinner: data.dinner as MenuItems | undefined,
  };
}
