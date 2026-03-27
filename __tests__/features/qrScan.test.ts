/**
 * Tests for QR code / barcode scanning & product lookup logic.
 */

describe('QR / barcode scan features', () => {
  // ═══════════════════════════════════════════════════════
  // SKU normalization from scan result
  // ═══════════════════════════════════════════════════════
  describe('scan result normalization', () => {
    function normalizeScanResult(raw: string): string {
      return raw.trim().toUpperCase();
    }

    it('should trim whitespace', () => {
      expect(normalizeScanResult('  OLI-001  ')).toBe('OLI-001');
    });
    it('should convert to uppercase', () => {
      expect(normalizeScanResult('oli-001')).toBe('OLI-001');
    });
    it('should handle mixed case', () => {
      expect(normalizeScanResult('Filt-002')).toBe('FILT-002');
    });
    it('should handle newline/tab characters', () => {
      expect(normalizeScanResult('\tBUSI-001\n')).toBe('BUSI-001');
    });
    it('should return empty for empty input', () => {
      expect(normalizeScanResult('')).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════
  // Product lookup by SKU (simulated)
  // ═══════════════════════════════════════════════════════
  describe('product lookup by SKU', () => {
    const products = [
      { id: 1, sku: 'OLI-001', name: 'Oli Mesin', price: 50000, stock: 10, isActive: true },
      { id: 2, sku: 'FILT-002', name: 'Filter Udara', price: 30000, stock: 5, isActive: true },
      { id: 3, sku: 'BUSI-001', name: 'Busi NGK', price: 25000, stock: 0, isActive: true },
      { id: 4, sku: 'OLD-001', name: 'Produk Lama', price: 10000, stock: 3, isActive: false },
    ];

    function findBySku(sku: string) {
      const normalized = sku.trim().toUpperCase();
      return products.find((p) => p.sku === normalized && p.isActive) ?? null;
    }

    it('should find active product by SKU', () => {
      expect(findBySku('OLI-001')?.name).toBe('Oli Mesin');
    });

    it('should be case-insensitive', () => {
      expect(findBySku('filt-002')?.name).toBe('Filter Udara');
    });

    it('should return null for unknown SKU', () => {
      expect(findBySku('XXX-999')).toBeNull();
    });

    it('should NOT return inactive products', () => {
      expect(findBySku('OLD-001')).toBeNull();
    });

    it('should find product with zero stock (still scannable)', () => {
      expect(findBySku('BUSI-001')?.name).toBe('Busi NGK');
    });
  });

  // ═══════════════════════════════════════════════════════
  // QR code data format validation
  // ═══════════════════════════════════════════════════════
  describe('QR code data format', () => {
    function isValidSkuFormat(data: string): boolean {
      // SKU format: PREFIX-NNN (e.g., OLI-001, BUSI-005)
      return /^[A-Z0-9]{1,4}-\d{3,}$/.test(data.trim().toUpperCase());
    }

    it('should accept valid SKU format', () => {
      expect(isValidSkuFormat('OLI-001')).toBe(true);
      expect(isValidSkuFormat('BUSI-005')).toBe(true);
      expect(isValidSkuFormat('A-001')).toBe(true);
    });

    it('should accept lowercase (normalized)', () => {
      expect(isValidSkuFormat('oli-001')).toBe(true);
    });

    it('should reject format without dash', () => {
      expect(isValidSkuFormat('OLI001')).toBe(false);
    });

    it('should reject format with too-long prefix', () => {
      expect(isValidSkuFormat('TOOLONG-001')).toBe(false);
    });

    it('should reject empty', () => {
      expect(isValidSkuFormat('')).toBe(false);
    });

    it('should reject random URL', () => {
      expect(isValidSkuFormat('https://example.com')).toBe(false);
    });

    it('should reject just numbers', () => {
      expect(isValidSkuFormat('12345')).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Scan-to-cart flow
  // ═══════════════════════════════════════════════════════
  describe('scan to cart flow', () => {
    const products = [
      { id: 1, sku: 'OLI-001', name: 'Oli', price: 50000, stock: 10, isActive: true, qtyStep: 1 },
      { id: 2, sku: 'BUSI-001', name: 'Busi', price: 25000, stock: 0, isActive: true, qtyStep: 1 },
    ];

    function handleScan(sku: string): { success: boolean; message: string; product?: any } {
      const normalized = sku.trim().toUpperCase();
      if (!normalized) return { success: false, message: 'Kode kosong' };

      const product = products.find((p) => p.sku === normalized && p.isActive);
      if (!product) return { success: false, message: 'Produk tidak ditemukan' };
      if (product.stock <= 0) return { success: false, message: `Stok "${product.name}" habis` };

      return { success: true, message: `${product.name} ditambahkan`, product };
    }

    it('should add product on valid scan', () => {
      const result = handleScan('OLI-001');
      expect(result.success).toBe(true);
      expect(result.product?.name).toBe('Oli');
    });

    it('should reject unknown SKU', () => {
      const result = handleScan('XXX-999');
      expect(result.success).toBe(false);
      expect(result.message).toContain('tidak ditemukan');
    });

    it('should reject zero stock product', () => {
      const result = handleScan('BUSI-001');
      expect(result.success).toBe(false);
      expect(result.message).toContain('habis');
    });

    it('should reject empty scan', () => {
      const result = handleScan('');
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // Price check from scan
  // ═══════════════════════════════════════════════════════
  describe('price check', () => {
    function priceCheck(sku: string, products: { sku: string; name: string; price: number; stock: number }[]) {
      const p = products.find((x) => x.sku === sku.trim().toUpperCase());
      if (!p) return null;
      return { name: p.name, price: p.price, stock: p.stock, available: p.stock > 0 };
    }

    const products = [
      { sku: 'OLI-001', name: 'Oli', price: 50000, stock: 10 },
      { sku: 'BUSI-001', name: 'Busi', price: 25000, stock: 0 },
    ];

    it('should return price info for valid SKU', () => {
      const info = priceCheck('OLI-001', products);
      expect(info?.price).toBe(50000);
      expect(info?.available).toBe(true);
    });

    it('should indicate unavailable for zero stock', () => {
      const info = priceCheck('BUSI-001', products);
      expect(info?.available).toBe(false);
    });

    it('should return null for unknown SKU', () => {
      expect(priceCheck('XXX-999', products)).toBeNull();
    });
  });
});
