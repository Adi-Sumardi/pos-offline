# Software Requirements Specification (SRS)
## Aplikasi POS Offline — Toko Sparepart Otomotif

**Versi:** 1.0
**Tanggal:** Maret 2026

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen
Dokumen ini menjabarkan spesifikasi teknis lengkap untuk pengembangan aplikasi POS (Point of Sale) offline berbasis React Native + Expo untuk toko sparepart otomotif.

### 1.2 Definisi Istilah

| Istilah | Definisi |
|---|---|
| POS | Point of Sale — sistem kasir |
| SKU | Stock Keeping Unit — kode unik produk |
| Member | Pelanggan terdaftar yang dapat bertransaksi hutang |
| Void | Pembatalan transaksi dengan alasan tercatat |
| Cash Flow | Arus kas masuk dan keluar toko |
| Thermal Printer | Printer struk menggunakan panas, tanpa tinta |

---

## 2. Spesifikasi Fungsional

### 2.1 Modul Autentikasi (AUTH)

#### FR-AUTH-01: Login
- Pengguna memasukkan **username** + **PIN 6 digit**
- Sistem memverifikasi hash PIN di database lokal
- Berhasil login → redirect ke dashboard sesuai role
- Gagal 5x → akun terkunci, hanya admin yang bisa buka

#### FR-AUTH-02: Session & Logout
- Session timeout setelah **15 menit idle**
- Tombol logout tersedia di semua halaman
- Data keranjang belanja tersimpan sementara saat session timeout

#### FR-AUTH-03: Ganti PIN
- Pengguna dapat mengganti PIN sendiri (masukkan PIN lama + PIN baru)
- Admin dapat reset PIN kasir

---

### 2.2 Modul Produk (PROD)

#### FR-PROD-01: Daftar Produk
- Tampil: SKU, Nama, Kategori, Harga, Stok, Status
- Pencarian realtime by nama / SKU
- Filter by: kategori, merek, status stok (ada/habis/menipis)
- Sort by: nama, harga, stok, terbaru

#### FR-PROD-02: Tambah Produk (Admin Only)
Input wajib:
```
- Nama produk           (text, max 100 char)
- SKU                   (auto-generate atau manual, unique)
- Kategori              (pilih dari master kategori)
- Merek/Brand           (text, opsional)
- Satuan                (pcs / liter / kg / set / pasang / dll)
- Harga jual            (integer, Rupiah — harga per 1 satuan penuh)
- Stok awal             (REAL — mendukung desimal, contoh: 10.5 liter)
- Stok minimum          (REAL, default: 5)
- Langkah qty (qty_step)(REAL, default: 1)
  → 1    = hanya bilangan bulat (baut, filter, busi, dll)
  → 0.5  = bisa setengah (oli: 0.5L, 1L, 1.5L)
  → 0.25 = per seperempat (jarang, untuk kebutuhan khusus)
- Deskripsi             (text, opsional)
```

**Aturan qty_step:**
- qty_step = 1 → input quantity: 1, 2, 3, 4, 5 … (tombol +/−)
- qty_step = 0.5 → input quantity: 0.5, 1.0, 1.5, 2.0 … (tombol +/− step 0.5)
- Harga selalu disimpan per 1 satuan penuh → subtotal = harga × quantity
  contoh: Oli Rp 45.000/liter × 0.5 = Rp 22.500

#### FR-PROD-03: Edit Produk (Admin Only)
- Semua field dapat diubah kecuali SKU
- Setiap perubahan `price` atau `cost_price` otomatis dicatat ke tabel `price_logs`

#### FR-PROD-04: Stok Opname (Admin Only)
- Admin dapat melakukan penyesuaian stok (tambah/kurang) dengan alasan
- Log stok opname tersimpan dengan timestamp & nama admin

#### FR-PROD-05: Kategori Produk (Admin Only)
Contoh kategori default:
```
- Oli & Pelumas
- Filter (oli, udara, bensin)
- Busi & Kelistrikan
- Baut & Mur
- Kunci & Alat
- Sparepart Mesin
- Sparepart Body
- Aksesori Motor
- Aksesori Mobil
- Lain-lain
```

---

