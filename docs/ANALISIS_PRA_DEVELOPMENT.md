# Analisis Pra-Development
## Review Konsistensi + Rekomendasi Fitur Tambahan

**Tanggal Review:** Maret 2026
**Status:** Harus diselesaikan sebelum development dimulai

---

## BAGIAN 1 — TEMUAN INKONSISTENSI ANTAR DOKUMEN

### 🔴 KRITIS — Harus Diperbaiki

---

#### [INC-01] BRD belum mencerminkan fitur Diskon

**Dokumen:** BRD.md
**Masalah:** Fitur diskon custom (FR-DSK) ditambahkan di SRS tapi BRD sama sekali tidak menyebutnya.
BRD adalah kontrak bisnis — jika tidak ada di BRD, secara formal fitur ini "tidak ada".

**Perbaikan:**
- Tambahkan di BRD 4.1 (In Scope): "Manajemen diskon fleksibel (persentase atau nominal)"
- Tambahkan kebutuhan bisnis BR-D01–BR-D03

---

#### [INC-02] BRD menyebut print struk wajib, implementasi menjadikannya opsional

**Dokumen:** BRD.md vs MOCKUP.md + FLOWCHART.md
**Masalah:** BRD BR-T07 berbunyi "Struk **dapat** dicetak" (sudah benar, wording-nya opsional).
Namun BRD Section 4.1 In Scope menulis "Print struk via Bluetooth thermal printer"
sebagai fitur wajib, dan Section 7 Asumsi menyebut "Printer thermal **tersedia** di meja kasir" —
terkesan wajib ada printer. Padahal MOCKUP E1 sudah benar: print adalah opsional.

**Perbaikan:**
- Ubah wording BRD 4.1: "Print struk opsional via Bluetooth thermal printer"
- Tambahkan di BRD 7 Asumsi: "Printer adalah opsional — tidak semua kasir membutuhkan"

---

#### [INC-03] BRD RB-06 menyebut pencatatan pengeluaran kas, tapi tidak ada FR/UI-nya

**Dokumen:** BRD.md → SRS.md → MOCKUP.md
**Masalah:** BRD Aturan Bisnis RB-06: *"Pengeluaran kas hanya bisa dicatat oleh admin"*
— tabel `cash_flow` di database sudah support `type = 'out'`,
laporan cash flow pun menyebut kolom Pengeluaran — **tapi tidak ada satu pun FR yang
mendefinisikan bagaimana admin mencatat pengeluaran**. Tidak ada UI mockup-nya.

**Dampak:** Laporan Cash Flow tidak akan akurat karena pengeluaran tidak bisa diinput.

**Perbaikan:** Harus ditambahkan FR-EXP (Modul Pengeluaran Kas) — lihat Bagian 2.

---

#### [INC-04] FR-PROD-03 menyebut riwayat harga tersimpan, tapi tidak ada tabel-nya

**Dokumen:** SRS.md
**Masalah:** SRS FR-PROD-03 menulis *"Riwayat perubahan harga tersimpan"* tapi di
skema database tidak ada tabel `price_logs`. Tidak ada kolom di mana pun yang menyimpan harga lama.

**Dampak:** Klaim ini tidak bisa diimplementasikan tanpa skema database yang jelas.

**Perbaikan:** Tambahkan tabel `price_logs` di skema, atau hapus klaim ini dari FR.

---

#### [INC-05] FITUR_SCAN.md menambahkan field produk yang tidak ada di SRS schema

**Dokumen:** FITUR_SCAN.md vs SRS.md
**Masalah:** FITUR_SCAN.md Section 9 menambahkan field via ALTER TABLE:
```
location, unit_type, default_qty, has_qr
```
- `location` dan `unit_type` **sudah ada** di SRS products table ✅
- `default_qty` **tidak ada** di SRS (tapi fungsinya mirip `qty_step`) ⚠️
- `has_qr` **tidak ada** di SRS products table ❌

**Perbaikan:** Tambahkan `has_qr INTEGER DEFAULT 0` ke tabel `products` di SRS.
Hapus `default_qty` dari FITUR_SCAN (sudah digantikan `qty_step`).

---

#### [INC-06] BRD BR-M01 bertentangan dengan keputusan "nama+HP saja wajib"

