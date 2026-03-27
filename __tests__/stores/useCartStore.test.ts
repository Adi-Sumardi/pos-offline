/**
 * @jest-environment node
 */
import { useCartStore } from '@/stores/useCartStore';
import type { Product, Discount } from '@/db/schema';

function mockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1, sku: 'OLI-001', name: 'Oli Mesin', categoryId: 1,
    brand: 'Brand A', unit: 'pcs', price: 50000, stock: 10,
    minStock: 5, qtyStep: 1, unitType: 'piece', location: null,
    hasQr: false, costPrice: 35000, isActive: true, notes: null,
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides,
  };
}

function mockDiscount(overrides: Partial<Discount> = {}): Discount {
  return {
    id: 1, name: 'Diskon 10%', type: 'percentage', value: 10,
    scope: 'all', scopeId: null, minPurchase: 0, maxDiscount: null,
    isActive: true, notes: null, createdBy: 1,
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('useCartStore', () => {
  beforeEach(() => { useCartStore.getState().clearCart(); });

  describe('addItem', () => {
    it('should add a new product to cart', () => {
      useCartStore.getState().addItem(mockProduct());
      const { items } = useCartStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(1);
      expect(items[0].subtotal).toBe(50000);
    });

    it('should use qtyStep as default quantity', () => {
      useCartStore.getState().addItem(mockProduct({ qtyStep: 0.5 }));
      expect(useCartStore.getState().items[0].quantity).toBe(0.5);
      expect(useCartStore.getState().items[0].subtotal).toBe(25000);
    });

    it('should increase quantity of existing item', () => {
      const p = mockProduct();
      useCartStore.getState().addItem(p);
      useCartStore.getState().addItem(p);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].quantity).toBe(2);
    });

    it('should add multiple different products', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1 }));
      useCartStore.getState().addItem(mockProduct({ id: 2, name: 'B' }));
      expect(useCartStore.getState().items).toHaveLength(2);
    });

    it('should reject zero quantity (FIXED)', () => {
      useCartStore.getState().addItem(mockProduct(), 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('should reject negative quantity (FIXED)', () => {
      useCartStore.getState().addItem(mockProduct(), -1);
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('removeItem', () => {
    it('should remove item by product ID', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1 }));
      useCartStore.getState().addItem(mockProduct({ id: 2, name: 'B' }));
      useCartStore.getState().removeItem(1);
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].product.id).toBe(2);
    });

    it('should do nothing for non-existent ID', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1 }));
      useCartStore.getState().removeItem(999);
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe('updateQuantity', () => {
    it('should update quantity and subtotal', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 50000 }));
      useCartStore.getState().updateQuantity(1, 3);
      expect(useCartStore.getState().items[0].quantity).toBe(3);
      expect(useCartStore.getState().items[0].subtotal).toBe(150000);
    });

    it('should remove item when qty is 0 or negative', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1 }));
      useCartStore.getState().updateQuantity(1, 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('computed values', () => {
    it('should calculate subtotal', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 50000 }));
      useCartStore.getState().addItem(mockProduct({ id: 2, name: 'B', price: 30000 }));
      expect(useCartStore.getState().getSubtotal()).toBe(80000);
    });

    it('should return 0 for empty cart', () => {
      expect(useCartStore.getState().getSubtotal()).toBe(0);
    });

    it('should calculate total with discount', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 100000 }));
      useCartStore.getState().setDiscount(mockDiscount({ value: 10, type: 'percentage' }));
      expect(useCartStore.getState().getTotal()).toBe(90000);
    });

    it('should calculate item count', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1 }), 3);
      useCartStore.getState().addItem(mockProduct({ id: 2, name: 'B' }), 2);
      expect(useCartStore.getState().getItemCount()).toBe(5);
    });
  });

  describe('discount calculation', () => {
    it('should calculate percentage discount', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 200000 }));
      useCartStore.getState().setDiscount(mockDiscount({ type: 'percentage', value: 15 }));
      expect(useCartStore.getState().discountAmount).toBe(30000);
    });

    it('should cap at maxDiscount', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 1000000 }));
      useCartStore.getState().setDiscount(mockDiscount({ type: 'percentage', value: 50, maxDiscount: 100000 }));
      expect(useCartStore.getState().discountAmount).toBe(100000);
    });

    it('should apply fixed discount', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 100000 }));
      useCartStore.getState().setDiscount(mockDiscount({ type: 'fixed', value: 25000 }));
      expect(useCartStore.getState().discountAmount).toBe(25000);
    });

    it('should not apply below minPurchase', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 30000 }));
      useCartStore.getState().setDiscount(mockDiscount({ type: 'percentage', value: 10, minPurchase: 50000 }));
      expect(useCartStore.getState().discountAmount).toBe(0);
    });

    it('should cap fixed discount at subtotal', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 10000 }));
      useCartStore.getState().setDiscount(mockDiscount({ type: 'fixed', value: 50000 }));
      expect(useCartStore.getState().discountAmount).toBe(10000);
      expect(useCartStore.getState().getTotal()).toBe(0);
    });

    it('should clamp negative discount to 0 (FIXED)', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 100000 }));
      useCartStore.getState().setDiscount(mockDiscount({ type: 'fixed', value: -5000 }));
      expect(useCartStore.getState().discountAmount).toBe(0);
      expect(useCartStore.getState().getTotal()).toBe(100000);
    });

    it('should clamp negative percentage discount to 0 (FIXED)', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 100000 }));
      useCartStore.getState().setDiscount(mockDiscount({ type: 'percentage', value: -10 }));
      expect(useCartStore.getState().discountAmount).toBe(0);
      expect(useCartStore.getState().getTotal()).toBe(100000);
    });

    it('should handle percentage > 100% (capped at subtotal)', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 100000 }));
      useCartStore.getState().setDiscount(mockDiscount({ type: 'percentage', value: 150 }));
      expect(useCartStore.getState().discountAmount).toBe(100000);
    });

    it('should recalculate when items change', () => {
      useCartStore.getState().setDiscount(mockDiscount({ type: 'percentage', value: 10, minPurchase: 50000 }));
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 30000 }));
      expect(useCartStore.getState().discountAmount).toBe(0);
      useCartStore.getState().addItem(mockProduct({ id: 2, name: 'B', price: 30000 }));
      expect(useCartStore.getState().discountAmount).toBe(6000);
    });

    it('should reset on discount removal', () => {
      useCartStore.getState().addItem(mockProduct({ id: 1, price: 100000 }));
      useCartStore.getState().setDiscount(mockDiscount({ type: 'percentage', value: 10 }));
      expect(useCartStore.getState().discountAmount).toBe(10000);
      useCartStore.getState().setDiscount(null);
      expect(useCartStore.getState().discountAmount).toBe(0);
    });
  });

  describe('clearCart', () => {
    it('should reset all state', () => {
      useCartStore.getState().addItem(mockProduct());
      useCartStore.getState().setCustomer({ id: 1 } as any);
      useCartStore.getState().setNotes('test');
      useCartStore.getState().clearCart();
      const s = useCartStore.getState();
      expect(s.items).toHaveLength(0);
      expect(s.customer).toBeNull();
      expect(s.discount).toBeNull();
      expect(s.notes).toBe('');
    });
  });

  describe('floating point precision', () => {
    it('should use Math.round for subtotal', () => {
      useCartStore.getState().addItem(mockProduct({ price: 33333 }), 3);
      expect(useCartStore.getState().items[0].subtotal).toBe(99999);
    });

    it('should handle fractional quantities', () => {
      useCartStore.getState().addItem(mockProduct({ price: 15000, qtyStep: 0.5 }));
      expect(useCartStore.getState().items[0].subtotal).toBe(7500);
    });

    it('should round floating point errors', () => {
      useCartStore.getState().addItem(mockProduct({ price: 19900, qtyStep: 0.1 }));
      expect(useCartStore.getState().items[0].subtotal).toBe(1990);
    });
  });
});
