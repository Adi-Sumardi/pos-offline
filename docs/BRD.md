# Business Requirements Document (BRD)
## Aplikasi POS Offline — Toko Sparepart Otomotif

**Versi:** 1.0
**Tanggal:** Maret 2026
**Status:** Draft

---

## 1. Latar Belakang Bisnis

Toko sparepart otomotif membutuhkan sistem kasir yang:
- Bekerja **100% offline** — tidak bergantung koneksi internet
- Mencatat penjualan tunai dan **kredit/hutang pelanggan** dengan akurat
- Memberikan **laporan keuangan** harian, mingguan, bulanan yang dapat difilter
- Dioperasikan oleh **kasir** dengan pengawasan penuh oleh **pemilik/admin**
- Dapat dijalankan di **tablet** (meja kasir) dan **HP** (kasir mobile/lapangan)

---

## 2. Tujuan Bisnis

| No | Tujuan | Indikator Keberhasilan |
|---|---|---|
| 1 | Mempercepat proses checkout pelanggan | Transaksi selesai < 2 menit |
| 2 | Mengurangi selisih kas & kehilangan stok | Stok real-time, akurasi 99%+ |
| 3 | Mengelola hutang pelanggan dengan tertib | Zero hutang tidak tercatat |
| 4 | Laporan keuangan akurat tanpa Excel manual | Laporan otomatis, filter fleksibel |
| 5 | Kontrol akses peran yang jelas | Admin & Kasir tidak bisa melampaui hak akses |

---

## 3. Stakeholder

| Peran | Deskripsi | Kepentingan Utama |
|---|---|---|
| **Pemilik Toko (Super Admin)** | Mengelola seluruh sistem | Laporan keuangan, kontrol penuh |
| **Kasir** | Operator kasir harian | Transaksi cepat, mudah digunakan |
| **Pelanggan/Member** | Pembeli, bisa memiliki hutang | Pelayanan cepat, tagihan akurat |

---

## 4. Ruang Lingkup Bisnis

### 4.1 Yang Termasuk (In Scope)

- Manajemen produk: sparepart mobil, motor, oli, baut, mur, kunci, aksesori
- Transaksi penjualan: **tunai** dan **kredit/hutang**
- Manajemen member/pelanggan dengan limit hutang
- Pembayaran hutang (cicilan atau lunas)
- Diskon penjualan yang dapat dikustom oleh admin (persentase atau nominal)
- Laporan penjualan, laporan hutang, laporan stok, arus kas, laporan laba kotor
- Pencatatan pengeluaran kas harian oleh admin

- Manajemen pengguna (admin & kasir)
- Backup data manual ke storage device
- Print struk opsional via Bluetooth thermal printer (sesuai kebutuhan pelanggan)

### 4.2 Yang Tidak Termasuk (Out of Scope)

- Sinkronisasi cloud / multi-cabang (bisa dikembangkan di versi berikutnya)
- Pembayaran digital (QRIS, transfer bank) — versi 1.0 hanya cash & hutang
- E-commerce / toko online
- Akuntansi lengkap (neraca, buku besar)
- Manajemen supplier & pembelian barang

---

## 5. Kebutuhan Bisnis

### 5.1 Manajemen Produk

**BR-P01:** Setiap produk harus memiliki SKU unik, nama, kategori, harga jual, dan stok.

**BR-P02:** Stok harus berkurang secara otomatis setiap ada transaksi penjualan.

**BR-P03:** Sistem harus memberi peringatan ketika stok produk mencapai batas minimum.

**BR-P04:** Admin dapat mengatur harga dan stok kapan saja; kasir tidak dapat mengubah harga.

**BR-P05:** Produk dapat dicari berdasarkan nama, SKU, atau kategori.

### 5.2 Transaksi Penjualan

**BR-T01:** Satu transaksi dapat berisi banyak item produk.

**BR-T02:** Pembayaran **tunai**: pelanggan membayar langsung, kemudian kembalian dihitung otomatis.

**BR-T03:** Pembayaran **hutang**: hanya tersedia untuk pelanggan yang terdaftar sebagai member.

**BR-T04:** Hutang pelanggan tidak boleh melebihi **limit hutang** yang ditetapkan admin.

**BR-T05:** Setiap transaksi menghasilkan nomor unik otomatis (contoh: `TRX-20260325-001`).

**BR-T06:** Transaksi yang sudah tersimpan tidak dapat dihapus; hanya dapat di-void dengan alasan.

**BR-T07:** Struk dapat dicetak ke printer thermal Bluetooth secara **opsional** — tidak semua pelanggan membutuhkan struk fisik. Cetak ulang tersedia dari riwayat transaksi kapan saja.

**BR-T08:** Kasir dapat menambahkan catatan singkat pada transaksi (contoh: nama kendaraan, keperluan servis).

### 5.3 Manajemen Hutang

**BR-H01:** Setiap pelanggan member memiliki saldo hutang yang dihitung secara real-time.

**BR-H02:** Pembayaran hutang dapat dilakukan sebagian (cicilan) atau penuh (lunas).

**BR-H03:** Riwayat hutang dan pembayarannya harus tersimpan lengkap per pelanggan.

**BR-H04:** Admin dapat melihat rekap total hutang semua pelanggan.

**BR-H05:** Kasir hanya dapat menerima pembayaran hutang, tidak dapat mengubah atau menghapus hutang.

