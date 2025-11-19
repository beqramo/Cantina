import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
  getDoc,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import {
  Dish,
  DishCategory,
  DishTag,
  DishStatus,
  Menu,
  MenuItems,
  MealType,
  PendingDishImage,
} from '@/types';
import { DocumentData } from 'firebase/firestore';

// Helper function to convert Firestore document data to Dish object
function firestoreDataToDish(docId: string, data: DocumentData): Dish {
  const pendingImages = (data.pendingImages || []).map(
    (img: {
      imageUrl: string;
      uploadedAt?: Timestamp;
      deviceId: string;
      nickname?: string;
    }) => ({
      imageUrl: img.imageUrl,
      uploadedAt: img.uploadedAt?.toDate() || new Date(),
      deviceId: img.deviceId,
      nickname: img.nickname,
    }),
  );

  // Handle images array - use first image as primary, fallback to imageUrl
  const images = data.images || (data.imageUrl ? [data.imageUrl] : []);
  const primaryImageUrl = images[0] || data.imageUrl || '';

  return {
    id: docId,
    name: data.name,
    imageUrl: primaryImageUrl,
    images: images.length > 0 ? images : undefined,
    category: data.category,
    tags: data.tags || [],
    status: (data.status || 'approved') as DishStatus, // Default to 'approved' for backward compatibility
    requestedBy: data.requestedBy,
    nickname: data.nickname,
    imageProviderNickname: data.imageProviderNickname,
    pendingImages: pendingImages.length > 0 ? pendingImages : undefined,
    thumbsUp: data.thumbsUp || 0,
    thumbsDown: data.thumbsDown || 0,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

// Helper function to normalize strings for search (remove accents, lowercase)
// Handles Portuguese characters: á, à, â, ã, é, ê, í, ó, ô, õ, ú, ü, ç
function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .trim();
}

// Helper function to generate comprehensive search tokens
// Creates multiple variations for flexible Portuguese search
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
      // For words longer than 3 characters, add prefixes starting from 3 chars
      if (word.length > 3) {
        for (let i = 3; i <= word.length; i++) {
          const prefix = word.substring(0, i);
          if (prefix.length >= 3) {
            tokens.add(prefix);
          }
        }
      }
    }
  });

  // Also add original words (before normalization) in lowercase for exact matches
  const originalWords = name
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  originalWords.forEach((word) => {
    if (word.length > 0) {
      tokens.add(word);
    }
  });

  return Array.from(tokens);
}

