'use client';

import { useTranslations } from 'next-intl';
import { DishCategory, DishTag } from '@/types';

// Category translation keys matching the JSON structure
const CATEGORY_KEYS = [
  'Sugestão do Chefe',
  'Dieta Mediterrânica',
  'Alternativa',
  'Vegetariana',
] as const;

// Tag translation keys matching the JSON structure
const TAG_KEYS = [
  '#porco',
  '#beef',
  '#frango',
  '#peixe',
  '#salada',
  '#sopa',
  '#sobremesa',
  '#vegetariano',
  '#vegano',
  '#picante',
  '#gluten-free',
  '#lactose-free',
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];
type TagKey = (typeof TAG_KEYS)[number];

/**
 * Hook to translate static data like dish categories and tags
 */
export function useTranslateData() {
  const tCategories = useTranslations('Categories');
  const tTags = useTranslations('Tags');

  /**
   * Translate a dish category
   * Falls back to the original value if translation is not found
   */
  const translateCategory = (category: DishCategory | string): string => {
    if (CATEGORY_KEYS.includes(category as CategoryKey)) {
      return tCategories(category as CategoryKey);
    }
    return category;
  };

  /**
   * Translate a dish tag
   * Falls back to the original value if translation is not found
   */
  const translateTag = (tag: DishTag | string): string => {
    if (TAG_KEYS.includes(tag as TagKey)) {
      return tTags(tag as TagKey);
    }
    return tag;
  };

  return {
    translateCategory,
    translateTag,
  };
}
