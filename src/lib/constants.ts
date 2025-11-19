import { DishCategory, DishTag } from '@/types';

export const DISH_CATEGORIES: DishCategory[] = [
  'Sugestão do Chefe',
  'Dieta Mediterrânica',
  'Alternativa',
  'Vegetariana',
];

export const DISH_TAGS: DishTag[] = [
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
];

export const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
export const MAX_IMAGE_WIDTH = 1200;
export const SEARCH_DEBOUNCE_MS = 300;
export const DISHES_PER_PAGE = 10;

export const STORAGE_KEYS = {
  LANGUAGE: 'cantina_language',
  VOTE_PREFIX: 'cantina_vote_',
  USER_ID: 'cantina_user_id',
  NICKNAME: 'cantina_nickname',
  DEVICE_ID: 'cantina_device_id',
  DISH_IMAGE_PREFIX: 'cantina_dish_image_',
} as const;
