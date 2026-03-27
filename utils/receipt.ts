import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getAllSettings } from '@/db/queries/settings';
import { getTransactionByCode, getTransactionItems } from '@/db/queries/transactions';
import { formatRupiah, formatQty } from './currency';
import { formatDateTime } from './date';

interface ReceiptData {
  trxCode: string;
  items: {
    productName: string;
    quantity: number;
    productUnit: string;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  discountName: string | null;
  discountAmount: number;
  total: number;
  paymentType: 'cash' | 'debt';
  amountPaid: number;
  changeAmount: number;
  customerName?: string | null;
  cashierName: string;
  notes?: string | null;
  createdAt: string | null;
}

function buildReceiptHtml(data: ReceiptData, settings: Record<string, string>): string {
  const storeName = settings.store_name || 'Toko Kurnia';
  const storeAddress = settings.store_address || '';
  const storePhone = settings.store_phone || '';
  const receiptFooter = settings.receipt_footer || 'Terima kasih telah berbelanja!';

  const itemsHtml = data.items
    .map(
      (item) => `
      <div class="item-name">${item.productName}</div>
      <div class="row">
        <span>${formatQty(item.quantity, item.productUnit)} × ${formatRupiah(item.unitPrice)}</span>
        <span>${formatRupiah(item.subtotal)}</span>
      </div>`
    )
    .join('');

  const discountHtml =
    data.discountAmount > 0
      ? `<div class="row"><span>Diskon ${data.discountName || ''}</span><span>-${formatRupiah(data.discountAmount)}</span></div>`
      : '';

  const changeHtml =
    data.paymentType === 'cash' && data.changeAmount > 0
      ? `<div class="row"><span>Kembalian</span><span>${formatRupiah(data.changeAmount)}</span></div>`
      : '';

  const debtHtml =
    data.paymentType === 'debt'
      ? `<div class="row"><span>Pembayaran</span><span>HUTANG</span></div>`
      : `<div class="row"><span>Tunai</span><span>${formatRupiah(data.amountPaid)}</span></div>${changeHtml}`;

  const memberHtml = data.customerName
    ? `<div class="row"><span>Member</span><span>${data.customerName}</span></div>`
    : '';

  const notesHtml = data.notes
    ? `<div style="margin-top:4px;font-size:10px;color:#555">Catatan: ${data.notes}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    width: 280px;
    margin: 0 auto;
    padding: 8px 4px;
    color: #000;
  }
  .center { text-align: center; }
  .store-name { font-size: 16px; font-weight: bold; text-align: center; }
  .store-info { font-size: 10px; text-align: center; color: #333; margin-top: 2px; }
  .dashed { border-top: 1px dashed #000; margin: 6px 0; }
  .row {
    display: flex;
    justify-content: space-between;
    margin: 2px 0;
  }
  .row span:last-child { text-align: right; }
  .item-name { font-weight: bold; margin-top: 4px; }
  .total-row {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
    font-size: 14px;
    margin: 2px 0;
  }
  .footer { text-align: center; font-size: 10px; margin-top: 4px; color: #555; }
  .trx-code { font-size: 10px; }
</style>
</head>
<body>
  <div class="store-name">${storeName}</div>
  ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ''}
  ${storePhone ? `<div class="store-info">Telp: ${storePhone}</div>` : ''}
  <div class="dashed"></div>
  <div class="row">
    <span class="trx-code">${data.trxCode}</span>
    <span class="trx-code">${formatDateTime(data.createdAt)}</span>
  </div>
  <div class="row"><span>Kasir</span><span>${data.cashierName}</span></div>
  ${memberHtml}
  <div class="dashed"></div>
  ${itemsHtml}
  <div class="dashed"></div>
  <div class="row"><span>Subtotal</span><span>${formatRupiah(data.subtotal)}</span></div>
  ${discountHtml}
  <div class="total-row"><span>TOTAL</span><span>${formatRupiah(data.total)}</span></div>
  <div class="dashed"></div>
  ${debtHtml}
  ${notesHtml}
  <div class="dashed"></div>
  <div class="footer">${receiptFooter}</div>
</body>
</html>`;
}

/**
 * Print struk transaksi langsung ke printer.
 */
export async function printReceipt(data: ReceiptData): Promise<void> {
  const settings = await getAllSettings();
  const html = buildReceiptHtml(data, settings);
  await Print.printAsync({ html });
}

/**
 * Cetak ulang struk dari trxCode — ambil data dari DB.
 */
export async function reprintReceipt(trxCode: string, cashierName: string): Promise<void> {
  const trx = await getTransactionByCode(trxCode);
  if (!trx) throw new Error('Transaksi tidak ditemukan');

  const items = await getTransactionItems(trx.id);
  const settings = await getAllSettings();

  const data: ReceiptData = {
    trxCode: trx.trxCode,
    items: items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      productUnit: i.productUnit,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
    subtotal: trx.subtotal,
    discountName: trx.discountName,
    discountAmount: trx.discountAmount,
    total: trx.total,
    paymentType: trx.paymentType as 'cash' | 'debt',
    amountPaid: trx.amountPaid,
    changeAmount: trx.changeAmount,
    cashierName,
    notes: trx.notes,
    createdAt: trx.createdAt,
  };

  const html = buildReceiptHtml(data, settings);
  await Print.printAsync({ html });
}

/**
 * Simpan struk sebagai PDF lalu bagikan (WhatsApp, dll).
 */
export async function shareReceipt(data: ReceiptData): Promise<void> {
  const settings = await getAllSettings();
  const html = buildReceiptHtml(data, settings);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Struk ${data.trxCode}`,
    UTI: 'com.adobe.pdf',
  });
}

export type { ReceiptData };
