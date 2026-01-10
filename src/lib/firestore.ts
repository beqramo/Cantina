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
  startAfter,
  QueryDocumentSnapshot,
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
import { STORAGE_KEYS } from './constants';
import { getMenuDisplayDate } from './time';

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
// Prioritizes dishes with images by adding more searchable tokens
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

  words.forEach((word, wordIndex) => {
    if (word.length > 0) {
      tokens.add(word);

      // Add word prefixes (for partial matching)
      // Start from 2 characters for shorter words, 3 for longer
      const minPrefix = word.length <= 4 ? 2 : 3;
      for (let i = minPrefix; i <= word.length; i++) {
        tokens.add(word.substring(0, i));
      }

      // Add word suffixes (for matching end of words)
      // E.g., "frango" -> "rango", "ango", "ngo"
      if (word.length > 3) {
        for (let i = 1; i <= Math.min(3, word.length - 2); i++) {
          tokens.add(word.substring(i));
        }
      }
    }
  });

  // Add bigrams (pairs of consecutive words)
  // E.g., "arroz de frango" -> "arroz de", "de frango"
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    tokens.add(bigram);
    // Add bigram prefixes
    for (let j = 3; j <= bigram.length; j++) {
      tokens.add(bigram.substring(0, j));
    }
  }

  // Add trigrams (three consecutive words) if available
  // E.g., "arroz de frango" -> "arroz de frango"
  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    tokens.add(trigram);
  }

  // Add combined word prefixes (first letters of each word)
  // E.g., "arroz de frango" -> "adf", "ad", "af"
  if (words.length >= 2) {
    const initials = words.map((w) => w[0]).join('');
    if (initials.length >= 2) {
      tokens.add(initials);
    }
  }

  // Add word combinations without common connectors (de, com, e, ao, à, a)
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
      // Add prefixes for original words too
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

