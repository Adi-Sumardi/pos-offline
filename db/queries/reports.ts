import { sql, and, gte, lte, eq } from 'drizzle-orm';
import { getSqliteDb } from '../index';
import { transactions, transactionItems, expenses, products, customers } from '../schema';

export interface SalesSummary {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  transactionCount: number;
  avgTransaction: number;
  totalDiscount: number;
  cashSales: number;
  debtSales: number;
}

export interface DailySales {
  date: string;
  revenue: number;
  transactionCount: number;
}

export async function getSalesSummary(from: string, to: string): Promise<SalesSummary> {
  const db = getSqliteDb();

  const result = await db.getFirstAsync<{
    totalRevenue: number;
    totalDiscount: number;
    transactionCount: number;
    cashSales: number;
    debtSales: number;
  }>(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'DONE' THEN total ELSE 0 END), 0) as totalRevenue,
      COALESCE(SUM(CASE WHEN status = 'DONE' THEN discount_amount ELSE 0 END), 0) as totalDiscount,
      COUNT(CASE WHEN status = 'DONE' THEN 1 END) as transactionCount,
      COALESCE(SUM(CASE WHEN status = 'DONE' AND payment_type = 'cash' THEN total ELSE 0 END), 0) as cashSales,
      COALESCE(SUM(CASE WHEN status = 'DONE' AND payment_type = 'debt' THEN total ELSE 0 END), 0) as debtSales
    FROM transactions
    WHERE date(created_at) >= ? AND date(created_at) <= ?`,
    [from, to]
  );

  // HPP dari transaction_items
  const costResult = await db.getFirstAsync<{ totalCost: number }>(
    `SELECT COALESCE(SUM(ti.cost_price * ti.quantity), 0) as totalCost
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE date(t.created_at) >= ? AND date(t.created_at) <= ? AND t.status = 'DONE'`,
    [from, to]
  );

  const totalRevenue = result?.totalRevenue ?? 0;
  const totalCost = costResult?.totalCost ?? 0;
  const count = result?.transactionCount ?? 0;

  return {
    totalRevenue,
    totalCost,
    grossProfit: totalRevenue - totalCost,
    transactionCount: count,
    avgTransaction: count > 0 ? Math.round(totalRevenue / count) : 0,
    totalDiscount: result?.totalDiscount ?? 0,
    cashSales: result?.cashSales ?? 0,
    debtSales: result?.debtSales ?? 0,
  };
}

export async function getDailySales(from: string, to: string): Promise<DailySales[]> {
  const db = getSqliteDb();
  return db.getAllAsync<DailySales>(
    `SELECT
      date(created_at) as date,
      SUM(CASE WHEN status = 'DONE' THEN total ELSE 0 END) as revenue,
      COUNT(CASE WHEN status = 'DONE' THEN 1 END) as transactionCount
    FROM transactions
    WHERE date(created_at) >= ? AND date(created_at) <= ?
    GROUP BY date(created_at)
    ORDER BY date(created_at) ASC`,
    [from, to]
  );
}

export async function getTopProducts(from: string, to: string, limit = 10) {
  const db = getSqliteDb();
  return db.getAllAsync<{
    productName: string;
    productSku: string;
    totalQty: number;
    totalRevenue: number;
  }>(
    `SELECT
      ti.product_name as productName,
      ti.product_sku as productSku,
      SUM(ti.quantity) as totalQty,
      SUM(ti.subtotal) as totalRevenue
    FROM transaction_items ti
    JOIN transactions t ON ti.transaction_id = t.id
    WHERE date(t.created_at) >= ? AND date(t.created_at) <= ? AND t.status = 'DONE'
    GROUP BY ti.product_id
    ORDER BY totalRevenue DESC
    LIMIT ?`,
    [from, to, limit]
  );
}

export async function getCashFlowSummary(from: string, to: string) {
  const db = getSqliteDb();
  const salesIn = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total FROM transactions
     WHERE status = 'DONE' AND payment_type = 'cash'
     AND date(created_at) >= ? AND date(created_at) <= ?`,
    [from, to]
  );
  const debtPaid = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments
     WHERE date(paid_at) >= ? AND date(paid_at) <= ?`,
    [from, to]
  );
  const expenseOut = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
     WHERE date(expense_date) >= ? AND date(expense_date) <= ?`,
    [from, to]
  );

  const totalIn = (salesIn?.total ?? 0) + (debtPaid?.total ?? 0);
  const totalOut = expenseOut?.total ?? 0;
  return {
    cashIn: salesIn?.total ?? 0,
    debtPaid: debtPaid?.total ?? 0,
    totalIn,
    totalOut,
    netCashFlow: totalIn - totalOut,
  };
}

export async function getExpensesByPeriod(from: string, to: string) {
  const db = getSqliteDb();
  return db.getAllAsync<{
    category: string;
    total: number;
    count: number;
  }>(
    `SELECT category, SUM(amount) as total, COUNT(*) as count
     FROM expenses
     WHERE date(expense_date) >= ? AND date(expense_date) <= ?
     GROUP BY category
     ORDER BY total DESC`,
    [from, to]
  );
}

export async function getDebtReport() {
  const db = getSqliteDb();
  return db.getAllAsync<{
    id: number;
    memberCode: string;
    fullName: string;
    phone: string;
    debtBalance: number;
    debtLimit: number;
    debtPercent: number;
  }>(
    `SELECT
      id, member_code as memberCode, full_name as fullName,
      phone, debt_balance as debtBalance, debt_limit as debtLimit,
      CASE WHEN debt_limit > 0 THEN ROUND(debt_balance * 100.0 / debt_limit, 1) ELSE 0 END as debtPercent
    FROM customers
    WHERE debt_balance > 0 AND is_active = 1
    ORDER BY debt_balance DESC`
  );
}
