import { formatRupiah, formatNumber, parseRupiah, formatQty } from '@/utils/currency';

describe('currency utils', () => {
  // ═══════════════════════════════════════════════════════
  // formatRupiah
  // ═══════════════════════════════════════════════════════
  describe('formatRupiah', () => {
    it('should format integer amount with Rp prefix', () => {
      expect(formatRupiah(150000)).toMatch(/^Rp\s/);
      expect(formatRupiah(150000)).toContain('150');
    });

    it('should format zero', () => {
      expect(formatRupiah(0)).toMatch(/^Rp\s0$/);
    });

    it('should round float amounts', () => {
      expect(formatRupiah(999.7)).toBe('Rp 1.000');
    });

    it('should handle negative amounts', () => {
      const result = formatRupiah(-5000);
      expect(result).toContain('5');
    });

    it('should handle NaN gracefully (FIXED)', () => {
      expect(formatRupiah(NaN)).toBe('Rp 0');
    });

    it('should handle very large amounts', () => {
      expect(formatRupiah(999999999999)).toMatch(/^Rp\s/);
    });
  });

  // ═══════════════════════════════════════════════════════
  // formatNumber
  // ═══════════════════════════════════════════════════════
  describe('formatNumber', () => {
    it('should format without Rp prefix', () => {
      expect(formatNumber(150000)).not.toContain('Rp');
    });

    it('should format zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle NaN gracefully (FIXED)', () => {
      expect(formatNumber(NaN)).toBe('0');
    });
  });

  // ═══════════════════════════════════════════════════════
  // parseRupiah
  // ═══════════════════════════════════════════════════════
  describe('parseRupiah', () => {
    it('should parse formatted number string', () => {
      expect(parseRupiah('150.000')).toBe(150000);
    });

    it('should handle string with Rp prefix', () => {
      expect(parseRupiah('Rp 150.000')).toBe(150000);
    });

    it('should return 0 for empty string', () => {
      expect(parseRupiah('')).toBe(0);
    });

    it('should return 0 for non-numeric string', () => {
      expect(parseRupiah('abc')).toBe(0);
    });

    it('should parse plain number string', () => {
      expect(parseRupiah('50000')).toBe(50000);
    });

    it('should handle negative numbers correctly (FIXED)', () => {
      expect(parseRupiah('-5000')).toBe(-5000);
    });

    it('should handle negative formatted string (FIXED)', () => {
      expect(parseRupiah('-150.000')).toBe(-150000);
    });
  });

  // ═══════════════════════════════════════════════════════
  // formatQty
  // ═══════════════════════════════════════════════════════
  describe('formatQty', () => {
    it('should format integer quantity without decimals', () => {
      expect(formatQty(1, 'pcs')).toBe('1 pcs');
      expect(formatQty(10, 'pcs')).toBe('10 pcs');
    });

    it('should format decimal quantity with comma separator', () => {
      expect(formatQty(1.5, 'liter')).toBe('1,5 liter');
      expect(formatQty(0.5, 'kg')).toBe('0,5 kg');
    });

    it('should format zero', () => {
      expect(formatQty(0, 'pcs')).toBe('0 pcs');
    });

    it('should preserve 2-decimal precision (FIXED)', () => {
      expect(formatQty(1.75, 'liter')).toBe('1,75 liter');
      expect(formatQty(0.25, 'liter')).toBe('0,25 liter');
    });

    it('should not show trailing zeros', () => {
      expect(formatQty(1.5, 'liter')).toBe('1,5 liter');
    });

    it('should handle negative quantities', () => {
      expect(formatQty(-1, 'pcs')).toBe('-1 pcs');
    });

    it('should handle very small fractions with 2 decimal (FIXED)', () => {
      expect(formatQty(0.04, 'liter')).toBe('0,04 liter');
    });
  });
});
