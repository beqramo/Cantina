export type DishCategory =
  | 'Sugestão do Chefe'
  | 'Dieta Mediterrânica'
  | 'Alternativa'
  | 'Vegetariana';

export type DishTag =
  | '#porco'
  | '#beef'
  | '#frango'
  | '#peixe'
  | '#salada'
  | '#sopa'
  | '#sobremesa'
  | '#vegetariano'
  | '#vegano'
  | '#picante'
  | '#gluten-free'
  | '#lactose-free';

export interface Dish {
  id: string;
  name: string;
  imageUrl: string;
  category?: DishCategory;
  tags: DishTag[];
  imageProviderNickname?: string; // Nickname of user who provided the image
  thumbsUp: number;
  thumbsDown: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DishRequest {
  id: string;
  name: string;
  imageUrl?: string;
  category?: DishCategory;
  tags: DishTag[];
  requestedBy: string; // localStorage ID
  nickname?: string; // User's nickname
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface Admin {
  uid: string;
  email: string;
  createdAt: Date;
}

export type Language = 'pt' | 'en';

export type Theme = 'light' | 'dark' | 'system';
