# POS Offline — Toko Kurnia

Aplikasi Point of Sale (kasir) full offline untuk toko sparepart mobil, motor, oli, baut, mur, kunci, dan aksesori otomotif.

## Fitur Utama

- Transaksi penjualan **tunai** dan **hutang/kredit**
- Manajemen **member pelanggan** dengan data akurat & limit hutang
- Pembayaran hutang (cicilan atau lunas) + **surat tagihan hutang**
- **Diskon fleksibel** (persentase/nominal, per kategori/produk/member)
- **Laporan keuangan & cash flow** dengan filter tanggal custom
- **Laporan laba kotor** (HPP vs harga jual)
- **Pencatatan pengeluaran kas** harian

- **Manajemen stok** real-time dengan alert stok menipis
- **Scan QR Code** produk via kamera — label di kotak penyimpanan
- **Mode Cek Harga** — scan tanpa tambah ke keranjang
- Print struk via **Bluetooth thermal printer** (opsional)
- Cetak ulang struk dari riwayat transaksi
- **100% offline** — tidak perlu internet
- Berjalan di **Android & iOS** (tablet + HP)
- Dua role: **Super Admin** dan **Kasir**

## Dokumentasi

| File | Deskripsi |
|---|---|
| [docs/TECH_STACK.md](docs/TECH_STACK.md) | Rekomendasi teknologi + arsitektur + struktur folder |
| [docs/BRD.md](docs/BRD.md) | Business Requirements Document — kebutuhan bisnis |
| [docs/SRS.md](docs/SRS.md) | Software Requirements Specification — spesifikasi teknis & skema DB |
| [docs/MOCKUP.md](docs/MOCKUP.md) | Wireframe / mockup semua layar aplikasi |
| [docs/FLOWCHART.md](docs/FLOWCHART.md) | Flowchart semua alur proses (Mermaid diagram) |
| [docs/FITUR_SCAN.md](docs/FITUR_SCAN.md) | Desain lengkap fitur QR scan & sistem label produk |
| [docs/ANALISIS_PRA_DEVELOPMENT.md](docs/ANALISIS_PRA_DEVELOPMENT.md) | Hasil review inkonsistensi + rekomendasi fitur sebelum development |

## Tech Stack (Ringkasan)

```
Framework:    React Native + Expo SDK 52
Database:     SQLite (expo-sqlite) + Drizzle ORM
State:        Zustand
UI:           React Native Paper (Material Design 3)
Charts:       Victory Native
Print:        react-native-thermal-printer (Bluetooth ESC/POS)
Export:       expo-print + expo-sharing
```

## Status

Fase saat ini: **Desain & Perencanaan**

- [x] Tech Stack
- [x] BRD (v1.1 — updated post-review)
- [x] SRS (v1.1 — 13 tabel, 9 modul)
- [x] Mockup
- [x] Flowchart
- [x] Fitur Scan QR
- [x] Analisis Pra-Development
- [ ] Setup project & database schema
- [ ] Development