**Dokumen:** BRD.md vs SRS.md
**Masalah:** BRD BR-M01 masih menyebut data member mencakup:
*"nama, no. HP, alamat, limit hutang, total hutang berjalan"* — seolah semua wajib.
SRS sudah diupdate: hanya nama + HP yang wajib, sisanya opsional.

**Perbaikan:** Update BR-M01 di BRD untuk menyesuaikan keputusan ini.

---

#### [INC-07] Tidak ada alur "Request Void" dari Kasir ke Admin

**Dokumen:** BRD.md → SRS.md → FLOWCHART.md
**Masalah:** BRD RB-03: *"Kasir tidak dapat void sendiri — harus minta persetujuan admin"*
Tapi di SRS dan FLOWCHART, tidak ada alur bagaimana kasir "meminta" void.
Apakah kasir hanya panggil admin secara fisik? Atau ada notifikasi/flag di dalam sistem?

**Dampak:** Di lapangan, kasir akan bingung apa yang harus dilakukan jika butuh void.

**Perbaikan:** Putuskan salah satu:
- **Opsi A (Sederhana):** Kasir panggil admin → admin login & void langsung. Tidak perlu fitur tambahan, cukup dokumentasikan prosedurnya.
- **Opsi B (Lebih Baik):** Tambahkan fitur "Ajukan Void" — kasir bisa flag transaksi + alasan, admin melihat di antrian dan meng-approve/reject.

---

### 🟡 PERLU DIPERHATIKAN — Minor

---

#### [INC-08] README menyebut "13 tabel" padahal aktualnya 11 tabel

**Dokumen:** README.md
**Masalah:** README menulis "13 tabel utama" tapi schema di SRS hanya mendefinisikan:
`users, categories, products, customers, transactions, transaction_items,
debt_payments, stock_logs, cash_flow, discounts, app_settings` = **11 tabel**.

Kemungkinan yang 2 lagi adalah `price_logs` (disebutkan tapi tidak ada) dan `brands`
(ada di TECH_STACK tapi dihapus — brand sekarang hanya text field di products).

**Perbaikan:** Update README setelah skema final dikonfirmasi.

---

#### [INC-09] Flowchart node syntax berpotensi error di Mermaid

**Dokumen:** FLOWCHART.md — Flow 2 (Transaksi Penjualan)
**Masalah:** Ada node `J` yang muncul dua kali:
```
I4 --> J
J{Pilih Metode Bayar}   ← definisi setelah digunakan sebagai target
J -->|TUNAI| K[...]
```
Mermaid mungkin masih render, tapi ini bukan sintaks yang bersih dan bisa bermasalah
di beberapa renderer.

**Perbaikan:** Pastikan setiap node didefinisikan sebelum digunakan sebagai target.

---

## BAGIAN 2 — FITUR YANG BELUM ADA DAN SANGAT DIBUTUHKAN

Diurutkan dari prioritas tertinggi ke terendah berdasarkan kebutuhan nyata toko sparepart.

---

### 🔴 PRIORITAS TINGGI — Wajib Ada Sebelum Go-Live

---

#### [FEAT-01] HPP / Harga Pokok Penjualan (Cost Price)

**Kenapa penting:**
Tanpa harga beli (HPP), pemilik toko **tidak bisa mengetahui untung/rugi**.
Laporan omzet Rp 5 juta belum tentu menguntungkan — mungkin modal-nya Rp 4.8 juta.
Ini adalah kebutuhan bisnis paling mendasar yang saat ini belum ada.

**Desain yang diusulkan:**
```
Tambahan field di tabel products:
  cost_price  INTEGER DEFAULT 0   -- harga beli/modal per satuan (hanya admin yang lihat)

Laporan baru: Laporan Laba Kotor
  Omzet periode:          Rp 48.750.000
  Total HPP:             (Rp 31.200.000)
  ─────────────────────────────────────
  Laba Kotor:             Rp 17.550.000  (36% margin)
  Total Diskon diberikan:(Rp  2.340.000)
  ─────────────────────────────────────
  Laba Bersih Estimasi:   Rp 15.210.000

Tambahan di dashboard:
  Widget baru: Laba Kotor Hari Ini
```

**Aturan akses:**
- `cost_price` hanya dilihat/diubah oleh Admin — kasir tidak pernah melihatnya
- Di layar kasir, yang tampil tetap hanya `price` (harga jual)

---

