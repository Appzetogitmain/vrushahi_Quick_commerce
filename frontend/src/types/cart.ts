import { Product } from './domain';

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: any;
  isDeliverable?: boolean;
  taxBreakdown?: {
    taxName: string;
    taxPercentage: number;
    taxAmount: number;
    basePrice: number;
  };
}

export interface Cart {
  items: CartItem[];
  total: number;
  totalTax?: number;
  totalBasePrice?: number;
  itemCount: number;
  estimatedDeliveryFee?: number;
  platformFee?: number;
  freeDeliveryThreshold?: number;
}