### 2.3 Modul Kasir / POS (TRX)

#### FR-TRX-01: Layar Kasir Utama
Tata letak layar:
```
[Kiri] Grid produk / hasil pencarian
[Kanan] Keranjang belanja + total

Fitur:
- Search produk by nama atau SKU
- Tap produk → tambah ke keranjang
- Swipe item keranjang → hapus
- Ubah quantity langsung di keranjang
- Tampil total, subtotal per item
```

#### FR-TRX-01b: Mode Cek Harga
- Tombol [🔍 Cek Harga] di layar kasir (terpisah dari flow belanja)
- Scan QR atau ketik nama → tampil popup: nama produk, stok, harga
- Produk **tidak** ditambahkan ke keranjang
- Popup auto-tutup setelah 5 detik atau kasir tutup manual

#### FR-TRX-02: Proses Checkout
Langkah:
1. Kasir klik "Bayar"
2. Sistem cek diskon aktif → tampilkan jika ada yang berlaku
3. Kasir dapat memilih/mengubah diskon yang akan diterapkan (dari daftar diskon aktif)
4. Pilih jenis pembayaran: **Tunai** atau **Hutang**
5. Jika **Tunai**: input nominal uang diterima → tampil kembalian (setelah diskon)
6. Jika **Hutang**: pilih/cari member → tampilkan saldo hutang + limit
7. Konfirmasi → simpan transaksi
8. Layar sukses → kasir pilih: **Print Struk** atau **Selesai** (keduanya opsional)

#### FR-TRX-02b: Aturan Diskon di Transaksi
- Hanya **satu diskon** yang dapat diterapkan per transaksi
- Jika tidak ada diskon aktif → bagian diskon tidak muncul di checkout
- Diskon **tidak wajib** diterapkan — kasir bisa skip
- Kasir **tidak bisa** mengubah nilai diskon, hanya memilih dari yang tersedia
- Nilai diskon dihitung dari **subtotal sebelum diskon**
- Jika diskon persen + ada `max_discount` → nilai diskon tidak melebihi batas

#### FR-TRX-03: Validasi Transaksi
- Stok tidak boleh minus → tampil error per item
- Hutang: saldo + transaksi baru tidak boleh melebihi limit hutang member
- Nominal tunai tidak boleh kurang dari total belanja

#### FR-TRX-04: Nomor Transaksi
Format: `TRX-YYYYMMDD-XXXX` (XXXX = nomor urut per hari, reset tiap hari)
Contoh: `TRX-20260325-0043`

#### FR-TRX-05: Void Transaksi (Admin Only)
- Admin input alasan void (wajib)
- Stok produk yang di-void dikembalikan
- Hutang yang di-void dikurangi dari saldo hutang member
- Transaksi void tetap tersimpan di database dengan status `VOID`

#### FR-TRX-06: Riwayat Transaksi
- Kasir dapat melihat transaksi hari ini
- Admin dapat melihat semua riwayat dengan filter tanggal
- Detail transaksi: item, harga, kasir, waktu, metode bayar, catatan
- Dari detail transaksi: tombol **[🖨️ Cetak Ulang Struk]** tersedia
  - Kasir: hanya bisa reprint transaksi hari ini
  - Admin: bisa reprint semua transaksi
  - Struk cetak ulang menampilkan footer `*** CETAK ULANG ***`

#### FR-TRX-07: Catatan Transaksi
- Kasir dapat menambahkan catatan opsional per transaksi (max 100 karakter)
- Contoh: "Honda Beat 2020", "Servis bengkel Pak Hendra", "Ambil besok"
- Catatan muncul di detail riwayat transaksi dan di struk (jika ada)

---

### 2.4 Modul Member / Pelanggan (MBR)

#### FR-MBR-01: Data Member
```
Field WAJIB (minimal untuk daftar):
- Nama Lengkap    (wajib)
- No. HP          (wajib, unique)

Field OPSIONAL (bisa dilengkapi belakangan):
- Alamat
- Catatan

Field SISTEM (otomatis, tidak perlu diisi):
- Kode Member     (auto-generate: MBR-XXXX)
- Limit Hutang    (Rupiah, default: 0 = tidak boleh hutang — admin set)
- Saldo Hutang    (dihitung otomatis dari transaksi)
- Status          (default: Aktif)
- Tanggal Daftar  (otomatis saat simpan)
```