#### [FEAT-02] Pencatatan Pengeluaran Kas (Expense Recording)

**Kenapa penting:**
BRD sudah menyebutnya (RB-06) dan tabel `cash_flow` sudah support `type = 'out'`,
tapi tidak ada cara untuk menginput pengeluaran. Tanpa ini, laporan Cash Flow
hanya menampilkan **pemasukan** saja — setengah laporan. Pengeluaran harian
toko (plastik, nota, bensin, parkir, dll) tidak akan tercatat.

**Desain yang diusulkan:**
```
Modul baru: FR-EXP — Catat Pengeluaran Kas (Admin Only)

Form input pengeluaran:
  - Kategori (pilih dari daftar: Operasional / ATK / Lain-lain / dll)
  - Nominal (Rp)
  - Keterangan (opsional)
  - Tanggal (default: hari ini, bisa diubah)

Kategori pengeluaran default:
  - Operasional Toko (listrik, air, sewa)
  - Pembelian ATK (nota, plastik, dll)
  - Transportasi / Bensin
  - Lain-lain
```

---


---

#### [FEAT-04] Cetak Ulang Struk (Reprint)

**Kenapa penting:**
Sudah disebut berkali-kali di dokumen ("struk bisa dicetak ulang dari riwayat transaksi")
tapi **tidak ada FR, tidak ada UI mockup, tidak ada flow** yang mendefinisikannya.
Ini kebutuhan nyata — pelanggan sering lupa minta struk, atau struk rusak.

**Desain yang diusulkan:**
```
Lokasi:
  Riwayat Transaksi → detail transaksi → tombol [🖨️ Cetak Ulang Struk]
  (kasir hanya bisa reprint transaksi hari ini; admin bisa semua)

Struk cetak ulang menambahkan footer:
  "*** CETAK ULANG — TRX-20260325-0047 ***"
```

---

#### [FEAT-05] Surat Tagihan Hutang per Member

**Kenapa penting:**
Toko sparepart dengan sistem hutang **sangat perlu** alat untuk menagih.
Admin atau kasir perlu bisa share/print rekapan hutang ke pelanggan via WhatsApp —
ini lebih profesional daripada hitung manual.

**Desain yang diusulkan:**
```
Lokasi: Detail Member → tombol [📄 Buat Tagihan]

Konten surat tagihan:
  ──────────────────────────────────────
  TAGIHAN HUTANG — TOKO KURNIA
  Kepada: Pak Budi Santoso (MBR-0023)
  Tanggal cetak: 25 Maret 2026
  ──────────────────────────────────────
  No  | Tanggal    | No TRX         | Jumlah
   1  | 10/03/2026 | TRX-0310-0012  | Rp 145.000
   2  | 18/03/2026 | TRX-0318-0031  | Rp 275.000
   3  | 22/03/2026 | TRX-0322-0047  | Rp 230.000
  ──────────────────────────────────────
  Total Hutang:                Rp 650.000
  ──────────────────────────────────────
  Silakan hubungi kami: [no. HP toko]

Output: PDF → Share via WhatsApp
```

---

### 🟡 PRIORITAS MENENGAH — Sangat Berguna, Bisa Masuk v1.0

---

#### [FEAT-06] Mode Cek Harga (Price Check)

**Kenapa penting:**
Di toko sparepart, pelanggan sering bertanya harga tanpa langsung beli.
Kasir yang sedang melayani transaksi lain tidak bisa dengan mudah cek harga
tanpa membuka layar kasir / mengganggu keranjang yang sedang aktif.

**Desain yang diusulkan:**
```
Tombol [🔍 CEK HARGA] di layar kasir (terpisah dari tombol SCAN untuk cart)

Alur:
  1. Tap CEK HARGA → buka scanner
  2. Scan QR produk → tampil popup kecil:
     "Oli Repsol 20W50 | Stok: 8.5L | Rp 45.000/liter"
  3. Popup auto-tutup setelah 5 detik
  4. Produk TIDAK ditambahkan ke keranjang

Atau bisa lewat pencarian produk → tap → "Lihat Detail" (bukan "+ Tambah")
```

---

#### [FEAT-07] Catatan per Transaksi (Transaction Notes)