// Dishes operations
export async function searchDishes(
  searchTerm: string,
  tags?: DishTag[],
): Promise<Dish[]> {
  if (!db || !searchTerm.trim()) return [];

  try {
    const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
    const dishesRef = collection(db, 'dishes');
    const dishes: Dish[] = [];
    const seenIds = new Set<string>();

    // Generate search tokens from the search term
    const searchTokens = generateSearchTokens(searchTerm);

    // Filter to only meaningful tokens (at least 2 characters, max 10 for Firestore limit)
    const meaningfulTokens = searchTokens
      .filter((token) => token.length >= 2)
      .slice(0, 10); // Firestore array-contains-any limit is 10 items

    if (meaningfulTokens.length > 0) {
      try {
        // Use array-contains-any to find dishes with any matching token
        const tokensQuery = query(
          dishesRef,
          where('nameTokens', 'array-contains-any', meaningfulTokens),
          limit(100), // Get more results, we'll filter and sort client-side
        );

        const tokensSnapshot = await getDocs(tokensQuery);
        tokensSnapshot.forEach((doc) => {
          if (seenIds.has(doc.id)) return;
          seenIds.add(doc.id);

          const data = doc.data();
          const dishName = data.name || '';
          const dishTags = data.tags || [];
          const dishNameNormalized = normalizeSearchTerm(dishName);

          // Verify the dish name actually contains the search term
          // This ensures we match the full search term, not just individual tokens
          if (!dishNameNormalized.includes(normalizedSearchTerm)) return;

          // Filter by tags if provided
          if (tags && tags.length > 0) {
            const hasAllTags = tags.every((tag) => dishTags.includes(tag));
            if (!hasAllTags) return;
          }

          const dish = firestoreDataToDish(doc.id, data);
          // Only include approved dishes in search results
          if (dish.status === 'approved') {
            dishes.push(dish);
          }
        });
      } catch (error) {
        // If nameTokens field doesn't exist, fall back to name field prefix query
        console.warn('nameTokens query failed, trying name prefix:', error);

        // Fallback: Use name field with prefix query
        try {
          const namePrefixQuery = query(
            dishesRef,
            where('name', '>=', normalizedSearchTerm),
            where('name', '<=', normalizedSearchTerm + '\uf8ff'),
            orderBy('name'),
            limit(100),
          );

          const nameSnapshot = await getDocs(namePrefixQuery);
          nameSnapshot.forEach((doc) => {
            if (seenIds.has(doc.id)) return;
            seenIds.add(doc.id);

            const data = doc.data();
            const dishName = data.name || '';
            const dishTags = data.tags || [];
            const dishNameNormalized = normalizeSearchTerm(dishName);

            // Verify the dish name actually contains the search term (case-insensitive)
            if (!dishNameNormalized.includes(normalizedSearchTerm)) return;

            // Filter by tags if provided
            if (tags && tags.length > 0) {
              const hasAllTags = tags.every((tag) => dishTags.includes(tag));
              if (!hasAllTags) return;
            }

            const dish = firestoreDataToDish(doc.id, data);
            // Only include approved dishes in search results
            if (dish.status === 'approved') {
              dishes.push(dish);
            }
          });
        } catch (fallbackError) {
          console.warn('Fallback name query also failed:', fallbackError);
        }
      }
    }

    // Sort results: exact matches first, then prefix matches, then contains matches
    dishes.sort((a, b) => {
      const aName = normalizeSearchTerm(a.name);
      const bName = normalizeSearchTerm(b.name);
      const search = normalizedSearchTerm;

      // Exact match gets highest priority
      if (aName === search && bName !== search) return -1;
      if (bName === search && aName !== search) return 1;

      // Prefix match gets second priority
      const aStartsWith = aName.startsWith(search);
      const bStartsWith = bName.startsWith(search);
      if (aStartsWith && !bStartsWith) return -1;
      if (bStartsWith && !aStartsWith) return 1;

      // Then sort alphabetically
      return aName.localeCompare(bName);
    });

    // Limit to maximum 30 dishes
    return dishes.slice(0, 30);
  } catch (error) {
    console.error('Error searching dishes:', error);
    return [];
  }
}

export async function getDishById(dishId: string): Promise<Dish | null> {
  if (!db) return null;

  try {
    const dishRef = doc(db, 'dishes', dishId);
    const dishDoc = await getDoc(dishRef);

    if (!dishDoc.exists()) {
      return null;
    }

    return firestoreDataToDish(dishDoc.id, dishDoc.data());
  } catch (error) {
    console.error('Error getting dish by ID:', error);
    return null;
  }
}

export async function getDishesByTags(tags: DishTag[]): Promise<Dish[]> {
  if (!db || !tags.length) return [];

  try {
    const dishesRef = collection(db, 'dishes');
    const querySnapshot = await getDocs(dishesRef);
    const dishes: Dish[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const dishTags = data.tags || [];

      // Check if dish has all selected tags
      const hasAllTags = tags.every((tag) => dishTags.includes(tag));
      if (hasAllTags) {
        dishes.push(firestoreDataToDish(doc.id, data));
      }
    });

    // Limit to maximum 30 dishes
    return dishes.slice(0, 30);
  } catch (error) {
    console.error('Error getting dishes by tags:', error);
    return [];
  }
}

