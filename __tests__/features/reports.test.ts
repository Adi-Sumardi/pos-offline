/**
 * Tests for report calculations and data aggregation logic.
 */
import { formatRupiah } from '@/utils/currency';

describe('report features', () => {
  // ═══════════════════════════════════════════════════════
  // Sales summary
  // ═══════════════════════════════════════════════════════
  describe('sales summary calculation', () => {
    interface SalesSummary {
      totalRevenue: number; totalCost: number; grossProfit: number;
      transactionCount: number; avgTransaction: number;
      totalDiscount: number; cashSales: number; debtSales: number;
    }

    function calcSalesSummary(transactions: {
      total: number; costTotal: number; discountAmount: number;
      paymentType: string; status: string;
    }[]): SalesSummary {
      const done = transactions.filter((t) => t.status === 'DONE');
      const totalRevenue = done.reduce((s, t) => s + t.total, 0);
      const totalCost = done.reduce((s, t) => s + t.costTotal, 0);
      const totalDiscount = done.reduce((s, t) => s + t.discountAmount, 0);
      const cashSales = done.filter((t) => t.paymentType === 'cash').reduce((s, t) => s + t.total, 0);
      const debtSales = done.filter((t) => t.paymentType === 'debt').reduce((s, t) => s + t.total, 0);
      const count = done.length;

      return {
        totalRevenue, totalCost,
        grossProfit: totalRevenue - totalCost,
        transactionCount: count,
        avgTransaction: count > 0 ? Math.round(totalRevenue / count) : 0,
        totalDiscount, cashSales, debtSales,
      };
    }

    const txns = [
      { total: 100000, costTotal: 70000, discountAmount: 5000, paymentType: 'cash', status: 'DONE' },
      { total: 200000, costTotal: 140000, discountAmount: 0, paymentType: 'debt', status: 'DONE' },
      { total: 50000, costTotal: 30000, discountAmount: 0, paymentType: 'cash', status: 'VOID' },
    ];

    it('should exclude VOID transactions', () => {
      const s = calcSalesSummary(txns);
      expect(s.transactionCount).toBe(2);
    });

    it('should calculate total revenue', () => {
      expect(calcSalesSummary(txns).totalRevenue).toBe(300000);
    });

    it('should calculate gross profit', () => {
      expect(calcSalesSummary(txns).grossProfit).toBe(90000);
    });

    it('should calculate average transaction', () => {
      expect(calcSalesSummary(txns).avgTransaction).toBe(150000);
    });

    it('should separate cash vs debt', () => {
      const s = calcSalesSummary(txns);
      expect(s.cashSales).toBe(100000);
      expect(s.debtSales).toBe(200000);
    });

    it('should handle empty transactions', () => {
      const s = calcSalesSummary([]);
      expect(s.totalRevenue).toBe(0);
      expect(s.avgTransaction).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Top products ranking
  // ═══════════════════════════════════════════════════════
  describe('top products', () => {
    function getTopProducts(items: { productName: string; quantity: number; subtotal: number }[], limit: number) {
      const grouped = new Map<string, { totalQty: number; totalRevenue: number }>();
      for (const item of items) {
        const existing = grouped.get(item.productName) ?? { totalQty: 0, totalRevenue: 0 };
        grouped.set(item.productName, {
          totalQty: existing.totalQty + item.quantity,
          totalRevenue: existing.totalRevenue + item.subtotal,
        });
      }
      return [...grouped.entries()]
        .map(([name, data]) => ({ productName: name, ...data }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
    }

    const items = [
      { productName: 'Oli', quantity: 5, subtotal: 250000 },
      { productName: 'Busi', quantity: 10, subtotal: 250000 },
      { productName: 'Oli', quantity: 3, subtotal: 150000 },
      { productName: 'Filter', quantity: 2, subtotal: 60000 },
    ];

    it('should group by product name', () => {
      const top = getTopProducts(items, 10);
      expect(top).toHaveLength(3);
    });

    it('should aggregate quantities', () => {
      const top = getTopProducts(items, 10);
      const oli = top.find((p) => p.productName === 'Oli');
      expect(oli?.totalQty).toBe(8);
      expect(oli?.totalRevenue).toBe(400000);
    });

    it('should sort by revenue descending', () => {
      const top = getTopProducts(items, 10);
      expect(top[0].productName).toBe('Oli');
    });

    it('should limit results', () => {
      const top = getTopProducts(items, 2);
      expect(top).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Cash flow summary
  // ═══════════════════════════════════════════════════════
  describe('cash flow summary', () => {
    function calcCashFlow(cashIn: number, debtPaid: number, expenseOut: number) {
      const totalIn = cashIn + debtPaid;
      return { cashIn, debtPaid, totalIn, totalOut: expenseOut, netCashFlow: totalIn - expenseOut };
    }

    it('should calculate net cash flow', () => {
      const cf = calcCashFlow(500000, 100000, 200000);
      expect(cf.totalIn).toBe(600000);
      expect(cf.netCashFlow).toBe(400000);
    });

    it('should handle negative net (more expenses)', () => {
      const cf = calcCashFlow(100000, 0, 300000);
      expect(cf.netCashFlow).toBe(-200000);
    });

    it('should handle zero everything', () => {
      const cf = calcCashFlow(0, 0, 0);
      expect(cf.netCashFlow).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Expense breakdown
  // ═══════════════════════════════════════════════════════
  describe('expense breakdown', () => {
    function groupExpenses(expenses: { category: string; amount: number }[]) {
      const grouped = new Map<string, { total: number; count: number }>();
      for (const e of expenses) {
        const existing = grouped.get(e.category) ?? { total: 0, count: 0 };
        grouped.set(e.category, { total: existing.total + e.amount, count: existing.count + 1 });
      }
      return [...grouped.entries()]
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.total - a.total);
    }

    it('should group by category', () => {
      const result = groupExpenses([
        { category: 'Operasional', amount: 50000 },
        { category: 'Transport', amount: 30000 },
        { category: 'Operasional', amount: 20000 },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Operasional');
      expect(result[0].total).toBe(70000);
      expect(result[0].count).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Debt report
  // ═══════════════════════════════════════════════════════
  describe('debt report', () => {
    function calcDebtPercent(balance: number, limit: number) {
      if (limit <= 0) return 0;
      return Math.round((balance * 100) / limit * 10) / 10;
    }

    it('should calculate debt percentage', () => {
      expect(calcDebtPercent(250000, 500000)).toBe(50);
    });
    it('should handle 100%', () => {
      expect(calcDebtPercent(500000, 500000)).toBe(100);
    });
    it('should handle 0 limit', () => {
      expect(calcDebtPercent(0, 0)).toBe(0);
    });
    it('should handle fractional percentages', () => {
      expect(calcDebtPercent(333333, 1000000)).toBe(33.3);
    });
  });
});