**Kenapa penting:**
Kolom `notes` sudah ada di tabel `transactions` tapi tidak ada UI-nya.
Di toko sparepart, kasir sering perlu catat konteks: *"untuk ganti oli Honda Beat
Pak Budi"*, *"barang dititip, ambil besok"*, *"servis di bengkel sebelah"*.
Ini sangat membantu ketika melihat riwayat dan memverifikasi transaksi hutang.

**Desain yang diusulkan:**
```
Lokasi: Di layar sukses transaksi (Mockup E1) sebelum konfirmasi final

Atau: Ikon catatan kecil [📝] di keranjang belanja

Textarea opsional, max 100 karakter
Catatan muncul di struk dan di detail riwayat transaksi
```

---

#### [FEAT-08] Multi-Unit / Satuan Ganda

**Kenapa penting:**
Di toko sparepart, banyak produk dijual dalam **dua satuan berbeda**:
- Baut M8: Rp 500/pcs ATAU Rp 40.000/kotak (isi 100)
- Oli 1L: Rp 45.000/liter ATAU Rp 170.000/kaleng (4 liter)
- Kabel listrik: Rp 2.500/meter ATAU Rp 22.000/10m

Saat ini sistem hanya support satu harga per produk.

**Desain yang diusulkan:**
```
Tabel baru: product_units
  id, product_id, unit_name, conversion_qty, price
  -- conversion_qty: berapa unit dasar dalam satuan ini

Contoh:
  product_id=5 (Baut M8) | unit_name='pcs'   | conversion=1   | price=500
  product_id=5 (Baut M8) | unit_name='kotak' | conversion=100 | price=40000

Saat kasir pilih produk di keranjang → dropdown pilih satuan
Stok selalu dihitung dalam unit dasar (pcs)
```

---

#### [FEAT-09] Tabel Riwayat Harga (price_logs)

**Kenapa penting:**
FR-PROD-03 sudah menyatakan riwayat harga tersimpan, tapi belum ada tabelnya.
Tanpa ini, jika harga oli naik dari Rp 45.000 ke Rp 48.000, admin tidak bisa
tahu kapan harga berubah. Penting untuk audit dan analisis margin.