> Filosofi: Pendaftaran member harus secepat mungkin.
> Kasir cukup minta nama + nomor HP → langsung bisa dipakai untuk transaksi hutang
> (setelah admin set limit hutang).

#### FR-MBR-02: Manajemen Hutang
- Tampil rincian hutang per transaksi
- Tombol "Bayar Hutang" → input nominal bayar
- Pembayaran partial (cicilan) diperbolehkan
- Print struk pembayaran hutang

#### FR-MBR-03: Riwayat Transaksi Member
- List semua transaksi member (tunai + hutang)
- Filter by tanggal
- Total belanja & total hutang tercantum

---

### 2.5 Modul Laporan (RPT)

#### FR-RPT-01: Dashboard (Beranda)
Widget yang ditampilkan:
```
- Omzet hari ini (total penjualan cash)
- Jumlah transaksi hari ini
- Total hutang outstanding semua member
- Produk stok menipis (< stok minimum)
- 5 produk terlaris hari ini
- Grafik penjualan 7 hari terakhir
```

#### FR-RPT-02: Laporan Penjualan
Filter tersedia:
```
- Hari ini
- Minggu ini
- Bulan ini
- Custom range (pilih tanggal awal - akhir)
```

Konten laporan:
```
- Total omzet periode
- Jumlah transaksi
- Rata-rata nilai transaksi
- Rincian per transaksi (expand)
- Breakdown per kasir
- Grafik batang per hari
```

#### FR-RPT-03: Laporan Cash Flow (Arus Kas)
```
Pemasukan:
- Penjualan tunai
- Pembayaran hutang dari member

Pengeluaran:
- Pengeluaran kas yang dicatat admin (optional)

Tampilan:
- Saldo awal periode
- Total pemasukan
- Total pengeluaran
- Saldo akhir periode
- Rincian per transaksi
```

#### FR-RPT-04: Laporan Hutang
```
- Daftar semua member dengan saldo hutang > 0
- Urutkan by: saldo hutang terbesar, nama, tanggal hutang
- Detail hutang per member (expand)
- Total hutang outstanding keseluruhan
- Member dengan hutang mendekati limit (peringatan)
```

#### FR-RPT-05: Laporan Stok
```
- Semua produk dengan stok saat ini
- Filter: kategori, merek
- Highlight: stok menipis (kuning), habis (merah)
- Nilai inventori total (stok × harga)
```

#### FR-RPT-06: Export PDF
- Semua laporan dapat diekspor ke PDF
- PDF tersimpan di folder Downloads device
- Dapat dibagikan via WhatsApp / Email

---

### 2.6 Modul Diskon (DSK)

#### FR-DSK-01: Jenis Diskon
```
Tipe nilai:
  - Persentase (%)        → contoh: diskon 10% dari total
  - Nominal tetap (Rp)    → contoh: potongan Rp 5.000

Cakupan (scope):
  - Semua produk          → berlaku untuk seluruh transaksi
  - Per kategori          → hanya berlaku jika ada item dari kategori tertentu
  - Per produk            → hanya berlaku jika produk spesifik ada di keranjang
  - Member                → hanya berlaku untuk pelanggan member
```

#### FR-DSK-02: Manajemen Diskon (Admin Only)
Field diskon:
```
- Nama diskon       (wajib, contoh: "Promo Ramadan", "Diskon Member 10%")
- Tipe              (persen / nominal)
- Nilai             (angka: 10 untuk 10%, atau 5000 untuk Rp 5.000)
- Cakupan           (semua / kategori / produk / member)
- Target scope      (jika kategori: pilih kategori; jika produk: pilih produk)
- Min. pembelian    (Rp, default: 0 = tanpa syarat minimum)
- Maks. diskon      (Rp, hanya untuk tipe persen — batas atas potongan)
- Status            (Aktif / Nonaktif) — bisa diubah kapan saja
- Keterangan        (opsional, untuk catatan internal)
```

