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
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Dish, DishRequest, DishCategory, DishTag } from '@/types';

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

          dishes.push({
            id: doc.id,
            name: data.name,
            imageUrl: data.imageUrl,
            category: data.category,
            tags: dishTags,
            imageProviderNickname: data.imageProviderNickname,
            thumbsUp: data.thumbsUp || 0,
            thumbsDown: data.thumbsDown || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          });
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

            dishes.push({
              id: doc.id,
              name: data.name,
              imageUrl: data.imageUrl,
              category: data.category,
              tags: dishTags,
              imageProviderNickname: data.imageProviderNickname,
              thumbsUp: data.thumbsUp || 0,
              thumbsDown: data.thumbsDown || 0,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            });
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
        dishes.push({
          id: doc.id,
          name: data.name,
          imageUrl: data.imageUrl,
          category: data.category,
          tags: dishTags,
          imageProviderNickname: data.imageProviderNickname,
          thumbsUp: data.thumbsUp || 0,
          thumbsDown: data.thumbsDown || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
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
      const data = doc.data();
      dishes.push({
        id: doc.id,
        name: data.name,
        imageUrl: data.imageUrl,
        category: data.category,
        tags: data.tags || [],
        imageProviderNickname: data.imageProviderNickname,
        thumbsUp: data.thumbsUp || 0,
        thumbsDown: data.thumbsDown || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
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
): Promise<{ dishes: Dish[]; hasMore: boolean }> {
  if (!db) return { dishes: [], hasMore: false };

  try {
    const MAX_DISHES = 30; // Maximum total dishes to fetch
    const dishesRef = collection(db, 'dishes');
    const q = query(
      dishesRef,
      orderBy('thumbsUp', 'desc'),
      limit(MAX_DISHES), // Always fetch maximum 30 dishes
    );

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

      dishes.push({
        id: doc.id,
        name: data.name,
        imageUrl: data.imageUrl,
        category: data.category,
        tags: dishTags,
        imageProviderNickname: data.imageProviderNickname,
        thumbsUp: data.thumbsUp || 0,
        thumbsDown: data.thumbsDown || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
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
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const dishesRef = collection(db, 'dishes');
    const now = Timestamp.now();

    // Generate comprehensive search tokens for efficient querying
    const nameTokens = generateSearchTokens(name);

    const docRef = await addDoc(dishesRef, {
      name,
      nameTokens, // Array of search variations (normalized, words, prefixes) for array-contains-any queries
      imageUrl,
      category: category || null,
      tags: tags || [],
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
export async function createDishRequest(
  name: string,
  imageUrl: string | null,
  category: DishCategory | null,
  tags: DishTag[],
  requestedBy: string,
  nickname?: string,
): Promise<string> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const requestsRef = collection(db, 'dishRequests');
    const now = Timestamp.now();

    const docRef = await addDoc(requestsRef, {
      name,
      imageUrl: imageUrl || null,
      category: category || null,
      tags: tags || [],
      requestedBy,
      nickname: nickname || null,
      status: 'pending',
      createdAt: now,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating dish request:', error);
    throw error;
  }
}

export async function getPendingDishRequests(): Promise<DishRequest[]> {
  if (!db) return [];

  try {
    const requestsRef = collection(db, 'dishRequests');
    const q = query(
      requestsRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
    );

    const querySnapshot = await getDocs(q);
    const requests: DishRequest[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        name: data.name,
        imageUrl: data.imageUrl,
        category: data.category,
        tags: data.tags || [],
        requestedBy: data.requestedBy,
        nickname: data.nickname,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    return requests;
  } catch (error) {
    console.error('Error getting pending requests:', error);
    return [];
  }
}

export async function approveDishRequest(requestId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const requestRef = doc(db, 'dishRequests', requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      throw new Error('Request not found');
    }

    const data = requestDoc.data();

    // Create dish with nickname if provided
    await createDish(
      data.name,
      data.imageUrl || '',
      data.category,
      data.tags || [],
      data.nickname || undefined,
    );

    // Update request status
    await updateDoc(requestRef, {
      status: 'approved',
    });
  } catch (error) {
    console.error('Error approving request:', error);
    throw error;
  }
}

export async function rejectDishRequest(requestId: string): Promise<void> {
  if (!db) throw new Error('Firebase not initialized');

  try {
    const requestRef = doc(db, 'dishRequests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
    });
  } catch (error) {
    console.error('Error rejecting request:', error);
    throw error;
  }
}
