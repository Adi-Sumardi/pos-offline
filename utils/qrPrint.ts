import * as Print from 'expo-print';

interface QrProduct {
  sku: string;
  name: string;
  price: number;
  categoryName?: string;
}

/**
 * Generate printable HTML for QR code labels.
 * Uses an external QR API so it works without native SVG-to-image conversion.
 * Layout: grid of labels, 3 columns per row.
 */
function generateLabelHtml(products: QrProduct[], title: string): string {
  const labels = products.map((p) => {
    const priceStr = 'Rp ' + p.price.toLocaleString('id-ID');
    return `
      <div class="label">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(p.sku)}" alt="QR" />
        <div class="sku">${p.sku}</div>
        <div class="name">${p.name}</div>
        <div class="price">${priceStr}</div>
      </div>
    `;
  }).join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 10mm; }
          h1 { font-size: 14pt; text-align: center; margin-bottom: 6mm; color: #333; }
          .info { text-align: center; font-size: 9pt; color: #666; margin-bottom: 8mm; }
          .grid {
            display: flex;
            flex-wrap: wrap;
            gap: 4mm;
            justify-content: flex-start;
          }
          .label {
            width: 58mm;
            border: 0.5pt solid #ccc;
            border-radius: 3mm;
            padding: 3mm;
            text-align: center;
            page-break-inside: avoid;
          }
          .label img {
            width: 28mm;
            height: 28mm;
            margin-bottom: 2mm;
          }
          .sku {
            font-size: 10pt;
            font-weight: bold;
            letter-spacing: 0.5pt;
          }
          .name {
            font-size: 8pt;
            color: #444;
            margin-top: 1mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 52mm;
          }
          .price {
            font-size: 9pt;
            font-weight: bold;
            color: #2563EB;
            margin-top: 1mm;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="info">${products.length} label · Scan QR di kasir untuk input produk</div>
        <div class="grid">
          ${labels}
        </div>
      </body>
    </html>
  `;
}

/**
 * Print QR labels for a single product.
 */
export async function printSingleQr(product: QrProduct) {
  const html = generateLabelHtml([product], `Label QR — ${product.name}`);
  await Print.printAsync({ html });
}

/**
 * Print QR labels for multiple products (e.g. by category).
 */
export async function printQrByCategory(products: QrProduct[], categoryName: string) {
  if (products.length === 0) return;
  const html = generateLabelHtml(products, `Label QR — Kategori: ${categoryName}`);
  await Print.printAsync({ html });
}

/**
 * Print QR labels for all products.
 */
export async function printAllQr(products: QrProduct[]) {
  if (products.length === 0) return;
  const html = generateLabelHtml(products, `Label QR — Semua Produk`);
  await Print.printAsync({ html });
}
