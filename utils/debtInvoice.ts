import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getAllSettings } from '@/db/queries/settings';
import { getCustomerById, getCustomerDebtHistory, getDebtPaymentHistory } from '@/db/queries/customers';
import { formatRupiah } from './currency';
import { formatDate, formatDateTime } from './date';

export interface DebtInvoiceData {
  customerName: string;
  memberCode: string;
  phone: string;
  address: string;
  debtBalance: number;
  debtLimit: number;
  debtTransactions: {
    trxCode: string;
    total: number;
    createdAt: string | null;
    status: string;
  }[];
  payments: {
    amount: number;
    paidAt: string | null;
    notes: string | null;
  }[];
  generatedAt: string;
}

function buildDebtInvoiceHtml(data: DebtInvoiceData, settings: Record<string, string>): string {
  const storeName = settings.store_name || 'Toko Kurnia';
  const storeAddress = settings.store_address || '';
  const storePhone = settings.store_phone || '';

  // Filter only DONE transactions with debt payment type
  const debtTransactions = data.debtTransactions.filter((t) => t.status === 'DONE');

  const trxRows = debtTransactions
    .map(
      (t) => `
      <tr>
        <td>${t.trxCode}</td>
        <td>${formatDateTime(t.createdAt)}</td>
        <td style="text-align:right;font-weight:600">${formatRupiah(t.total)}</td>
      </tr>`
    )
    .join('');

  const payRows = data.payments
    .map(
      (p) => `
      <tr>
        <td>${formatDateTime(p.paidAt)}</td>
        <td>${p.notes || '-'}</td>
        <td style="text-align:right;color:#2E7D32;font-weight:600">${formatRupiah(p.amount)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 12px;
    max-width: 500px;
    margin: 0 auto;
    padding: 16px;
    color: #212121;
  }
  .header { text-align: center; margin-bottom: 16px; }
  .store-name { font-size: 18px; font-weight: bold; color: #1565C0; }
  .store-info { font-size: 10px; color: #616161; margin-top: 2px; }
  .title {
    font-size: 14px; font-weight: bold;
    text-align: center; padding: 8px;
    background: #FFF3E0; border-radius: 4px;
    color: #E65100; margin: 12px 0;
  }
  .info-grid {
    display: grid; grid-template-columns: 100px 1fr;
    gap: 4px; margin-bottom: 12px; font-size: 11px;
  }
  .info-label { color: #616161; }
  .info-val { font-weight: 600; }
  .debt-box {
    background: #FFEBEE; border-radius: 8px; padding: 12px;
    text-align: center; margin: 12px 0;
  }
  .debt-amount { font-size: 20px; font-weight: 800; color: #C62828; }
  .debt-label { font-size: 10px; color: #616161; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px; }
  th { background: #F5F6FA; text-align: left; padding: 6px 4px; font-weight: 600; border-bottom: 1px solid #E0E0E0; }
  td { padding: 5px 4px; border-bottom: 1px solid #EEEEEE; }
  .section-title { font-size: 12px; font-weight: 700; color: #1565C0; margin-top: 16px; }
  .footer {
    margin-top: 20px; padding-top: 10px;
    border-top: 1px dashed #ccc;
    font-size: 10px; color: #9E9E9E; text-align: center;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="store-name">${storeName}</div>
    ${storeAddress ? `<div class="store-info">${storeAddress}</div>` : ''}
    ${storePhone ? `<div class="store-info">Telp: ${storePhone}</div>` : ''}
  </div>

  <div class="title">📋 SURAT TAGIHAN HUTANG</div>

  <div class="info-grid">
    <span class="info-label">Nama</span>
    <span class="info-val">${data.customerName}</span>
    <span class="info-label">Kode Member</span>
    <span class="info-val">${data.memberCode}</span>
    <span class="info-label">No. HP</span>
    <span class="info-val">${data.phone}</span>
    ${data.address ? `<span class="info-label">Alamat</span><span class="info-val">${data.address}</span>` : ''}
    <span class="info-label">Tanggal Cetak</span>
    <span class="info-val">${formatDateTime(data.generatedAt)}</span>
  </div>

  <div class="debt-box">
    <div class="debt-label">TOTAL SALDO HUTANG</div>
    <div class="debt-amount">${formatRupiah(data.debtBalance)}</div>
    <div class="debt-label">Limit: ${formatRupiah(data.debtLimit)}</div>
  </div>

  ${debtTransactions.length > 0 ? `
  <div class="section-title">Riwayat Transaksi Hutang</div>
  <table>
    <thead>
      <tr><th>Kode Trx</th><th>Tanggal</th><th style="text-align:right">Total</th></tr>
    </thead>
    <tbody>${trxRows}</tbody>
  </table>
  ` : ''}

  ${data.payments.length > 0 ? `
  <div class="section-title">Riwayat Pembayaran</div>
  <table>
    <thead>
      <tr><th>Tanggal</th><th>Catatan</th><th style="text-align:right">Nominal</th></tr>
    </thead>
    <tbody>${payRows}</tbody>
  </table>
  ` : ''}

  <div class="footer">
    <p>Mohon segera melakukan pelunasan hutang.</p>
    <p style="margin-top:4px">Dokumen ini dicetak otomatis oleh sistem ${storeName}.</p>
  </div>
</body>
</html>`;
}

/**
 * Generate surat tagihan hutang dari data customer ID.
 */
export async function generateDebtInvoiceData(customerId: number): Promise<DebtInvoiceData> {
  const customer = await getCustomerById(customerId);
  if (!customer) throw new Error('Member tidak ditemukan');

  const [debtHistory, payHistory] = await Promise.all([
    getCustomerDebtHistory(customerId),
    getDebtPaymentHistory(customerId),
  ]);

  return {
    customerName: customer.fullName,
    memberCode: customer.memberCode,
    phone: customer.phone,
    address: customer.address ?? '',
    debtBalance: customer.debtBalance,
    debtLimit: customer.debtLimit,
    debtTransactions: debtHistory.map((t) => ({
      trxCode: t.trxCode,
      total: t.total,
      createdAt: t.createdAt,
      status: t.status,
    })),
    payments: payHistory.map((p) => ({
      amount: p.amount,
      paidAt: p.paidAt,
      notes: p.notes,
    })),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Print surat tagihan hutang langsung ke printer.
 */
export async function printDebtInvoice(customerId: number): Promise<void> {
  const data = await generateDebtInvoiceData(customerId);
  const settings = await getAllSettings();
  const html = buildDebtInvoiceHtml(data, settings);
  await Print.printAsync({ html });
}

/**
 * Export surat tagihan hutang sebagai PDF lalu share (WhatsApp, dll).
 */
export async function shareDebtInvoice(customerId: number): Promise<void> {
  const data = await generateDebtInvoiceData(customerId);
  const settings = await getAllSettings();
  const html = buildDebtInvoiceHtml(data, settings);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Tagihan Hutang - ${data.customerName}`,
    UTI: 'com.adobe.pdf',
  });
}