#### FR-DSK-03: Aktivasi / Nonaktifkan Diskon
- Admin dapat toggle status diskon **Aktif ↔ Nonaktif** dengan satu klik
- Diskon nonaktif tidak muncul di layar kasir
- Beberapa diskon bisa aktif bersamaan, tapi hanya **satu** yang diterapkan per transaksi
- Admin dapat melihat semua diskon (aktif & nonaktif) di daftar

#### FR-DSK-04: Penerapan Diskon di Kasir
- Jika ada diskon aktif yang berlaku → muncul badge/indikator di layar kasir
- Saat klik "Bayar" → tampil pilihan diskon yang eligible (berdasarkan isi keranjang)
- Kasir pilih diskon atau "Tanpa Diskon"
- Nilai potongan langsung terhitung dan ditampilkan sebelum konfirmasi

#### FR-DSK-05: Pencatatan & Laporan Diskon
- Setiap transaksi yang menggunakan diskon mencatat: nama diskon, tipe, nilai potongan
- Laporan penjualan menampilkan: total diskon yang diberikan per periode
- Admin dapat filter laporan by diskon tertentu

---

### 2.7 Modul Pengeluaran Kas (EXP)

#### FR-EXP-01: Catat Pengeluaran (Admin Only)
Input pengeluaran:
```
- Kategori      (pilih: Operasional / ATK & Perlengkapan / Transportasi / Lain-lain)
- Nominal       (Rp, wajib)
- Keterangan    (text, opsional)
- Tanggal       (default: hari ini, bisa diubah ke tanggal sebelumnya)
```

#### FR-EXP-02: Daftar Pengeluaran
- Admin dapat melihat daftar pengeluaran dengan filter tanggal
- Setiap entri pengeluaran otomatis masuk ke tabel `cash_flow` dengan `type = 'out'`

---

### 2.9 Modul Laporan Laba (RPT-PROFIT)

#### FR-RPT-07: Laporan Laba Kotor
```
Syarat: field cost_price diisi pada setiap produk

Konten laporan:
- Omzet periode:                Rp X
- Total HPP (harga pokok):     (Rp X)
- ──────────────────────────────────
- Laba Kotor:                   Rp X  (X% margin)
- Total Diskon diberikan:      (Rp X)
- ──────────────────────────────────
- Laba Bersih Estimasi:         Rp X

Filter: sama dengan laporan penjualan (hari/minggu/bulan/custom)

Catatan:
- Produk tanpa cost_price tidak masuk kalkulasi HPP
- cost_price TIDAK ditampilkan di layar kasir, hanya admin
```

---

### 2.10 Modul Pengaturan (SET)

#### FR-SET-01: Profil Toko
```
- Nama toko
- Alamat
- No. Telepon
- Catatan struk (footer)
- Logo (opsional, tampil di struk)
```

#### FR-SET-02: Manajemen Pengguna (Admin Only)
- Tambah kasir baru
- Edit nama & username kasir
- Reset PIN kasir
- Nonaktifkan kasir

#### FR-SET-03: Backup & Restore
- Export database ke file `.db` atau `.json`
- Import/restore dari file backup
- Reminder backup otomatis setiap 7 hari

#### FR-SET-04: Printer
- Scan & pair Bluetooth printer
- Test print
- Pilih ukuran kertas (58mm / 80mm)

---

## 3. Spesifikasi Non-Fungsional

### 3.1 Performa
| Metrik | Target |
|---|---|
| Cold start app | < 3 detik |
| Simpan transaksi | < 500ms |
| Pencarian produk | < 200ms |
| Load laporan bulanan | < 3 detik |
| Print struk | < 5 detik |

### 3.2 Keandalan (Reliability)
- Data tidak boleh hilang akibat crash — SQLite ACID compliant
- Transaksi menggunakan database transaction (atomic)
- Backup otomatis sebelum update aplikasi

### 3.3 Keamanan
- PIN di-hash dengan bcrypt sebelum disimpan
- Tidak ada data yang dikirim ke server (100% lokal)
- Role-based access control ketat
- Audit log: semua aksi sensitif dicatat dengan user + timestamp

