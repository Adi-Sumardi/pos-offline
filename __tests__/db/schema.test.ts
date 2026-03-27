import * as schema from '@/db/schema';

describe('database schema', () => {
  describe('table exports', () => {
    it('should export all 14 tables', () => {
      expect(schema.users).toBeDefined();
      expect(schema.categories).toBeDefined();
      expect(schema.products).toBeDefined();
      expect(schema.priceLogs).toBeDefined();
      expect(schema.customers).toBeDefined();
      expect(schema.transactions).toBeDefined();
      expect(schema.transactionItems).toBeDefined();
      expect(schema.debtPayments).toBeDefined();
      expect(schema.stockLogs).toBeDefined();
      expect(schema.cashFlow).toBeDefined();
      expect(schema.discounts).toBeDefined();
      expect(schema.expenses).toBeDefined();
      expect(schema.shifts).toBeDefined();
      expect(schema.appSettings).toBeDefined();
    });
  });

  describe('type exports', () => {
    it('should export User type', () => {
      const user: schema.User = {
        id: 1, username: 'admin', fullName: 'Admin', pinHash: 'hash',
        role: 'admin', isActive: true, createdAt: null, updatedAt: null,
      };
      expect(user.id).toBe(1);
    });

    it('should export Product type', () => {
      const product: schema.Product = {
        id: 1, sku: 'SKU-001', name: 'Test', categoryId: null,
        brand: null, unit: 'pcs', price: 10000, stock: 10,
        minStock: 5, qtyStep: 1, unitType: 'piece', location: null,
        hasQr: false, costPrice: 0, isActive: true, notes: null,
        createdAt: null, updatedAt: null,
      };
      expect(product.sku).toBe('SKU-001');
    });

    it('should export Customer type', () => {
      const customer: schema.Customer = {
        id: 1, memberCode: 'MBR-0001', fullName: 'Test', phone: '0812',
        address: null, debtLimit: 0, debtBalance: 0, isActive: true,
        notes: null, createdAt: null, updatedAt: null,
      };
      expect(customer.memberCode).toBe('MBR-0001');
    });

    it('should export Transaction type', () => {
      const tx: schema.Transaction = {
        id: 1, trxCode: 'TRX-20260326-0001', customerId: null,
        cashierId: 1, paymentType: 'cash', subtotal: 100000,
        discountId: null, discountName: null, discountAmount: 0,
        total: 100000, amountPaid: 100000, changeAmount: 0,
        status: 'DONE', voidReason: null, voidBy: null, voidAt: null,
        notes: null, createdAt: null,
      };
      expect(tx.status).toBe('DONE');
    });

    it('should export Discount type', () => {
      const d: schema.Discount = {
        id: 1, name: 'Test', type: 'percentage', value: 10,
        scope: 'all', scopeId: null, minPurchase: 0, maxDiscount: null,
        isActive: false, notes: null, createdBy: 1,
        createdAt: null, updatedAt: null,
      };
      expect(d.type).toBe('percentage');
    });

    // TS types are compile-time only, not available at runtime
    it('should confirm types are compile-time only', () => {
      expect('NewUser' in schema).toBe(false);
    });
  });
});
