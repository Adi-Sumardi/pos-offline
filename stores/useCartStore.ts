import { create } from 'zustand';
import type { Product, Customer, Discount } from '@/db/schema';

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  discount: Discount | null;
  discountAmount: number;
  notes: string;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  setCustomer: (customer: Customer | null) => void;
  setDiscount: (discount: Discount | null) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;

  // Computed
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;

  // Internal
  _recalcDiscount: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  discount: null,
  discountAmount: 0,
  notes: '',

  addItem: (product: Product, quantity = product.qtyStep) => {
    // Guard: reject zero or negative quantity
    if (quantity <= 0) return;

    const items = get().items;
    const existingIndex = items.findIndex((i) => i.product.id === product.id);

    if (existingIndex >= 0) {
      // Increase quantity of existing item
      const updated = [...items];
      const newQty = updated[existingIndex].quantity + quantity;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        subtotal: Math.round(product.price * newQty),
      };
      set({ items: updated });
    } else {
      // Add new item
      set({
        items: [
          ...items,
          {
            product,
            quantity,
            subtotal: Math.round(product.price * quantity),
          },
        ],
      });
    }
    // Recalculate discount
    get()._recalcDiscount();
  },

  removeItem: (productId: number) => {
    const newItems = get().items.filter((i) => i.product.id !== productId);
    const discount = get().discount;

    // Hapus diskon product-scoped jika produk target dihapus dari cart
    if (discount?.scope === 'product' && discount.scopeId === productId) {
      set({ items: newItems, discount: null, discountAmount: 0 });
      return;
    }

    set({ items: newItems });
    get()._recalcDiscount();
  },

  updateQuantity: (productId: number, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    const items = get().items.map((item) =>
      item.product.id === productId
        ? {
            ...item,
            quantity,
            subtotal: Math.round(item.product.price * quantity),
          }
        : item
    );
    set({ items });
    get()._recalcDiscount();
  },

  setCustomer: (customer) => set({ customer }),

  setDiscount: (discount) => {
    set({ discount });
    get()._recalcDiscount();
  },

  setNotes: (notes) => set({ notes }),

  clearCart: () =>
    set({
      items: [],
      customer: null,
      discount: null,
      discountAmount: 0,
      notes: '',
    }),

  getSubtotal: () => get().items.reduce((sum, item) => sum + item.subtotal, 0),

  getTotal: () => get().getSubtotal() - get().discountAmount,

  getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  // Internal: recalculate discount amount based on current subtotal
  _recalcDiscount: () => {
    const discount = get().discount;
    if (!discount) {
      set({ discountAmount: 0 });
      return;
    }
    const subtotal = get().getSubtotal();

    // Check minimum purchase
    if (subtotal < discount.minPurchase) {
      set({ discountAmount: 0 });
      return;
    }

    let amount = 0;
    if (discount.type === 'percentage') {
      amount = Math.round(subtotal * (discount.value / 100));
      if (discount.maxDiscount && amount > discount.maxDiscount) {
        amount = discount.maxDiscount;
      }
    } else {
      amount = discount.value;
    }

    // Don't let discount be negative (prevents total > subtotal)
    if (amount < 0) amount = 0;

    // Don't let discount exceed subtotal
    if (amount > subtotal) amount = subtotal;

    set({ discountAmount: amount });
  },
}));
