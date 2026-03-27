import dayjs from 'dayjs';

/**
 * Generate kode transaksi: TRX-YYYYMMDD-XXXX
 * Contoh: TRX-20260326-0001
 */
export function generateTrxCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Sequence harus bilangan bulat positif (≥ 1)');
  }
  const date = dayjs().format('YYYYMMDD');
  const seq = String(sequence).padStart(4, '0');
  return `TRX-${date}-${seq}`;
}

/**
 * Generate kode member: MBR-XXXX
 * Contoh: MBR-0042
 */
export function generateMemberCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Sequence harus bilangan bulat positif (≥ 1)');
  }
  const seq = String(sequence).padStart(4, '0');
  return `MBR-${seq}`;
}

/**
 * Generate SKU otomatis dari nama kategori + urutan.
 * Contoh: kategori "Oli" → "OLI-001"
 */
export function generateSku(categoryName: string, sequence: number): string {
  const prefix = categoryName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 4);
  if (!prefix) {
    throw new Error('Nama kategori harus mengandung minimal 1 karakter alfanumerik');
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Sequence harus bilangan bulat positif (≥ 1)');
  }
  const seq = String(sequence).padStart(3, '0');
  return `${prefix}-${seq}`;
}

/**
 * Ambil sequence berikutnya dari kode transaksi hari ini.
 * Dipakai di queries untuk auto-increment harian.
 */
export function todayTrxPrefix(): string {
  return `TRX-${dayjs().format('YYYYMMDD')}-`;
}