export async function getAllDishes(): Promise<Dish[]> {
  if (!db) return [];

  try {
    const dishesRef = collection(db, 'dishes');
    const q = query(dishesRef, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const dishes: Dish[] = [];

    querySnapshot.forEach((doc) => {
      dishes.push(firestoreDataToDish(doc.id, doc.data()));
    });

    return dishes;
  } catch (error) {
    console.error('Error getting dishes:', error);
    return [];
  }
}

export async function getTopDishes(
  page: number = 1,
  pageSize: number = 10,
  tags?: DishTag[],
  category?: DishCategory,
): Promise<{ dishes: Dish[]; hasMore: boolean }> {
  if (!db) return { dishes: [], hasMore: false };

  try {
    const MAX_DISHES = 30; // Maximum total dishes to fetch
    const dishesRef = collection(db, 'dishes');

    // Build query conditions
    const conditions: QueryConstraint[] = [
      where('status', '==', 'approved'), // Only show approved dishes
    ];

    // Add category filter if provided
    if (category) {
      conditions.push(where('category', '==', category));
    }

    conditions.push(orderBy('thumbsUp', 'desc'));
    conditions.push(limit(MAX_DISHES)); // Always fetch maximum 30 dishes

    const q = query(dishesRef, ...conditions);
    const querySnapshot = await getDocs(q);
    const dishes: Dish[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const dishTags = data.tags || [];

      // Filter by tags if provided
      if (tags && tags.length > 0) {
        const hasAllTags = tags.every((tag) => dishTags.includes(tag));
        if (!hasAllTags) return;
      }

      dishes.push(firestoreDataToDish(doc.id, data));
    });

    // Calculate net votes and sort
    dishes.sort((a, b) => {
      const netA = a.thumbsUp - a.thumbsDown;
      const netB = b.thumbsUp - b.thumbsDown;
      return netB - netA;
    });

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedDishes = dishes.slice(startIndex, endIndex);
    const hasMore = dishes.length > endIndex;

    return { dishes: paginatedDishes, hasMore };
  } catch (error) {
    console.error('Error getting top dishes:', error);
    return { dishes: [], hasMore: false };
  }
}

export async function createDish(
  name: string,
  imageUrl: string,
  category?: DishCategory,
  tags: DishTag[] = [],
  imageProviderNickname?: string,
  status: DishStatus = 'approved',
  requestedBy?: string,
  nickname?: string,
  images?: string[],
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const dishesRef = collection(db, 'dishes');
    const now = Timestamp.now();

    // Generate comprehensive search tokens for efficient querying
    const nameTokens = generateSearchTokens(name);

    // Use images array if provided, otherwise use imageUrl as single image
    const imagesArray = images || (imageUrl ? [imageUrl] : []);
    const primaryImageUrl = imagesArray[0] || imageUrl;

    const docRef = await addDoc(dishesRef, {
      name,
      nameTokens, // Array of search variations (normalized, words, prefixes) for array-contains-any queries
      imageUrl: primaryImageUrl, // Keep for backward compatibility
      images: imagesArray.length > 0 ? imagesArray : undefined,
      category: category || null,
      tags: tags || [],
      status: status,
      requestedBy: requestedBy || null,
      nickname: nickname || null,
      imageProviderNickname: imageProviderNickname || null,
      thumbsUp: 0,
      thumbsDown: 0,
      createdAt: now,
      updatedAt: now,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating dish:', error);
    throw error;
  }
}

export async function updateDish(
  id: string,
  updates: {
    name?: string;
    imageUrl?: string;
    category?: DishCategory | null;
    tags?: DishTag[];
    imageProviderNickname?: string | null;
  },
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const dishRef = doc(db, 'dishes', id);
    const updateData: {
      name?: string;
      imageUrl?: string;
      category?: DishCategory | null;
      tags?: DishTag[];
      imageProviderNickname?: string | null;
      nameTokens?: string[];
      updatedAt: Timestamp;
    } = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    // If name is being updated, also update nameTokens
    if (updates.name !== undefined) {
      updateData.nameTokens = generateSearchTokens(updates.name);
    }

    await updateDoc(dishRef, updateData);
  } catch (error) {
    console.error('Error updating dish:', error);
    throw error;
  }
}

export async function deleteDish(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const dishRef = doc(db, 'dishes', id);
    await deleteDoc(dishRef);
  } catch (error) {
    console.error('Error deleting dish:', error);
    throw error;
  }
}