**Desain yang diusulkan:**
```sql
CREATE TABLE price_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  old_price   INTEGER NOT NULL,
  new_price   INTEGER NOT NULL,
  changed_by  INTEGER NOT NULL REFERENCES users(id),
  notes       TEXT,               -- alasan perubahan harga (opsional)
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

### 🟢 PRIORITAS RENDAH — Nice to Have (v1.1 atau v2.0)

---

#### [FEAT-10] Dashboard Kasir yang Disederhanakan

**Kenapa penting:**
Kasir tidak butuh semua info yang admin lihat. Saat ini dashboard sama untuk dua
role. Kasir idealnya langsung lihat: transaksi hari ini, produk yang sering habis,
dan tombol langsung ke layar kasir.

---

#### [FEAT-11] Pengingat Hutang Otomatis (Debt Reminder)

Tampil notifikasi di dalam aplikasi jika ada member yang tidak bayar hutang
lebih dari X hari (admin set berapa hari). Bukan push notification eksternal
— hanya banner di layar admin.

---

#### [FEAT-12] Target Omzet Harian

Admin bisa set target omzet harian. Dashboard menampilkan progress bar:
"Rp 2.4jt dari target Rp 3jt (80%)". Motivasi untuk kasir.

---

#### [FEAT-13] Produk Favorit / Pin Produk

Kasir bisa pin produk yang paling sering dijual ke baris teratas grid,
agar tidak perlu scroll atau search setiap saat.

---

#### [FEAT-14] Riwayat Pembelian per Pelanggan (Non-Member)

Saat ini riwayat transaksi per pelanggan hanya untuk member (yang punya akun).
Untuk pelanggan umum (non-member) tidak ada riwayat. Mungkin tidak terlalu
penting, tapi berguna jika toko ingin analisis segmen pelanggan.

---

## BAGIAN 3 — RINGKASAN AKSI SEBELUM DEVELOPMENT

### Yang harus diperbaiki dulu di dokumentasi:

| No | Aksi | File | Prioritas |
|---|---|---|---|
| 1 | Tambahkan diskon ke BRD (in-scope + BR-D rules) | BRD.md | 🔴 Kritis |
| 2 | Update BRD: print struk opsional, bukan wajib | BRD.md | 🔴 Kritis |
| 3 | Tambahkan FR-EXP modul pengeluaran kas | SRS.md | 🔴 Kritis |
| 4 | Tambahkan tabel `price_logs` ke skema database | SRS.md | 🔴 Kritis |
| 5 | Tambahkan field `has_qr` ke tabel `products` | SRS.md | 🟡 Penting |
| 6 | Hapus `default_qty` dari FITUR_SCAN (digantikan `qty_step`) | FITUR_SCAN.md | 🟡 Penting |
| 7 | Update BR-M01 di BRD: nama+HP saja yang wajib | BRD.md | 🟡 Penting |
| 8 | Putuskan dan dokumentasikan alur "Request Void" kasir | SRS.md + FLOWCHART.md | 🟡 Penting |
| 9 | Fix Mermaid syntax node J di FLOWCHART | FLOWCHART.md | 🟢 Minor |
| 10 | Update jumlah tabel di README sesuai skema final | README.md | 🟢 Minor |

### Fitur yang direkomendasikan ditambahkan sebelum development:

| No | Fitur | Complexity | Rekomendasi | FR (SRS) | UI (Mockup) | Flow |
|---|---|---|---|---|---|---|
| 1 | HPP / Harga Pokok + Laporan Laba | Sedang | ✅ Masuk v1.0 — fundamental | ✅ FR-RPT-07 (§2.9) | ✅ L, L2, L3 | ✅ 8g |
| 2 | Pencatatan Pengeluaran Kas | Rendah | ✅ Masuk v1.0 — sudah di BRD | ✅ FR-EXP-01/02 (§2.7) | ✅ M1, M2 | ✅ 8b |
| 3 | ~~Tutup Kasir / Rekap Shift~~ | Sedang | ❌ Tidak dipakai — kasir hanya 1 orang | — dihapus | — dihapus | — dihapus |
| 4 | Cetak Ulang Struk | Rendah | ✅ Masuk v1.0 — sudah dijanjikan di dokumen | ✅ FR-TRX-06 (§2.3) | ✅ O1, O2 | ✅ 8d |
| 5 | Surat Tagihan Hutang | Rendah | ✅ Masuk v1.0 — sangat berguna | ✅ BR-L05 (§5.5) | ✅ P1, P2 | ✅ 8e |
| 6 | Mode Cek Harga | Rendah | ✅ Masuk v1.0 — sering dibutuhkan di toko | ✅ FR-TRX-01b (§2.3) | ✅ Q1, Q2 | ✅ 8f |
| 7 | Catatan per Transaksi (UI) | Sangat Rendah | ✅ Masuk v1.0 — schema sudah ada | ✅ FR-TRX-07 (§2.3) | ✅ R1, R2, R3 | ✅ (di Flow 2) |
| 8 | Tabel price_logs | Rendah | ✅ Masuk v1.0 — sudah dijanjikan di FR | ✅ §4 Schema | — | — |
| 9 | Multi-Unit / Satuan Ganda | Tinggi | ⚠️ Pertimbangkan v1.1 | — | — | — |
| 10 | Target Omzet Harian | Rendah | ⚠️ v1.1 | — | — | — |
| 11 | Produk Favorit / Pin | Rendah | ⚠️ v1.1 | — | — | — |
| 12 | Pengingat Hutang Otomatis | Rendah | ⚠️ v1.1 | — | — | — |

---

## BAGIAN 4 — SKEMA DATABASE FINAL (setelah semua koreksi)

Setelah semua perbaikan, tabel yang perlu ada adalah **13 tabel**:

```
1.  users              → akun pengguna (admin & kasir)
2.  categories         → kategori produk
3.  products           → master produk (+ has_qr, cost_price)
4.  price_logs         → riwayat perubahan harga produk  [BARU]
5.  customers          → data member/pelanggan
6.  transactions       → header transaksi penjualan
7.  transaction_items  → detail item per transaksi
8.  debt_payments      → riwayat pembayaran hutang
9.  stock_logs         → audit trail perubahan stok
10. cash_flow          → arus kas masuk dan keluar
11. discounts          → konfigurasi diskon
12. expenses           → pencatatan pengeluaran kas  [BARU]
13. app_settings       → konfigurasi aplikasi
```

---

*Dokumen ini adalah hasil review pra-development. Semua temuan wajib diselesaikan
sebelum sprint pertama dimulai.*