### 3.4 Usability
- UI support orientasi **portrait** (HP) dan **landscape** (tablet)
- Font minimum 14sp untuk keterbacaan di cahaya toko
- Tombol CTA (bayar, simpan) ukuran minimum 48×48dp
- Feedback visual setiap aksi (loading, sukses, error)

### 3.5 Kompatibilitas
- Android 8.0 (API 26) — Android 14
- iOS 14 — iOS 17
- Resolusi tablet: 800×1280 ke atas
- Resolusi HP: 720×1280 ke atas

---

## 4. Skema Database

### Tabel: `users`
```sql
CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  pin_hash    TEXT NOT NULL,
  role        TEXT NOT NULL CHECK(role IN ('admin', 'kasir')),
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel: `categories`
```sql
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT
);
```

### Tabel: `products`
```sql
CREATE TABLE products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sku         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  brand       TEXT,
  unit        TEXT NOT NULL DEFAULT 'pcs',  -- 'pcs', 'liter', 'kg', 'set', dll
  price       INTEGER NOT NULL,             -- harga per 1 satuan penuh (Rupiah)
  stock       REAL NOT NULL DEFAULT 0,      -- REAL: mendukung 10.5 liter
  min_stock   REAL NOT NULL DEFAULT 5,
  qty_step    REAL NOT NULL DEFAULT 1,      -- 1=bulat saja, 0.5=bisa setengah
  unit_type   TEXT NOT NULL DEFAULT 'piece'
              CHECK(unit_type IN ('piece', 'bulk_small', 'liquid')),
  -- piece      : produk normal (filter, busi, kunci, dll)
  -- bulk_small : satuan sangat kecil, qty wajib diinput manual (baut, mur, klip)
  -- liquid     : produk cair/bisa pecah satuan (oli, cairan rem, coolant)
  location    TEXT,                         -- posisi rak/kotak: "C3", "A1-atas"
  has_qr      INTEGER NOT NULL DEFAULT 0,   -- sudah dicetak label QR atau belum
  cost_price  INTEGER NOT NULL DEFAULT 0,   -- harga pokok/beli (hanya admin yang lihat)
  is_active   INTEGER NOT NULL DEFAULT 1,
  notes       TEXT,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Contoh data produk:**
```
Nama              | unit   | price  | qty_step | unit_type
──────────────────┼────────┼────────┼──────────┼───────────
Oli Repsol 20W50  | liter  | 45000  | 0.5      | liquid
Oli Shell Advance | liter  | 52000  | 0.5      | liquid
Cairan Rem DOT4   | liter  | 38000  | 0.25     | liquid
Coolant Radiator  | liter  | 30000  | 0.5      | liquid
Filter Oli Honda  | pcs    | 25000  | 1        | piece
Busi NGK BR6      | pcs    | 28000  | 1        | piece
Baut M8×30mm      | pcs    | 500    | 1        | bulk_small
Mur M8            | pcs    | 200    | 1        | bulk_small
```

### Tabel: `price_logs`
```sql
CREATE TABLE price_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  field       TEXT NOT NULL CHECK(field IN ('price', 'cost_price')),
  old_value   INTEGER NOT NULL,
  new_value   INTEGER NOT NULL,
  changed_by  INTEGER NOT NULL REFERENCES users(id),
  notes       TEXT,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel: `expenses`
```sql
CREATE TABLE expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT NOT NULL,        -- 'operasional', 'atk', 'transportasi', 'lain-lain'
  amount      INTEGER NOT NULL,
  notes       TEXT,
  expense_date TEXT NOT NULL,       -- tanggal pengeluaran (bisa backdate)
  user_id     INTEGER NOT NULL REFERENCES users(id),
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
```


### Tabel: `discounts`
```sql
CREATE TABLE discounts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK(type IN ('percentage', 'fixed')),
  value        REAL NOT NULL,              -- 10 = 10%, atau 5000 = Rp 5.000
  scope        TEXT NOT NULL DEFAULT 'all'
               CHECK(scope IN ('all', 'category', 'product', 'member')),
  scope_id     INTEGER,                   -- category_id / product_id (jika scope bukan 'all')
  min_purchase INTEGER NOT NULL DEFAULT 0, -- minimal total belanja (0 = tidak ada syarat)
  max_discount INTEGER,                   -- batas atas potongan (untuk tipe persen, null = bebas)
  is_active    INTEGER NOT NULL DEFAULT 0, -- 0 = nonaktif, 1 = aktif
  notes        TEXT,
  created_by   INTEGER NOT NULL REFERENCES users(id),
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Contoh data diskon:**
```
Nama                  | type       | value | scope    | min_purchase | max_discount | aktif
──────────────────────┼────────────┼───────┼──────────┼──────────────┼──────────────┼──────
Diskon Member 10%     | percentage | 10    | member   | 0            | 50000        | 1
Promo Oli Hemat       | percentage | 5     | category | 50000        | 25000        | 1
Potongan Spesial 5rb  | fixed      | 5000  | all      | 100000       | null         | 0
Diskon Pelanggan Setia| percentage | 15    | member   | 200000       | 100000       | 0
```

