import type { ReactElement, ReactNode } from 'react';
import type { MarketCheckoutItem } from '@/lib/market/product-presenter';

export const PENDING_CHECKOUT_STORAGE_KEY: string;

export interface CheckoutItemPayload {
  readonly id?: string;
  readonly slug?: string;
  readonly category?: string;
  readonly image?: string | null;
  readonly title?: string;
  readonly itemTitle?: string;
  readonly productName?: string;
  readonly price?: number;
  readonly basePrice?: number;
  readonly quantity?: number;
  readonly type?: string;
  readonly specs?: string | { readonly [key: string]: string | number | boolean | null | undefined };
  readonly items?: readonly MarketCheckoutItem[];
  readonly notes?: string;
  readonly userRole?: string;
  readonly tradeInDiscount?: number;
  readonly pricing?: {
    readonly basePrice: number;
    readonly jitBuffer: number;
    readonly total: number;
  };
}

export interface MarketCartItem extends CheckoutItemPayload {
  readonly id: string;
  readonly title: string;
  readonly price: number;
  readonly quantity: number;
}

export interface CheckoutContextValue {
  readonly isOpen: boolean;
  readonly checkoutData: CheckoutItemPayload | null;
  readonly triggerCheckout: (itemData: CheckoutItemPayload) => void;
  readonly closeCheckout: () => void;
  readonly cartItems: readonly MarketCartItem[];
  readonly totalCartItems: number;
  readonly totalCartPrice: number;
  readonly triggerCartCheckout: () => void;
  readonly addToCart: (item: CheckoutItemPayload) => void;
  readonly removeFromCart: (id: string) => void;
  readonly clearCart: () => void;
  readonly dismissCartToast: () => void;
}

export function CheckoutProvider({ children }: { readonly children: ReactNode }): ReactElement;

export function useCheckout(): CheckoutContextValue;
