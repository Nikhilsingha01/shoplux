import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant?: string | null;
  deliveryCharge?: number;
  isDeliveryChargeApplicable?: boolean;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, variant?: string | null) => void;
  updateQuantity: (productId: number, variant: string | null | undefined, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(
          (i) => i.productId === item.productId && i.variant === item.variant
        );

        if (existingItem) {
          set({
            items: currentItems.map((i) =>
              i.productId === item.productId && i.variant === item.variant
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...currentItems, item] });
        }
      },
      removeItem: (productId, variant) => {
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && i.variant === variant)
          ),
        });
      },
      updateQuantity: (productId, variant, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variant);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId && i.variant === variant
              ? { ...i, quantity }
              : i
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      getSubtotal: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'shoplux-cart',
    }
  )
);