---

### Tabel: `customers`
```sql
CREATE TABLE customers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  member_code  TEXT NOT NULL UNIQUE,       -- MBR-XXXX
  full_name    TEXT NOT NULL,
  phone        TEXT NOT NULL UNIQUE,
  address      TEXT,
  debt_limit   INTEGER NOT NULL DEFAULT 0, -- 0 = tidak boleh hutang
  debt_balance INTEGER NOT NULL DEFAULT 0, -- saldo hutang berjalan
  is_active    INTEGER NOT NULL DEFAULT 1,
  notes        TEXT,
  created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at   TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel: `transactions`
```sql
CREATE TABLE transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  trx_code        TEXT NOT NULL UNIQUE,       -- TRX-YYYYMMDD-XXXX
  customer_id     INTEGER REFERENCES customers(id),
  cashier_id      INTEGER NOT NULL REFERENCES users(id),
  payment_type    TEXT NOT NULL CHECK(payment_type IN ('cash', 'debt')),
  subtotal        INTEGER NOT NULL,           -- total sebelum diskon
  discount_id     INTEGER REFERENCES discounts(id),  -- diskon yang diterapkan (null = tidak ada)
  discount_name   TEXT,                       -- snapshot nama diskon saat transaksi
  discount_amount INTEGER NOT NULL DEFAULT 0, -- nilai potongan dalam Rupiah
  total           INTEGER NOT NULL,           -- subtotal - discount_amount
  amount_paid     INTEGER NOT NULL DEFAULT 0, -- untuk cash
  change_amount   INTEGER NOT NULL DEFAULT 0, -- kembalian
  status          TEXT NOT NULL DEFAULT 'DONE' CHECK(status IN ('DONE', 'VOID')),
  void_reason     TEXT,
  void_by         INTEGER REFERENCES users(id),
  void_at         TEXT,
  notes           TEXT,
  created_at      TEXT DEFAULT CURRENT_TIMESTAMP
);
```

> **Snapshot diskon:** `discount_name` menyimpan nama diskon saat transaksi terjadi,
> sehingga laporan historis tetap akurat meskipun diskon diedit atau dihapus kemudian.

### Tabel: `transaction_items`
```sql
CREATE TABLE transaction_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id  INTEGER NOT NULL REFERENCES transactions(id),
  product_id      INTEGER NOT NULL REFERENCES products(id),
  product_name    TEXT NOT NULL,           -- snapshot saat transaksi
  product_sku     TEXT NOT NULL,
  product_unit    TEXT NOT NULL,           -- snapshot satuan: 'liter', 'pcs', dll
  unit_price      INTEGER NOT NULL,        -- snapshot harga per 1 satuan
  quantity        REAL NOT NULL,           -- REAL: mendukung 0.5, 1.5, dll
  subtotal        INTEGER NOT NULL         -- ROUND(unit_price × quantity) → Rupiah bulat
);
```

> **Catatan pembulatan:** `subtotal = ROUND(unit_price × quantity)`
> Contoh: Rp 45.000 × 0.5 liter = Rp 22.500 (tepat)
> Contoh: Rp 38.000 × 0.25 liter = Rp 9.500 (tepat)
> Jika ada sisa desimal (jarang): bulatkan ke atas (ceiling) agar tidak rugi.

### Tabel: `debt_payments`
```sql
CREATE TABLE debt_payments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     INTEGER NOT NULL REFERENCES customers(id),
  cashier_id      INTEGER NOT NULL REFERENCES users(id),
  amount          INTEGER NOT NULL,
  notes           TEXT,
  paid_at         TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel: `stock_logs`