// Dish Requests operations
// Create a dish with status='pending' (replaces createDishRequest)
export async function createDishRequest(
  name: string,
  imageUrl: string | null,
  category: DishCategory | null,
  tags: DishTag[],
  requestedBy: string,
  nickname?: string,
): Promise<string> {
  // Create dish directly with status='pending'
  return createDish(
    name,
    imageUrl || '',
    category || undefined,
    tags,
    undefined, // imageProviderNickname
    'pending', // status
    requestedBy,
    nickname,
  );
}

// Get pending dishes (replaces getPendingDishRequests)
export async function getPendingDishRequests(): Promise<Dish[]> {
  if (!db) return [];

  try {
    const dishesRef = collection(db, 'dishes');
    const q = query(
      dishesRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
    );

    const querySnapshot = await getDocs(q);
    const dishes: Dish[] = [];

    querySnapshot.forEach((doc) => {
      dishes.push(firestoreDataToDish(doc.id, doc.data()));
    });

    return dishes;
  } catch (error) {
    console.error('Error getting pending dishes:', error);
    return [];
  }
}

// Approve a pending dish (replaces approveDishRequest)
export async function approveDishRequest(dishId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const dishRef = doc(db, 'dishes', dishId);
    await updateDoc(dishRef, {
      status: 'approved',
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error approving dish:', error);
    throw error;
  }
}

// Reject a pending dish (replaces rejectDishRequest)
export async function rejectDishRequest(dishId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const dishRef = doc(db, 'dishes', dishId);
    await updateDoc(dishRef, {
      status: 'rejected',
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error rejecting dish:', error);
    throw error;
  }
}

// Menu operations
export async function createMenu(
  date: Date,
  lunch: MenuItems,
  dinner?: MenuItems,
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const menusRef = collection(db, 'menus');
    const now = Timestamp.now();
    // Normalize date to start of day (00:00:00) in UTC for consistent comparison
    // Use UTC to avoid timezone issues
    const normalizedDate = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dateTimestamp = Timestamp.fromDate(normalizedDate);

    const menuData: {
      date: Timestamp;
      lunch: MenuItems;
      dinner?: MenuItems;
      createdAt: Timestamp;
      updatedAt: Timestamp;
    } = {
      date: dateTimestamp,
      lunch,
      createdAt: now,
      updatedAt: now,
    };

    // Only add dinner if provided (Saturday has no dinner)
    if (dinner) {
      menuData.dinner = dinner;
    }

    const docRef = await addDoc(menusRef, menuData);

    return docRef.id;
  } catch (error) {
    console.error('Error creating menu:', error);
    throw error;
  }
}

export async function updateMenu(
  id: string,
  updates: {
    lunch?: MenuItems;
    dinner?: MenuItems | null; // null to remove dinner (e.g., for Saturday)
  },
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const menuRef = doc(db, 'menus', id);
    const updateData: {
      lunch?: MenuItems;
      dinner?: MenuItems | null;
      updatedAt: Timestamp;
    } = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    // If dinner is explicitly set to null, remove it from Firestore
    if (updates.dinner === null) {
      updateData.dinner = null;
    }

    await updateDoc(menuRef, updateData);
  } catch (error) {
    console.error('Error updating menu:', error);
    throw error;
  }
}

export async function deleteMenu(id: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const menuRef = doc(db, 'menus', id);
    await deleteDoc(menuRef);
  } catch (error) {
    console.error('Error deleting menu:', error);
    throw error;
  }
}

export async function getMenuByDate(date: Date): Promise<Menu | null> {
  if (!db) return null;

  try {
    const menusRef = collection(db, 'menus');

    // Normalize date to start of day (00:00:00) in UTC
    const startOfDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );

    // Start of next day (exclusive upper bound)
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);

    const startTimestamp = Timestamp.fromDate(startOfDay);
    const endTimestamp = Timestamp.fromDate(startOfNextDay);

    // Query for dates >= start of day AND < start of next day
    const q = query(
      menusRef,
      where('date', '>=', startTimestamp),
      where('date', '<', endTimestamp),
      limit(1),
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const docSnapshot = querySnapshot.docs[0];
    const data = docSnapshot.data();
    const menuDate = (data.date as Timestamp)?.toDate() || new Date();

    return {
      id: docSnapshot.id,
      date: menuDate,
      lunch: data.lunch,
      dinner: data.dinner || undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting menu by date:', error);
    return null;
  }
}

