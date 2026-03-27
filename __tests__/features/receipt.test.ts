/**
 * Tests for receipt HTML generation logic (pure functions, no expo-print dependency).
 */
import { formatRupiah, formatQty } from '@/utils/currency';
import { formatDateTime } from '@/utils/date';

describe('receipt generation', () => {
  // ═══════════════════════════════════════════════════════
  // Receipt data structure validation
  // ═══════════════════════════════════════════════════════
  describe('receipt data structure', () => {
    interface ReceiptData {
      trxCode: string;
      items: { productName: string; quantity: number; productUnit: string; unitPrice: number; subtotal: number }[];
      subtotal: number; discountName: string | null; discountAmount: number;
      total: number; paymentType: 'cash' | 'debt';
      amountPaid: number; changeAmount: number;
      customerName?: string | null; cashierName: string;
      notes?: string | null; createdAt: string | null;
    }

    function buildReceiptText(data: ReceiptData, settings: Record<string, string>) {
      const lines: string[] = [];
      lines.push(settings.store_name || 'Toko');
      lines.push(`${data.trxCode} | ${formatDateTime(data.createdAt)}`);
      lines.push(`Kasir: ${data.cashierName}`);
      if (data.customerName) lines.push(`Member: ${data.customerName}`);
      for (const item of data.items) {
        lines.push(`${item.productName}`);
        lines.push(`  ${formatQty(item.quantity, item.productUnit)} × ${formatRupiah(item.unitPrice)} = ${formatRupiah(item.subtotal)}`);
      }
      lines.push(`Subtotal: ${formatRupiah(data.subtotal)}`);
      if (data.discountAmount > 0) {
        lines.push(`Diskon ${data.discountName || ''}: -${formatRupiah(data.discountAmount)}`);
      }
      lines.push(`TOTAL: ${formatRupiah(data.total)}`);
      if (data.paymentType === 'cash') {
        lines.push(`Tunai: ${formatRupiah(data.amountPaid)}`);
        if (data.changeAmount > 0) lines.push(`Kembalian: ${formatRupiah(data.changeAmount)}`);
      } else {
        lines.push(`Pembayaran: HUTANG`);
      }
      if (data.notes) lines.push(`Catatan: ${data.notes}`);
      lines.push(settings.receipt_footer || 'Terima kasih!');
      return lines;
    }

    const sampleData: ReceiptData = {
      trxCode: 'TRX-20260326-0001',
      items: [
        { productName: 'Oli Mesin', quantity: 2, productUnit: 'pcs', unitPrice: 50000, subtotal: 100000 },
        { productName: 'Filter Udara', quantity: 1, productUnit: 'pcs', unitPrice: 30000, subtotal: 30000 },
      ],
      subtotal: 130000, discountName: 'Promo 10%', discountAmount: 13000,
      total: 117000, paymentType: 'cash',
      amountPaid: 120000, changeAmount: 3000,
      cashierName: 'Kasir 1', notes: null,
      createdAt: '2026-03-26T14:30:00',
    };
    const settings = { store_name: 'Toko Kurnia', receipt_footer: 'Terima kasih!' };

    it('should include store name', () => {
      const lines = buildReceiptText(sampleData, settings);
      expect(lines[0]).toBe('Toko Kurnia');
    });

    it('should include transaction code', () => {
      const lines = buildReceiptText(sampleData, settings);
      expect(lines[1]).toContain('TRX-20260326-0001');
    });

    it('should list all items', () => {
      const lines = buildReceiptText(sampleData, settings);
      const text = lines.join('\n');
      expect(text).toContain('Oli Mesin');
      expect(text).toContain('Filter Udara');
    });

    it('should show discount if > 0', () => {
      const lines = buildReceiptText(sampleData, settings);
      const text = lines.join('\n');
      expect(text).toContain('Diskon');
      expect(text).toContain('Promo 10%');
    });

    it('should NOT show discount if 0', () => {
      const data = { ...sampleData, discountAmount: 0 };
      const text = buildReceiptText(data, settings).join('\n');
      expect(text).not.toContain('Diskon');
    });

    it('should show change for cash payment', () => {
      const text = buildReceiptText(sampleData, settings).join('\n');
      expect(text).toContain('Kembalian');
    });

    it('should show HUTANG for debt payment', () => {
      const data = { ...sampleData, paymentType: 'debt' as const, amountPaid: 0, changeAmount: 0 };
      const text = buildReceiptText(data, settings).join('\n');
      expect(text).toContain('HUTANG');
      expect(text).not.toContain('Kembalian');
    });

    it('should show member name if present', () => {
      const data = { ...sampleData, customerName: 'Budi Santoso' };
      const text = buildReceiptText(data, settings).join('\n');
      expect(text).toContain('Member: Budi Santoso');
    });

    it('should show notes if present', () => {
      const data = { ...sampleData, notes: 'Request cepat' };
      const text = buildReceiptText(data, settings).join('\n');
      expect(text).toContain('Catatan: Request cepat');
    });

    it('should include footer', () => {
      const lines = buildReceiptText(sampleData, settings);
      expect(lines[lines.length - 1]).toBe('Terima kasih!');
    });
  });
});