// Dishes operations
export async function searchDishes(
  searchTerm: string,
  tags?: DishTag[],
  includeAllStatuses = false,
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
          // Only include approved dishes in search results, unless requested otherwise
          if (includeAllStatuses || dish.status === 'approved') {
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
            // Only include approved dishes in search results, unless requested otherwise
            if (includeAllStatuses || dish.status === 'approved') {
              dishes.push(dish);
            }
          });
        } catch (fallbackError) {
          console.warn('Fallback name query also failed:', fallbackError);
        }
      }
    }

    // Sort results: prioritize dishes with images, then exact matches, prefix matches, contains matches
    dishes.sort((a, b) => {
      const aName = normalizeSearchTerm(a.name);
      const bName = normalizeSearchTerm(b.name);
      const search = normalizedSearchTerm;

      // First priority: dishes with images come first
      const aHasImage = !!(a.imageUrl && a.imageUrl.length > 0);
      const bHasImage = !!(b.imageUrl && b.imageUrl.length > 0);
      if (aHasImage && !bHasImage) return -1;
      if (bHasImage && !aHasImage) return 1;

      // Second priority: exact match
      if (aName === search && bName !== search) return -1;
      if (bName === search && aName !== search) return 1;

      // Third priority: prefix match
      const aStartsWith = aName.startsWith(search);
      const bStartsWith = bName.startsWith(search);
      if (aStartsWith && !bStartsWith) return -1;
      if (bStartsWith && !aStartsWith) return 1;

      // Fourth priority: word starts with search term
      const aWords = aName.split(/\s+/);
      const bWords = bName.split(/\s+/);
      const aWordStarts = aWords.some((w) => w.startsWith(search));
      const bWordStarts = bWords.some((w) => w.startsWith(search));
      if (aWordStarts && !bWordStarts) return -1;
      if (bWordStarts && !aWordStarts) return 1;

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

export async function getAllDishes(
  includeAllStatuses = false,
): Promise<Dish[]> {
  if (!db) return [];

  try {
    const dishesRef = collection(db, 'dishes');

    // By default, only return approved dishes
    // If includeAllStatuses is true, return all dishes (for admin purposes)
    const q = includeAllStatuses
      ? query(dishesRef, orderBy('createdAt', 'desc'))
      : query(
          dishesRef,
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
        );

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

export async function getDishesPaginated(
  pageSize: number = 20,
  includeAllStatuses = false,
  lastDoc?: QueryDocumentSnapshot,
): Promise<{
  dishes: Dish[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}> {
  if (!db) return { dishes: [], lastDoc: null, hasMore: false };

  try {
    const dishesRef = collection(db, 'dishes');
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1),
    ];

    if (!includeAllStatuses) {
      constraints.push(where('status', '==', 'approved'));
    }

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(dishesRef, ...constraints);
    const querySnapshot = await getDocs(q);

    const dishes: Dish[] = [];
    querySnapshot.docs.slice(0, pageSize).forEach((doc) => {
      dishes.push(firestoreDataToDish(doc.id, doc.data()));
    });

    const hasMore = querySnapshot.docs.length > pageSize;
    const lastVisible = hasMore
      ? querySnapshot.docs[pageSize - 1]
      : querySnapshot.docs[querySnapshot.docs.length - 1] || null;

    return { dishes, lastDoc: lastVisible, hasMore };
  } catch (error) {
    console.error('Error getting paginated dishes:', error);
    return { dishes: [], lastDoc: null, hasMore: false };
  }
}

export async function getTopDishes(
  pageSize: number = 10,
  tags?: DishTag[],
  category?: DishCategory,
  lastDoc?: QueryDocumentSnapshot,
): Promise<{
  dishes: Dish[];
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot | null;
}> {
  if (!db) return { dishes: [], hasMore: false, lastDoc: null };

  try {
    const dishesRef = collection(db, 'dishes');

    // Build query conditions
    const conditions: QueryConstraint[] = [
      where('status', '==', 'approved'), // Only show approved dishes
    ];

    // Add category filter if provided
    if (category) {
      conditions.push(where('category', '==', category));
    }

    // Order by thumbsUp descending for consistent cursor pagination
    conditions.push(orderBy('thumbsUp', 'desc'));

    // Use cursor if provided
    if (lastDoc) {
      conditions.push(startAfter(lastDoc));
    }

    // Fetch more than pageSize to account for client-side sorting by net votes
    // This helps ensure we don't skip dishes when sorting changes the order
    // Fetch 2x pageSize + 1 to have enough dishes after sorting
    const fetchSize = pageSize * 2 + 1;
    conditions.push(limit(fetchSize));

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

    // Check if we have more pages by checking if we got the full fetchSize
    // This means there might be more dishes available in Firestore
    const hasMore = querySnapshot.docs.length >= fetchSize;

    // Return only pageSize dishes
    const paginatedDishes = dishes.slice(0, pageSize);

    // Get the last document snapshot for cursor
    // Since we sorted client-side by net votes, we need to find the last dish shown
    // and use its document from the original Firestore query as the cursor
    let lastDocument: QueryDocumentSnapshot | null = null;
    if (hasMore && paginatedDishes.length > 0) {
      // Find the last dish in the paginated results (after sorting)
      const lastDish = paginatedDishes[paginatedDishes.length - 1];
      // Find its corresponding document in the original querySnapshot (ordered by thumbsUp)
      const lastDocSnapshot = querySnapshot.docs.find(
        (doc) => doc.id === lastDish.id,
      );
      lastDocument = lastDocSnapshot || null;
    }

    return { dishes: paginatedDishes, hasMore, lastDoc: lastDocument };
  } catch (error) {
    console.error('Error getting top dishes:', error);
    return { dishes: [], hasMore: false, lastDoc: null };
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
      ...(imagesArray.length > 0 && { images: imagesArray }),
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

// Reject a pending dish - deletes it from the database
export async function rejectDishRequest(dishId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const dishRef = doc(db, 'dishes', dishId);
    await deleteDoc(dishRef);
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

    // Only add dinner if provided (dinner is optional on any day)
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
    dinner?: MenuItems | null; // null to remove dinner
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
  const displayDate = getMenuDisplayDate();

  // Create UTC date for query (midnight UTC of the target date)
  // This matches how dates are stored in Firebase
  const currentDate = new Date(
    Date.UTC(
      displayDate.getFullYear(),
      displayDate.getMonth(),
      displayDate.getDate(),
    ),
  );

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

    // Remove the imageUrl by keeping only the dishName and setting imagePendingApproval to false
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { imageUrl: _imageUrl, ...restOfMenuItem } = mealItems[category];
    mealItems[category] = {
      ...restOfMenuItem,
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

      // Check dinner items (if exists - dinner is optional on any day)
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
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
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
  const key = `${STORAGE_KEYS.DISH_IMAGE_PREFIX}${dishId}_${deviceId}`;
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