export async function getCurrentMenu(): Promise<Menu | null> {
  // Get Portugal time using Intl formatter to get actual Portugal date components
  // This ensures we get the correct date components regardless of the user's local timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Lisbon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const dateTime: { [key: string]: string } = {};
  parts.forEach((part) => {
    dateTime[part.type] = part.value;
  });

  // Extract Portugal date components
  const ptYear = parseInt(dateTime.year!);
  const ptMonth = parseInt(dateTime.month!) - 1; // 0-indexed
  const ptDay = parseInt(dateTime.day!);
  const ptHour = parseInt(dateTime.hour!);
  const ptMinute = parseInt(dateTime.minute!);
  const totalMinutes = ptHour * 60 + ptMinute;

  // Determine which date to query
  let queryYear = ptYear;
  let queryMonth = ptMonth;
  let queryDay = ptDay;

  // After dinner (after 21:45), show next day's menu
  if (totalMinutes > 1305) {
    // Calculate tomorrow's date in Portugal timezone
    const ptDate = new Date(ptYear, ptMonth, ptDay);
    ptDate.setDate(ptDate.getDate() + 1);
    queryYear = ptDate.getFullYear();
    queryMonth = ptDate.getMonth();
    queryDay = ptDate.getDate();
  }

  // Create UTC date for query (midnight UTC of the target date)
  // This matches how dates are stored in Firebase
  const currentDate = new Date(Date.UTC(queryYear, queryMonth, queryDay));

  return getMenuByDate(currentDate);
}

export async function getMenusByDateRange(
  startDate: Date,
  endDate: Date,
): Promise<Menu[]> {
  if (!db) return [];

  try {
    const menusRef = collection(db, 'menus');
    const querySnapshot = await getDocs(menusRef);
    const menus: Menu[] = [];

    // Convert to timestamps for comparison
    const startTimestamp = Timestamp.fromDate(startDate);
    const endTimestamp = Timestamp.fromDate(endDate);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const menuDate = data.date as Timestamp;

      // Compare timestamps
      if (menuDate && menuDate >= startTimestamp && menuDate <= endTimestamp) {
        menus.push({
          id: doc.id,
          date: menuDate.toDate(),
          lunch: data.lunch,
          dinner: data.dinner || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      }
    });

    // Sort by date
    menus.sort((a, b) => {
      return a.date.getTime() - b.date.getTime();
    });

    return menus;
  } catch (error) {
    console.error('Error getting menus by date range:', error);
    return [];
  }
}

