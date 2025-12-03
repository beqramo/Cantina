/**
 * Menu processing utilities
 * Handles menu upload, dish matching, and dish creation
 */

import { searchDishes, createDish, getAllDishes } from '@/lib/firestore';
import { MenuJSON, MenuDayJSON, MenuItems, DishCategory } from '@/types';
import { DISH_CATEGORIES } from '@/lib/constants';
import { parseMenuDate } from '@/lib/time';

// Helper function to normalize strings for search (same as in firestore.ts)
function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .trim();
}

/**
 * Match a dish by name (normalized comparison)
 * Returns dish ID if found, null otherwise
 */
export async function matchDishByName(
  name: string,
): Promise<{ id: string; name: string } | null> {
  if (!name.trim()) return null;

  // First try exact search
  const searchResults = await searchDishes(name);
  if (searchResults.length > 0) {
    const normalizedInput = normalizeSearchTerm(name);
    // Find exact match (normalized)
    const exactMatch = searchResults.find(
      (dish) => normalizeSearchTerm(dish.name) === normalizedInput,
    );
    if (exactMatch) {
      return { id: exactMatch.id, name: exactMatch.name };
    }
    // If no exact match, return first result (closest match)
    return { id: searchResults[0].id, name: searchResults[0].name };
  }

  // Fallback: get all dishes and do normalized comparison
  const allDishes = await getAllDishes();
  const normalizedInput = normalizeSearchTerm(name);

  for (const dish of allDishes) {
    const normalizedDishName = normalizeSearchTerm(dish.name);
    if (normalizedDishName === normalizedInput) {
      return { id: dish.id, name: dish.name };
    }
  }

  return null;
}

/**
 * Create a dish record from menu item (without image)
 * Includes all necessary fields like nameTokens for searchability
 */
export async function createDishFromMenuItem(
  name: string,
  category: DishCategory,
): Promise<string> {
  // Create dish without image (empty string)
  // Tags will be empty array by default
  const dishId = await createDish(name, '', category, []);
  return dishId;
}

/**
 * Process menu items for a single meal (lunch or dinner)
 * Matches dishes or creates new ones
 */
async function processMealItems(mealItems: {
  'Sugestão do Chefe': string;
  'Dieta Mediterrânica': string;
  Alternativa: string;
  Vegetariana: string;
  soup?: string; // Optional soup name
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
    const match = await matchDishByName(dishName);

    if (match) {
      // Dish exists, link it
      processedItems[category] = {
        dishId: match.id,
        dishName: match.name, // Use the matched name (might be slightly different)
      };
    } else {
      // Dish doesn't exist, create it
      const dishId = await createDishFromMenuItem(dishName, category);
      processedItems[category] = {
        dishId,
        dishName,
      };
    }
  }

  // Process soup (optional, not a dish category)
  if (mealItems.soup && mealItems.soup.trim()) {
    processedItems.soup = {
      dishName: mealItems.soup.trim(),
      // No dishId for soup as it's not linked to a dish
    };
  }

  return processedItems;
}

/**
 * Process menu JSON upload
 * Supports both single day object and array of days
 * Dinner is optional on any day
 */
export async function processMenuUpload(
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
    const lunchItems = await processMealItems({
      'Sugestão do Chefe': menuDay.lunch['Sugestão do Chefe'],
      'Dieta Mediterrânica': menuDay.lunch['Dieta Mediterrânica'],
      Alternativa: menuDay.lunch.Alternativa,
      Vegetariana: menuDay.lunch.Vegetariana,
      soup: menuDay.lunch.soup,
    });

    // Process dinner items (optional on any day)
    let dinnerItems: MenuItems | undefined;
    if (menuDay.dinner) {
      dinnerItems = await processMealItems({
        'Sugestão do Chefe': menuDay.dinner['Sugestão do Chefe'],
        'Dieta Mediterrânica': menuDay.dinner['Dieta Mediterrânica'],
        Alternativa: menuDay.dinner.Alternativa,
        Vegetariana: menuDay.dinner.Vegetariana,
        soup: menuDay.dinner.soup,
      });
    }

    processedMenus.push({
      date,
      lunch: lunchItems,
      dinner: dinnerItems,
    });
  }

  return processedMenus;
}
