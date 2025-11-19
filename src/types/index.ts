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

export interface PendingDishImage {
  imageUrl: string;
  uploadedAt: Date;
  deviceId: string; // Unique device identifier
  nickname?: string; // Optional nickname of uploader
}

export type DishStatus = 'pending' | 'approved' | 'rejected';

export interface Dish {
  id: string;
  name: string;
  imageUrl: string; // Primary image (backward compatibility, should be images[0])
  images?: string[]; // Array of image URLs (first one is primary)
  category?: DishCategory;
  tags: DishTag[];
  status: DishStatus; // Approval status for dish requests
  requestedBy?: string; // localStorage ID of user who requested
  nickname?: string; // User's nickname who requested
  imageProviderNickname?: string; // Nickname of user who provided the image
  pendingImages?: PendingDishImage[]; // Array of pending images from users
  thumbsUp: number;
  thumbsDown: number;
  createdAt: Date;
  updatedAt: Date;
}

// DishRequest is deprecated - use Dish with status='pending' instead
// Keeping for backward compatibility during migration
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

export type MealType = 'lunch' | 'dinner';

export interface MenuItem {
  dishId?: string;
  dishName: string;
  imageUrl?: string;
  imagePendingApproval?: boolean;
}

export interface MenuItems {
  'Sugestão do Chefe': MenuItem;
  'Dieta Mediterrânica': MenuItem;
  Alternativa: MenuItem;
  Vegetariana: MenuItem;
}

export interface Menu {
  id: string;
  date: Date; // Firebase Timestamp converted to Date
  lunch: MenuItems;
  dinner?: MenuItems; // Optional - Saturday has no dinner
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuDayJSON {
  date: string; // DD/MM/YYYY format
  lunch: {
    'Sugestão do Chefe': string;
    'Dieta Mediterrânica': string;
    Alternativa: string;
    Vegetariana: string;
  };
  dinner?: {
    'Sugestão do Chefe': string;
    'Dieta Mediterrânica': string;
    Alternativa: string;
    Vegetariana: string;
  }; // Optional - Saturday has no dinner
}

// Support both single day object and array of days
export type MenuJSON = MenuDayJSON | MenuDayJSON[];