### 5.4 Manajemen Member / Pelanggan

**BR-M01:** Data member wajib minimal: **nama** dan **nomor HP**. Data lain (alamat, catatan) bersifat opsional dan dapat dilengkapi belakangan. Limit hutang dan kode member di-generate otomatis oleh sistem.

**BR-M02:** Setiap member memiliki kode member unik (contoh: `MBR-0001`).

**BR-M03:** Admin dapat menonaktifkan member (member nonaktif tidak dapat bertransaksi hutang).

**BR-M04:** Riwayat transaksi per member harus bisa dilihat.

### 5.5 Laporan & Analisis Keuangan

**BR-L01:** Tersedia laporan **penjualan harian** dengan rincian per transaksi.

**BR-L02:** Tersedia laporan **rekap penjualan** yang dapat difilter by: hari, minggu, bulan, atau rentang tanggal custom.

**BR-L03:** Tersedia laporan **arus kas** (cash flow) yang menampilkan pemasukan (penjualan, bayar hutang) dan pengeluaran (biaya operasional, dll).

**BR-L04:** Tersedia laporan **stok** dengan informasi produk menipis.

**BR-L05:** Tersedia laporan **hutang pelanggan** dengan status per member; dapat dicetak sebagai surat tagihan per pelanggan.

**BR-L06:** Tersedia laporan **laba kotor** yang menampilkan selisih harga jual dan harga pokok (HPP) per periode.

**BR-L07:** Semua laporan dapat diekspor ke **PDF** untuk disimpan atau dibagikan.

**BR-L08:** Dashboard menampilkan ringkasan: omzet hari ini, laba kotor hari ini, total transaksi, hutang outstanding, stok kritis.

### 5.6 Diskon Penjualan

**BR-D01:** Admin dapat membuat diskon dengan tipe persentase (%) atau nominal tetap (Rp).

**BR-D02:** Diskon dapat dikonfigurasi cakupannya: untuk semua produk, per kategori, per produk spesifik, atau khusus member.

**BR-D03:** Admin dapat mengaktifkan atau menonaktifkan diskon kapan saja. Diskon nonaktif tidak muncul di layar kasir.

**BR-D04:** Kasir hanya dapat memilih dan menerapkan diskon yang sudah diaktifkan admin — tidak dapat membuat atau mengubah nilai diskon.

**BR-D05:** Hanya satu diskon yang dapat diterapkan per transaksi.

### 5.7 Pengeluaran Kas

**BR-E01:** Admin dapat mencatat pengeluaran kas harian (operasional, ATK, transportasi, dll).

**BR-E02:** Pengeluaran tercatat di laporan cash flow sebagai arus kas keluar.

### 5.8 Manajemen Pengguna

**BR-U01:** Terdapat dua peran: **Super Admin** dan **Kasir**.

**BR-U02:** Super Admin dapat menambah, mengubah, dan menonaktifkan akun kasir.

**BR-U03:** Setiap kasir login dengan username + PIN 6 digit.

**BR-U04:** Semua aktivitas dicatat dengan identitas pengguna yang login (audit log).

---

## 6. Aturan Bisnis

| Kode | Aturan |
|---|---|
| RB-01 | Transaksi hutang hanya untuk member aktif |
| RB-02 | Total hutang member tidak boleh melebihi limit yang ditetapkan |
| RB-03 | Kasir tidak dapat void transaksi sendiri — kasir panggil admin secara fisik, admin yang melakukan void dengan login menggunakan akun admin |
| RB-04 | Harga jual tidak dapat diubah oleh kasir saat transaksi |
| RB-05 | Stok tidak boleh minus (transaksi ditolak jika stok = 0) |
| RB-06 | Pengeluaran kas hanya bisa dicatat oleh admin |
| RB-07 | Backup data wajib dilakukan minimal 1x per minggu (reminder otomatis) |

---

## 7. Asumsi & Ketergantungan

**Asumsi:**
- Toko memiliki minimal 1 tablet Android sebagai kasir utama
- Printer thermal Bluetooth adalah opsional — tidak wajib ada untuk menjalankan aplikasi
- Data produk awal (stok opname) diinput sebelum go-live
- Tidak ada kebutuhan multi-cabang di versi 1.0

**Ketergantungan:**
- Bluetooth aktif untuk printer struk
- Storage device minimal 4GB tersedia
- Android 8.0+ atau iOS 14+ terinstal di perangkat

---

## 8. Risiko Bisnis

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Data hilang karena device rusak | Tinggi | Backup rutin ke external/cloud manual |
| Kasir salah input harga | Sedang | Kasir tidak bisa ubah harga, hanya admin |
| Hutang melebihi kemampuan bayar | Sedang | Limit hutang per member, alert di sistem |
| Stok tidak sinkron dengan fisik | Sedang | Fitur stok opname berkala |

---

## 9. Kriteria Keberhasilan

- [ ] Transaksi penjualan tunai dapat dilakukan dalam < 2 menit
- [ ] Hutang pelanggan tercatat dan terhitung akurat 100%
- [ ] Laporan keuangan harian dapat dilihat dan diekspor
- [ ] Aplikasi berjalan tanpa internet minimal 30 hari tanpa masalah
- [ ] Data tidak hilang meski aplikasi di-restart atau device mati mendadak

---

*BRD ini adalah dokumen hidup — akan diperbarui sesuai feedback pemilik toko sebelum development dimulai.*
