import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { formatRupiah } from './currency';

interface ReportData {
  period: string;
  dateRange: string;
  summary: {
    totalRevenue: number;
    transactionCount: number;
    avgTransaction: number;
    totalDiscount: number;
    cashSales: number;
    debtSales: number;
    totalCost: number;
    grossProfit: number;
  };
  topProducts: Array<{ productName: string; totalQty: number; totalRevenue: number }>;
  cashflow: {
    cashIn: number;
    debtPaid: number;
    totalIn: number;
    totalOut: number;
    netCashFlow: number;
  } | null;
  expenses: Array<{ category: string; total: number; count: number }>;
  debtReport: Array<{ fullName: string; phone: string; debtBalance: number; debtPercent: number }>;
}

function row(label: string, value: string, bold = false, color = '#333'): string {
  return `
    <tr>
      <td style="padding:6px 0;color:#666">${label}</td>
      <td style="padding:6px 0;text-align:right;font-weight:${bold ? '700' : '500'};color:${color}">${value}</td>
    </tr>
  `;
}

export function generateReportHtml(data: ReportData): string {
  const s = data.summary;

  const topProductRows = data.topProducts.map((p, i) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:5px 0">${i + 1}</td>
      <td style="padding:5px 0">${p.productName}</td>
      <td style="padding:5px 0;text-align:center">${p.totalQty}</td>
      <td style="padding:5px 0;text-align:right;font-weight:600">${formatRupiah(p.totalRevenue)}</td>
    </tr>
  `).join('');

  const expenseRows = data.expenses.map(e => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:5px 0">${e.category}</td>
      <td style="padding:5px 0;text-align:center">${e.count}x</td>
      <td style="padding:5px 0;text-align:right;color:#EF4444;font-weight:600">${formatRupiah(e.total)}</td>
    </tr>
  `).join('');

  const debtRows = data.debtReport.map(c => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:5px 0">${c.fullName}</td>
      <td style="padding:5px 0">${c.phone}</td>
      <td style="padding:5px 0;text-align:right;color:#EF4444;font-weight:600">${formatRupiah(c.debtBalance)}</td>
      <td style="padding:5px 0;text-align:right;color:${c.debtPercent >= 80 ? '#EF4444' : '#F59E0B'}">${c.debtPercent}%</td>
    </tr>
  `).join('');

  const totalExpense = data.expenses.reduce((sum, e) => sum + e.total, 0);
  const totalDebt = data.debtReport.reduce((sum, c) => sum + c.debtBalance, 0);

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 15mm; color: #333; font-size: 11pt; }
          h1 { font-size: 18pt; color: #2563EB; margin-bottom: 2mm; }
          h2 { font-size: 13pt; color: #2563EB; margin: 8mm 0 3mm; border-bottom: 2px solid #2563EB; padding-bottom: 2mm; }
          .meta { font-size: 10pt; color: #666; margin-bottom: 8mm; }
          table { width: 100%; border-collapse: collapse; }
          .summary-table td { padding: 5px 0; }
          .card { background: #F8FAFC; border-radius: 4mm; padding: 4mm; margin-bottom: 4mm; }
          .footer { margin-top: 10mm; text-align: center; font-size: 9pt; color: #999; border-top: 1px solid #ddd; padding-top: 4mm; }
          .highlight { font-size: 14pt; font-weight: 800; }
          .green { color: #10B981; }
          .red { color: #EF4444; }
          .blue { color: #2563EB; }
          @media print {
            body { padding: 10mm; }
          }
        </style>
      </head>
      <body>
        <h1>📊 Laporan Toko Kurnia</h1>
        <div class="meta">
          Periode: <strong>${data.period}</strong> · ${data.dateRange}<br/>
          Dicetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
        </div>

        <!-- RINGKASAN PENJUALAN -->
        <h2>Ringkasan Penjualan</h2>
        <div class="card">
          <table class="summary-table">
            ${row('Total Omzet', formatRupiah(s.totalRevenue), true, '#10B981')}
            ${row('Jumlah Transaksi', String(s.transactionCount))}
            ${row('Rata-rata/Transaksi', formatRupiah(s.avgTransaction))}
            ${row('Total Diskon', formatRupiah(s.totalDiscount), false, '#F59E0B')}
            ${row('Penjualan Tunai', formatRupiah(s.cashSales))}
            ${row('Penjualan Hutang', formatRupiah(s.debtSales))}
          </table>
        </div>

        <!-- LABA KOTOR -->
        <h2>Laba Kotor</h2>
        <div class="card">
          <table class="summary-table">
            ${row('Total Omzet', formatRupiah(s.totalRevenue))}
            ${row('Total HPP (Harga Pokok)', formatRupiah(s.totalCost), false, '#EF4444')}
          </table>
          <div style="text-align:right;margin-top:4mm;border-top:2px solid #ddd;padding-top:3mm">
            <span style="color:#666">Laba Kotor:</span>
            <span class="highlight ${s.grossProfit >= 0 ? 'green' : 'red'}">
              ${formatRupiah(s.grossProfit)}
            </span>
          </div>
        </div>

        <!-- PRODUK TERLARIS -->
        ${data.topProducts.length > 0 ? `
          <h2>Produk Terlaris</h2>
          <table>
            <thead>
              <tr style="border-bottom:2px solid #ddd">
                <th style="text-align:left;padding:5px 0;width:30px">#</th>
                <th style="text-align:left;padding:5px 0">Produk</th>
                <th style="text-align:center;padding:5px 0;width:60px">Qty</th>
                <th style="text-align:right;padding:5px 0;width:120px">Revenue</th>
              </tr>
            </thead>
            <tbody>${topProductRows}</tbody>
          </table>
        ` : ''}

        <!-- ARUS KAS -->
        ${data.cashflow ? `
          <h2>Arus Kas</h2>
          <div class="card">
            <table class="summary-table">
              ${row('Penjualan Tunai', formatRupiah(data.cashflow.cashIn), false, '#10B981')}
              ${row('Pembayaran Hutang', formatRupiah(data.cashflow.debtPaid), false, '#10B981')}
              ${row('Total Kas Masuk', formatRupiah(data.cashflow.totalIn), true, '#10B981')}
              ${row('Total Pengeluaran', formatRupiah(data.cashflow.totalOut), true, '#EF4444')}
            </table>
            <div style="text-align:right;margin-top:4mm;border-top:2px solid #ddd;padding-top:3mm">
              <span style="color:#666">Net Cash Flow:</span>
              <span class="highlight ${data.cashflow.netCashFlow >= 0 ? 'green' : 'red'}">
                ${formatRupiah(data.cashflow.netCashFlow)}
              </span>
            </div>
          </div>
        ` : ''}

        <!-- PENGELUARAN -->
        ${data.expenses.length > 0 ? `
          <h2>Pengeluaran per Kategori</h2>
          <table>
            <thead>
              <tr style="border-bottom:2px solid #ddd">
                <th style="text-align:left;padding:5px 0">Kategori</th>
                <th style="text-align:center;padding:5px 0;width:60px">Jumlah</th>
                <th style="text-align:right;padding:5px 0;width:120px">Total</th>
              </tr>
            </thead>
            <tbody>${expenseRows}</tbody>
            <tfoot>
              <tr style="border-top:2px solid #ddd">
                <td colspan="2" style="padding:5px 0;font-weight:700">Total Pengeluaran</td>
                <td style="padding:5px 0;text-align:right;font-weight:700;color:#EF4444">${formatRupiah(totalExpense)}</td>
              </tr>
            </tfoot>
          </table>
        ` : ''}

        <!-- HUTANG MEMBER -->
        ${data.debtReport.length > 0 ? `
          <h2>Daftar Hutang Member</h2>
          <table>
            <thead>
              <tr style="border-bottom:2px solid #ddd">
                <th style="text-align:left;padding:5px 0">Nama</th>
                <th style="text-align:left;padding:5px 0">Telepon</th>
                <th style="text-align:right;padding:5px 0;width:120px">Hutang</th>
                <th style="text-align:right;padding:5px 0;width:60px">% Limit</th>
              </tr>
            </thead>
            <tbody>${debtRows}</tbody>
            <tfoot>
              <tr style="border-top:2px solid #ddd">
                <td colspan="2" style="padding:5px 0;font-weight:700">Total Hutang</td>
                <td style="padding:5px 0;text-align:right;font-weight:700;color:#EF4444">${formatRupiah(totalDebt)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        ` : ''}

        <div class="footer">
          Laporan ini digenerate otomatis oleh POS Toko Kurnia · ${new Date().toLocaleString('id-ID')}
        </div>
      </body>
    </html>
  `;
}

/**
 * Print the report directly.
 */
export async function printReport(data: ReportData) {
  const html = generateReportHtml(data);
  await Print.printAsync({ html });
}

/**
 * Generate PDF file and share it.
 */
export async function shareReportPdf(data: ReportData) {
  const html = generateReportHtml(data);
  const { uri } = await Print.printToFileAsync({ html });

  // Rename to a meaningful filename
  const filename = `Laporan_TokoKurnia_${data.period.replace(/\s/g, '_')}.pdf`;
  const destUri = `${FileSystem.documentDirectory}${filename}`;

  await FileSystem.moveAsync({ from: uri, to: destUri });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Bagikan Laporan PDF',
      UTI: 'com.adobe.pdf',
    });
  }
}
