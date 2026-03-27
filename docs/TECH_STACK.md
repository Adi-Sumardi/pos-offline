# Tech Stack Recommendation
## Aplikasi POS Offline — Toko Sparepart

---

## Ringkasan Keputusan

| Lapisan | Pilihan | Alasan Utama |
|---|---|---|
| Framework Mobile | React Native + Expo | Cross-platform, offline-ready, TypeScript |
| Database Lokal | SQLite (expo-sqlite) | Relasional, ringan, full offline |
| ORM | Drizzle ORM | Type-safe, migration support, ringan |
| State Management | Zustand | Minimalis, cepat, mudah debug |
| UI Components | React Native Paper | Material Design, konsisten, gratis |
| Navigasi | Expo Router | File-based routing, stabil |
| Charts/Grafik | Victory Native | Cocok untuk laporan keuangan |
| Print Struk | react-native-thermal-printer | Bluetooth thermal printer |
| Export PDF | expo-print + expo-sharing | Export laporan ke PDF |
| Form & Validasi | React Hook Form + Zod | Schema validation yang kuat |
| Scan QR/Barcode | expo-camera (built-in scanner) | Scan via kamera, support QR+Barcode |
| Generate QR | react-native-qrcode-svg | Generate QR label produk in-app |

---

## Detail Tech Stack

### 1. Platform Target
```
iOS (iPad / iPhone)     → via Expo build (EAS Build)
Android (Tablet / HP)   → via Expo build (EAS Build / APK)

Minimum OS:
  - Android 8.0 (API 26) ke atas
  - iOS 14 ke atas
```

### 2. Core Framework: React Native + Expo SDK 52+

**Mengapa React Native + Expo?**
- Satu codebase untuk Android dan iOS (tablet + HP)
- Expo menyederhanakan build & deployment tanpa Xcode/Android Studio
- SQLite offline full support via `expo-sqlite`
- TypeScript native support = kode lebih aman dan mudah maintain
- Komunitas besar = banyak library siap pakai

**Alternatif yang dipertimbangkan:**
```
Flutter     → Performa lebih tinggi, tapi Dart language, ekosistem lebih kecil
PWA         → Paling mudah, tapi Bluetooth printer terbatas & SQLite via WASM masih baru
Ionic       → Berbasis web, performa di low-end device kurang ideal untuk POS
```

---

### 3. Database: SQLite via expo-sqlite v14+

**Skema Tabel Utama:**
```sql
-- Master Data
users            → akun kasir & admin
categories       → kategori produk (oli, baut, kunci, dll)
brands           → merek produk
products         → stok produk + harga
customers        → data member / pelanggan

-- Transaksi
transactions          → header transaksi penjualan
transaction_items     → detail item per transaksi
debt_payments         → riwayat pembayaran hutang

-- Keuangan
cash_flow        → pencatatan arus kas masuk/keluar
```

**Mengapa SQLite dan bukan IndexedDB / AsyncStorage?**
- SQLite = database relasional → JOIN, GROUP BY, SUM, filter tanggal akurat
- Cocok untuk laporan keuangan yang kompleks
- Data tersimpan di storage device → full offline, tidak perlu internet

---

### 4. ORM: Drizzle ORM

```ts
// Contoh definisi schema type-safe
export const products = sqliteTable('products', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  sku:         text('sku').notNull().unique(),
  name:        text('name').notNull(),
  categoryId:  integer('category_id').references(() => categories.id),
  price:       integer('price').notNull(),      // simpan dalam Rupiah (integer)
  stock:       integer('stock').notNull().default(0),
  minStock:    integer('min_stock').default(5),
  createdAt:   text('created_at').default(sql`CURRENT_TIMESTAMP`),
})
```

**Fitur Drizzle:**
- Migration otomatis saat update versi app
- Query builder yang type-safe
- Tidak ada overhead besar (tidak seperti TypeORM)

---

### 5. State Management: Zustand

```ts
// Contoh store transaksi
const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customer: null,
  addItem: (product) => { ... },
  removeItem: (productId) => { ... },
  clearCart: () => set({ items: [], customer: null }),
  total: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
}))
```

---

### 6. UI: React Native Paper (Material Design 3)

Komponen yang digunakan:
- `DataTable` → tabel transaksi & produk
- `Searchbar` → pencarian produk/pelanggan
- `Modal` → dialog konfirmasi bayar
- `FAB` → tombol tambah produk
- `Chip` → filter kategori
- `ProgressBar` → loading state

---

### 7. Laporan & Grafik: Victory Native

```
Grafik yang tersedia:
  - Bar Chart   → penjualan harian/mingguan
  - Line Chart  → tren omzet per bulan
  - Pie Chart   → komposisi kategori produk terlaris
```

---

### 8. Printer Struk: Bluetooth Thermal Printer

```
Library: react-native-thermal-printer
Protokol: ESC/POS (standar industri thermal printer)
Ukuran kertas: 58mm atau 80mm

Printer yang kompatibel:
  - Epson TM-T82
  - Xprinter XP-58 / XP-80
  - iDPRT SP410 (portable, cocok untuk kasir mobile)
```

---

### 9. Backup & Keamanan Data

```
Strategi Backup:
  1. Export database ke file .db / .json
  2. Simpan ke folder lokal device (Download / Documents)
  3. Share via WhatsApp / Email / Google Drive (manual)

Keamanan:
  - PIN login per kasir
  - Session timeout otomatis (15 menit idle)
  - Password hash dengan bcrypt (expo-crypto)
  - Transaksi tidak bisa dihapus, hanya void dengan log
```

---

## Struktur Folder Proyek

```
pos-offline/
├── app/                        # Expo Router screens
│   ├── (auth)/
│   │   └── login.tsx
│   ├── (admin)/
│   │   ├── dashboard.tsx
│   │   ├── products/
│   │   ├── customers/
│   │   ├── reports/
│   │   └── settings/
│   └── (kasir)/
│       ├── pos.tsx             # Layar kasir utama
│       ├── cart.tsx
│       └── payment.tsx
├── components/
│   ├── pos/
│   ├── reports/
│   └── shared/
├── db/
│   ├── schema.ts               # Drizzle schema
│   ├── migrations/
│   └── queries/                # Query functions
├── stores/                     # Zustand stores
├── utils/
│   ├── currency.ts
│   ├── printer.ts
│   └── export.ts
└── constants/
```

---

## Estimasi Performa

| Operasi | Target Waktu |
|---|---|
| Buka aplikasi | < 2 detik |
| Cari produk | < 200ms |
| Simpan transaksi | < 500ms |
| Load laporan harian | < 1 detik |
| Load laporan bulanan (1000+ transaksi) | < 3 detik |
| Print struk Bluetooth | < 5 detik |

---

## Rekomendasi Hardware

| Perangkat | Spesifikasi Minimum | Rekomendasi |
|---|---|---|
| Android Tablet | RAM 3GB, Android 8, storage 32GB | Samsung Tab A8 / Lenovo M10 |
| Android HP (kasir mobile) | RAM 3GB, Android 8 | Redmi / Samsung A-series |
| Printer | Thermal 58/80mm, Bluetooth | Xprinter XP-58IIH |
| Barcode Scanner | Bluetooth HID | Inateck BCST-70 |

---

*Dokumen ini adalah rekomendasi teknologi v1.0 — dapat direvisi sesuai kebutuhan spesifik toko.*