export async function updateMenuItemImage(
  menuId: string,
  mealType: MealType,
  category: DishCategory,
  imageUrl: string,
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const menuRef = doc(db, 'menus', menuId);
    const menuDoc = await getDoc(menuRef);

    if (!menuDoc.exists()) {
      throw new Error('Menu not found');
    }

    const data = menuDoc.data();
    const mealItems = { ...data[mealType] };
    mealItems[category] = {
      ...mealItems[category],
      imageUrl,
      imagePendingApproval: true,
    };

    await updateDoc(menuRef, {
      [mealType]: mealItems,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating menu item image:', error);
    throw error;
  }
}

export async function setMenuItemImagePending(
  menuId: string,
  mealType: MealType,
  category: DishCategory,
  pending: boolean,
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const menuRef = doc(db, 'menus', menuId);
    const menuDoc = await getDoc(menuRef);

    if (!menuDoc.exists()) {
      throw new Error('Menu not found');
    }

    const data = menuDoc.data();
    const mealItems = { ...data[mealType] };
    mealItems[category] = {
      ...mealItems[category],
      imagePendingApproval: pending,
    };

    await updateDoc(menuRef, {
      [mealType]: mealItems,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error setting menu item image pending:', error);
    throw error;
  }
}

export async function rejectMenuItemImage(
  menuId: string,
  mealType: MealType,
  category: DishCategory,
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const menuRef = doc(db, 'menus', menuId);
    const menuDoc = await getDoc(menuRef);

    if (!menuDoc.exists()) {
      throw new Error('Menu not found');
    }

    const data = menuDoc.data();
    const mealItems = { ...data[mealType] };
    mealItems[category] = {
      ...mealItems[category],
      imageUrl: undefined,
      imagePendingApproval: false,
    };

    await updateDoc(menuRef, {
      [mealType]: mealItems,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error rejecting menu item image:', error);
    throw error;
  }
}

export async function approveMenuItemImage(
  menuId: string,
  mealType: MealType,
  category: DishCategory,
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const menuRef = doc(db, 'menus', menuId);
    const menuDoc = await getDoc(menuRef);

    if (!menuDoc.exists()) {
      throw new Error('Menu not found');
    }

    const data = menuDoc.data();
    const mealItems = { ...data[mealType] };
    const menuItem = mealItems[category];

    // Update menu item to remove pending flag
    mealItems[category] = {
      ...menuItem,
      imagePendingApproval: false,
    };

    await updateDoc(menuRef, {
      [mealType]: mealItems,
      updatedAt: Timestamp.now(),
    });

    // If menu item has a dishId, also update the dish record
    if (menuItem.dishId && menuItem.imageUrl) {
      await updateDish(menuItem.dishId, {
        imageUrl: menuItem.imageUrl,
      });
    }
  } catch (error) {
    console.error('Error approving menu item image:', error);
    throw error;
  }
}

export async function getMenusWithPendingImages(): Promise<
  Array<{
    menu: Menu;
    mealType: MealType;
    category: DishCategory;
    menuItem: MenuItems[DishCategory];
  }>
> {
  if (!db) return [];

  try {
    const menusRef = collection(db, 'menus');
    const querySnapshot = await getDocs(menusRef);
    const results: Array<{
      menu: Menu;
      mealType: MealType;
      category: DishCategory;
      menuItem: MenuItems[DishCategory];
    }> = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const menu: Menu = {
        id: doc.id,
        date: (data.date as Timestamp)?.toDate() || new Date(),
        lunch: data.lunch,
        dinner: data.dinner || undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };

      // Check lunch items
      const lunchItems = menu.lunch;
      (
        [
          'Sugestão do Chefe',
          'Dieta Mediterrânica',
          'Alternativa',
          'Vegetariana',
        ] as DishCategory[]
      ).forEach((category) => {
        const item = lunchItems[category];
        if (item.imageUrl && item.imagePendingApproval === true) {
          results.push({
            menu,
            mealType: 'lunch' as MealType,
            category,
            menuItem: item,
          });
        }
      });

      // Check dinner items (if exists - Saturday has no dinner)
      if (menu.dinner) {
        const dinnerItems = menu.dinner;
        (
          [
            'Sugestão do Chefe',
            'Dieta Mediterrânica',
            'Alternativa',
            'Vegetariana',
          ] as DishCategory[]
        ).forEach((category) => {
          const item = dinnerItems[category];
          if (item.imageUrl && item.imagePendingApproval === true) {
            results.push({
              menu,
              mealType: 'dinner' as MealType,
              category,
              menuItem: item,
            });
          }
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Error getting menus with pending images:', error);
    return [];
  }
}

/**
 * Get or create a unique device ID for tracking uploads
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  let deviceId = localStorage.getItem('cantina_device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    localStorage.setItem('cantina_device_id', deviceId);
  }
  return deviceId;
}

/**
 * Check if device has already uploaded an image for this dish
 * Note: This is now informational only - users can upload multiple images
 */
export function hasDeviceUploadedDishImage(dishId: string): boolean {
  if (typeof window === 'undefined') return false;
  const deviceId = getDeviceId();
  const key = `cantina_dish_image_${dishId}_${deviceId}`;
  return !!localStorage.getItem(key);
}

/**
 * Add a pending image to a dish (uploaded by guest user)
 */
export async function addPendingDishImage(
  dishId: string,
  imageUrl: string,
  nickname?: string,
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const dishRef = doc(db, 'dishes', dishId);
    const dishDoc = await getDoc(dishRef);

    if (!dishDoc.exists()) {
      throw new Error('Dish not found');
    }

    const data = dishDoc.data();
    const deviceId = getDeviceId();
    const existingPendingImages = data.pendingImages || [];

    // Allow multiple pending images from the same device
    // Users can upload multiple images while waiting for approval
    const newPendingImage = {
      imageUrl,
      uploadedAt: Timestamp.now(),
      deviceId,
      nickname: nickname || undefined,
    };

    await updateDoc(dishRef, {
      pendingImages: [...existingPendingImages, newPendingImage],
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error adding pending dish image:', error);
    throw error;
  }
}

/**
 * Get all dishes with pending images
 */
export async function getDishesWithPendingImages(): Promise<
  Array<{
    dish: Dish;
    pendingImage: PendingDishImage;
  }>
> {
  if (!db) return [];

  try {
    const dishesRef = collection(db, 'dishes');
    const querySnapshot = await getDocs(dishesRef);
    const results: Array<{
      dish: Dish;
      pendingImage: PendingDishImage;
    }> = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const pendingImages = data.pendingImages || [];

      if (pendingImages.length > 0) {
        const dish = firestoreDataToDish(doc.id, data);

        // Add each pending image as a separate result
        pendingImages.forEach(
          (img: {
            imageUrl: string;
            uploadedAt?: Timestamp;
            deviceId: string;
            nickname?: string;
          }) => {
            results.push({
              dish,
              pendingImage: {
                imageUrl: img.imageUrl,
                uploadedAt: img.uploadedAt?.toDate() || new Date(),
                deviceId: img.deviceId,
                nickname: img.nickname,
              },
            });
          },
        );
      }
    });

    return results;
  } catch (error) {
    console.error('Error getting dishes with pending images:', error);
    return [];
  }
}

/**
 * Approve a pending dish image (set as main image)
 */
export async function approvePendingDishImage(
  dishId: string,
  imageUrl: string,
  nickname?: string,
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const dishRef = doc(db, 'dishes', dishId);
    const dishDoc = await getDoc(dishRef);

    if (!dishDoc.exists()) {
      throw new Error('Dish not found');
    }

    const data = dishDoc.data();
    const pendingImages = data.pendingImages || [];
    const existingImages =
      data.images || (data.imageUrl ? [data.imageUrl] : []);

    // Remove the approved image from pending images
    const updatedPendingImages = pendingImages.filter(
      (img: { imageUrl: string }) => img.imageUrl !== imageUrl,
    );

    // Add approved image to images array if not already present
    const updatedImages = existingImages.includes(imageUrl)
      ? existingImages
      : [imageUrl, ...existingImages.filter((img: string) => img !== imageUrl)];

    await updateDoc(dishRef, {
      imageUrl, // Primary image (backward compatibility)
      images: updatedImages, // Update images array
      imageProviderNickname: nickname || null,
      pendingImages: updatedPendingImages,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error approving pending dish image:', error);
    throw error;
  }
}

/**
 * Reject a pending dish image (remove from pending images)
 */
export async function rejectPendingDishImage(
  dishId: string,
  imageUrl: string,
): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const dishRef = doc(db, 'dishes', dishId);
    const dishDoc = await getDoc(dishRef);

    if (!dishDoc.exists()) {
      throw new Error('Dish not found');
    }

    const data = dishDoc.data();
    const pendingImages = data.pendingImages || [];

    // Remove the rejected image from pending images
    const updatedPendingImages = pendingImages.filter(
      (img: { imageUrl: string }) => img.imageUrl !== imageUrl,
    );

    await updateDoc(dishRef, {
      pendingImages: updatedPendingImages,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error rejecting pending dish image:', error);
    throw error;
  }
}
