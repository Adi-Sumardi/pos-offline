import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================================
// 1. USERS — Akun pengguna (admin & kasir)
// ============================================================
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  fullName: text('full_name').notNull(),
  pinHash: text('pin_hash').notNull(),
  role: text('role', { enum: ['admin', 'kasir'] }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// 2. CATEGORIES — Kategori produk
// ============================================================
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
});

// ============================================================
// 3. PRODUCTS — Master produk (+ has_qr, cost_price)
// ============================================================
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  brand: text('brand'),
  unit: text('unit').notNull().default('pcs'),          // pcs, liter, kg, set
  price: integer('price').notNull(),                     // harga per 1 satuan (Rupiah)
  stock: real('stock').notNull().default(0),              // REAL: mendukung desimal (10.5 liter)
  minStock: real('min_stock').notNull().default(5),
  qtyStep: real('qty_step').notNull().default(1),        // 1=bulat, 0.5=setengah
  unitType: text('unit_type', {
    enum: ['piece', 'bulk_small', 'liquid'],
  }).notNull().default('piece'),
  location: text('location'),                            // posisi rak: "C3", "A1-atas"
  hasQr: integer('has_qr', { mode: 'boolean' }).notNull().default(false),
  costPrice: integer('cost_price').notNull().default(0), // HPP (admin only)
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// 4. PRICE_LOGS — Riwayat perubahan harga produk
// ============================================================
export const priceLogs = sqliteTable('price_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  field: text('field', { enum: ['price', 'cost_price'] }).notNull(),
  oldValue: integer('old_value').notNull(),
  newValue: integer('new_value').notNull(),
  changedBy: integer('changed_by').notNull().references(() => users.id),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// 5. CUSTOMERS — Data member/pelanggan
// ============================================================
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberCode: text('member_code').notNull().unique(),     // MBR-XXXX
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull().unique(),
  address: text('address'),
  debtLimit: integer('debt_limit').notNull().default(0),  // 0 = tidak boleh hutang
  debtBalance: integer('debt_balance').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// 6. TRANSACTIONS — Header transaksi penjualan
// ============================================================
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  trxCode: text('trx_code').notNull().unique(),           // TRX-YYYYMMDD-XXXX
  customerId: integer('customer_id').references(() => customers.id),
  cashierId: integer('cashier_id').notNull().references(() => users.id),
  paymentType: text('payment_type', {
    enum: ['cash', 'debt'],
  }).notNull(),
  subtotal: integer('subtotal').notNull(),                // sebelum diskon
  discountId: integer('discount_id').references(() => discounts.id),
  discountName: text('discount_name'),                    // snapshot nama diskon
  discountAmount: integer('discount_amount').notNull().default(0),
  total: integer('total').notNull(),                      // subtotal - discount
  amountPaid: integer('amount_paid').notNull().default(0),
  changeAmount: integer('change_amount').notNull().default(0),
  status: text('status', {
    enum: ['DONE', 'VOID'],
  }).notNull().default('DONE'),
  voidReason: text('void_reason'),
  voidBy: integer('void_by').references(() => users.id),
  voidAt: text('void_at'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// 7. TRANSACTION_ITEMS — Detail item per transaksi
// ============================================================
export const transactionItems = sqliteTable('transaction_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  transactionId: integer('transaction_id').notNull().references(() => transactions.id),
  productId: integer('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(),            // snapshot
  productSku: text('product_sku').notNull(),
  productUnit: text('product_unit').notNull(),            // snapshot satuan
  unitPrice: integer('unit_price').notNull(),             // snapshot harga
  costPrice: integer('cost_price').notNull().default(0),  // snapshot HPP saat transaksi
  quantity: real('quantity').notNull(),                    // REAL: 0.5, 1.5
  subtotal: integer('subtotal').notNull(),                // ROUND(unitPrice × quantity)
});

// ============================================================
// 8. DEBT_PAYMENTS — Riwayat pembayaran hutang
// ============================================================
export const debtPayments = sqliteTable('debt_payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  cashierId: integer('cashier_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(),
  notes: text('notes'),
  paidAt: text('paid_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// 9. STOCK_LOGS — Audit trail perubahan stok
// ============================================================
export const stockLogs = sqliteTable('stock_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type', {
    enum: ['sale', 'adjustment', 'void_return'],
  }).notNull(),
  qtyBefore: real('qty_before').notNull(),
  qtyChange: real('qty_change').notNull(),                // negatif = pengurangan
  qtyAfter: real('qty_after').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// 10. CASH_FLOW — Arus kas masuk dan keluar
// ============================================================
export const cashFlow = sqliteTable('cash_flow', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['in', 'out'] }).notNull(),
  category: text('category').notNull(),                   // penjualan, bayar_hutang, pengeluaran
  amount: integer('amount').notNull(),
  transactionId: integer('transaction_id').references(() => transactions.id),
  userId: integer('user_id').notNull().references(() => users.id),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// 11. DISCOUNTS — Konfigurasi diskon
// ============================================================
export const discounts = sqliteTable('discounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['percentage', 'fixed'] }).notNull(),
  value: real('value').notNull(),                          // 10 = 10% atau 5000 = Rp 5.000
  scope: text('scope', {
    enum: ['all', 'category', 'product', 'member'],
  }).notNull().default('all'),
  scopeId: integer('scope_id'),                            // category_id / product_id
  minPurchase: integer('min_purchase').notNull().default(0),
  maxDiscount: integer('max_discount'),                    // batas atas
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// 12. EXPENSES — Pencatatan pengeluaran kas
// ============================================================
export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),                    // operasional, atk, transportasi, lain-lain
  amount: integer('amount').notNull(),
  notes: text('notes'),
  expenseDate: text('expense_date').notNull(),             // bisa backdate
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================
// 13. SHIFTS — Tutup shift kasir & serah terima kas
// ============================================================
export const shifts = sqliteTable('shifts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cashierId: integer('cashier_id').notNull().references(() => users.id),
  openingBalance: integer('opening_balance').notNull().default(0),
  closingBalance: integer('closing_balance'),              // input kasir saat tutup
  systemBalance: integer('system_balance'),               // dihitung dari transaksi shift ini
  difference: integer('difference'),                      // closingBalance - systemBalance
  status: text('status', { enum: ['OPEN', 'CLOSED'] }).notNull().default('OPEN'),
  openedAt: text('opened_at').default(sql`CURRENT_TIMESTAMP`),
  closedAt: text('closed_at'),
  notes: text('notes'),
});

// ============================================================
// 14. APP_SETTINGS — Konfigurasi aplikasi
// ============================================================
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value'),
});

// ============================================================
// Type Exports
// ============================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionItem = typeof transactionItems.$inferSelect;
export type NewTransactionItem = typeof transactionItems.$inferInsert;
export type DebtPayment = typeof debtPayments.$inferSelect;
export type NewDebtPayment = typeof debtPayments.$inferInsert;
export type Discount = typeof discounts.$inferSelect;
export type NewDiscount = typeof discounts.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type StockLog = typeof stockLogs.$inferSelect;
export type NewStockLog = typeof stockLogs.$inferInsert;
export type CashFlowEntry = typeof cashFlow.$inferSelect;
export type NewCashFlowEntry = typeof cashFlow.$inferInsert;
export type PriceLog = typeof priceLogs.$inferSelect;
export type NewPriceLog = typeof priceLogs.$inferInsert;
export type Shift = typeof shifts.$inferSelect;
export type NewShift = typeof shifts.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