```sql
CREATE TABLE stock_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL CHECK(type IN ('sale', 'adjustment', 'void_return')),
  qty_before  REAL NOT NULL,              -- REAL: mendukung desimal
  qty_change  REAL NOT NULL,              -- negatif jika pengurangan (-0.5 = jual setengah)
  qty_after   REAL NOT NULL,
  notes       TEXT,
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel: `cash_flow`
```sql
CREATE TABLE cash_flow (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  type            TEXT NOT NULL CHECK(type IN ('in', 'out')),
  category        TEXT NOT NULL,           -- 'penjualan', 'bayar_hutang', 'pengeluaran', dll
  amount          INTEGER NOT NULL,
  transaction_id  INTEGER REFERENCES transactions(id),
  user_id         INTEGER NOT NULL REFERENCES users(id),
  notes           TEXT,
  created_at      TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Tabel: `app_settings`
```sql
CREATE TABLE app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
-- Contoh keys: store_name, store_address, store_phone, receipt_footer,
--              paper_size, last_backup, printer_address
```

---

## 5. Matriks Hak Akses

| Fitur | Super Admin | Kasir |
|---|---|---|
| Lihat dashboard | ✅ | ✅ |
| Transaksi penjualan | ✅ | ✅ |
| Lihat riwayat transaksi hari ini | ✅ | ✅ |
| Lihat semua riwayat transaksi | ✅ | ❌ |
| Void transaksi | ✅ | ❌ |
| Tambah/edit produk | ✅ | ❌ |
| Lihat daftar produk | ✅ | ✅ |
| Stok opname | ✅ | ❌ |
| Tambah/edit member | ✅ | ❌ |
| Lihat data member | ✅ | ✅ (terbatas) |
| Bayar hutang member | ✅ | ✅ |
| Laporan penjualan lengkap | ✅ | ❌ |
| Laporan cashflow | ✅ | ❌ |
| Laporan hutang | ✅ | ❌ |
| Export PDF | ✅ | ❌ |
| Kelola pengguna | ✅ | ❌ |
| Pengaturan toko | ✅ | ❌ |
| Backup/restore | ✅ | ❌ |
| Buat/edit diskon | ✅ | ❌ |
| Aktifkan/nonaktifkan diskon | ✅ | ❌ |
| Terapkan diskon aktif saat checkout | ✅ | ✅ |
| Lihat laporan diskon | ✅ | ❌ |
| Print struk | ✅ | ✅ (opsional) |
| Cetak ulang struk (reprint) | ✅ semua | ✅ hari ini saja |
| Tambah catatan transaksi | ✅ | ✅ |
| Cek harga produk | ✅ | ✅ |
| Catat pengeluaran kas | ✅ | ❌ |

| Lihat laporan laba kotor | ✅ | ❌ |
| Lihat/input HPP produk | ✅ | ❌ |
| Cetak surat tagihan hutang | ✅ | ❌ |

---

## 6. Penanganan Error

| Skenario | Pesan Error |
|---|---|
| Stok produk habis | "Stok [nama produk] tidak cukup. Tersisa [X] [satuan]" |
| Hutang melebihi limit | "Limit hutang [nama member] Rp[limit]. Sisa limit: Rp[sisa]" |
| Member tidak aktif | "Member [nama] dinonaktifkan. Hubungi admin." |
| Transaksi sudah di-void | "Transaksi ini sudah dibatalkan pada [tanggal]" |
| Database penuh | "Penyimpanan hampir penuh. Silakan backup dan hapus data lama." |
| Printer tidak terhubung | "Printer tidak ditemukan. Pastikan Bluetooth aktif dan printer menyala." |

---

*SRS ini adalah kontrak teknis antara tim development dan pemilik bisnis. Perubahan harus melalui proses review dan persetujuan kedua pihak.*
