/**
 * Format angka menjadi format Rupiah.
 * Contoh: 150000 → "Rp 150.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

/**
 * Format angka tanpa prefix "Rp".
 * Contoh: 150000 → "150.000"
 */
export function formatNumber(amount: number): string {
  if (isNaN(amount)) return '0';
  return Math.round(amount).toLocaleString('id-ID');
}

/**
 * Parse string Rupiah kembali ke number.
 * Mendukung tanda minus di depan.
 * Contoh: "150.000" → 150000, "-5.000" → -5000
 */
export function parseRupiah(value: string): number {
  const isNegative = value.trim().startsWith('-');
  const digits = value.replace(/\./g, '').replace(/[^0-9]/g, '');
  const num = parseInt(digits, 10) || 0;
  return isNegative ? -num : num;
}

/**
 * Format quantity: tampilkan desimal hanya jika bukan bulat.
 * Menggunakan presisi 2 desimal untuk menghindari kehilangan informasi.
 * Contoh: 1.0 → "1", 1.5 → "1,5", 0.25 → "0,25"
 */
export function formatQty(qty: number, unit: string): string {
  if (qty % 1 === 0) {
    return `${qty} ${unit}`;
  }
  // Gunakan 2 desimal, lalu hapus trailing zero
  const fixed = qty.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  const formatted = fixed.replace('.', ',');
  return `${formatted} ${unit}`;
}
