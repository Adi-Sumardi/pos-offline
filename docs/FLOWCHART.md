# Flowchart — Alur Aplikasi POS Sparepart
## Menggunakan Mermaid Diagram

---

## 1. Flow Login & Autentikasi

```mermaid
flowchart TD
    A([Buka Aplikasi]) --> B[Tampil Layar Login]
    B --> C[Input Username + PIN]
    C --> D{Validasi Kredensial}

    D -->|Salah| E[Tambah Counter Gagal]
    E --> F{Gagal >= 5x?}
    F -->|Ya| G[Kunci Akun\nTampil pesan hubungi admin]
    F -->|Tidak| H[Tampil Pesan Salah\nSisa percobaan X]
    H --> C
    G --> Z([End])

    D -->|Benar| I{Cek Role}
    I -->|Super Admin| J[Dashboard Admin\nFull Access]
    I -->|Kasir| K[Dashboard Kasir\nAkses Terbatas]

    J --> L([Mulai Sesi Admin])
    K --> M([Mulai Sesi Kasir])

    subgraph SESSION [Session Management]
        N[Monitor Aktivitas]
        N --> O{Idle > 15 menit?}
        O -->|Ya| P[Logout Otomatis\nKembali ke Login]
        O -->|Tidak| N
    end
```

---

## 2. Flow Transaksi Penjualan (Kasir)

```mermaid
flowchart TD
    A([Buka Layar Kasir]) --> B[Tampil Grid Produk]
    B --> C[Kasir Cari / Pilih Produk]
    C --> D{Stok Tersedia?}

    D -->|Tidak| E[Tampil Error: Stok Habis]
    E --> C

    D -->|Ya| F{Tipe Produk?}

    F -->|piece\nfilter/busi/kunci dll| F1[Tampil Input Qty\nTombol +/− step 1\nDefault qty = 1]
    F -->|bulk_small\nbaut/mur/klip| F2[Tampil Input Qty WAJIB\nTombol +/− step 1\nPilihan cepat: 5/10/20/50]
    F -->|liquid\noli/cairan| F3[Tampil Input Qty LIQUID\nTombol +/− step 0.5\nPilihan cepat: 0.5L/1L/1.5L/2L\nSubtotal real-time]

    F1 --> F4[Kasir konfirmasi qty]
    F2 --> F4
    F3 --> F4

    F4 --> G1{Qty valid?\nTidak melebihi stok?}
    G1 -->|Tidak| G2[Error: Melebihi Stok\nMaks X satuan]
    G2 --> F4
    G1 -->|Ya| G[Tambah ke Keranjang\nhitung subtotal]

    G --> H{Tambah Produk Lagi?}
    H -->|Ya| C
    H -->|Tidak| I[Klik Tombol BAYAR]

    I --> I1{Ada diskon aktif\nyang berlaku?}
    I1 -->|Tidak| J
    I1 -->|Ya| I2[Tampil pilihan diskon\nyang eligible]
    I2 --> I3{Kasir pilih diskon?}
    I3 -->|Tanpa Diskon| J
    I3 -->|Pilih diskon X| I4[Hitung potongan\nUpdate total]
    I4 --> J

    J{Pilih Metode Bayar}

    J -->|TUNAI| K[Input Nominal Uang Diterima]
    K --> L{Uang >= Total?}
    L -->|Tidak| M[Tampil Error: Uang Kurang]
    M --> K
    L -->|Ya| N[Hitung Kembalian\nTampil Preview]
    N --> O{Konfirmasi Bayar?}
    O -->|Batal| I

    J -->|HUTANG| P[Cari / Pilih Member]
    P --> Q{Member Ditemukan & Aktif?}
    Q -->|Tidak| R[Tampil Error: Member Tidak Valid]
    R --> P
    Q -->|Ya| S[Tampil Info Hutang Member\nSaldo + Limit]
    S --> T{Hutang + Transaksi > Limit?}
    T -->|Ya| U[Tampil Warning: Melebihi Limit\nAdmin dapat override]
    U --> V{Lanjut?}
    V -->|Tidak| P
    V -->|Ya| W{Konfirmasi Bayar?}
    T -->|Tidak| W
    W -->|Batal| I

    O -->|Konfirmasi| X[Simpan Transaksi ke DB]
    W -->|Konfirmasi| X

    X --> Y[Kurangi Stok Produk\nREAL qty: -0.5, -1, -20 dll]
    Y --> Z[Update Saldo Hutang Member\nJika hutang]
    Z --> ZA[Catat di Cash Flow]
    ZB --> ZC{Print Struk?}
    ZC -->|Klik Print Struk| ZD[Kirim ke Printer Bluetooth]
    ZD --> ZE{Printer OK?}
    ZE -->|Tidak| ZF[Tampil Error\nOpsi: Coba Lagi / Lewati]
    ZE -->|Ya| ZG[Struk Tercetak ✅]
    ZC -->|Klik Selesai\ntanpa print| ZG
    ZF -->|Lewati| ZG
    ZG --> ZH([Keranjang Dikosongkan\nSiap Transaksi Berikutnya])
    ZH --> B
```

---

## 3. Flow Pembayaran Hutang Member

```mermaid
flowchart TD
    A([Buka Menu Bayar Hutang]) --> B[Cari Member]
    B --> C{Member Ditemukan?}
    C -->|Tidak| D[Tampil: Member Tidak Ada]
    D --> B
    C -->|Ya| E[Tampil Detail Hutang\nRiwayat per transaksi]
    E --> F[Input Nominal Bayar]
    F --> G{Validasi Nominal}
    G -->|Nominal <= 0| H[Tampil Error: Nominal Tidak Valid]
    H --> F
    G -->|Nominal > Saldo Hutang| I[Tampil Info: Lebih dari hutang\nSisa dikembalikan]
    I --> J{Konfirmasi?}
    G -->|Nominal Valid| J
    J -->|Batal| F
    J -->|Konfirmasi| K[Kurangi Saldo Hutang Member]
    K --> L[Simpan ke Tabel debt_payments]
    L --> M[Catat Pemasukan di Cash Flow]
    M --> N{Print Struk Bayar?}
    N -->|Ya| O[Print Struk Pembayaran Hutang]
    N -->|Tidak| P([Selesai])
    O --> P
```

---

## 4. Flow Void Transaksi (Admin Only)

```mermaid
flowchart TD
    A([Admin Buka Riwayat Transaksi]) --> B[Pilih Transaksi]
    B --> C{Status Transaksi?}
    C -->|VOID| D[Tampil: Sudah Di-Void]
    D --> B
    C -->|DONE| E[Tampil Detail Transaksi]
    E --> F[Admin Klik Void]
    F --> G[Input Alasan Void - Wajib]
    G --> H{Alasan Diisi?}
    H -->|Tidak| I[Tampil Error: Alasan Wajib]
    I --> G
    H -->|Ya| J[Konfirmasi Dialog]
    J -->|Batal| B
    J -->|Konfirmasi| K[Update Status Transaksi → VOID]
    K --> L[Kembalikan Stok Semua Item]
    L --> M{Transaksi Hutang?}
    M -->|Ya| N[Kurangi Saldo Hutang Member]
    M -->|Tidak| O[Catat Void di Cash Flow\nPengurangan]
    N --> O
    O --> P[Simpan Log Void: Admin + Waktu + Alasan]
    P --> Q([Void Berhasil])
```

---

## 5. Flow Manajemen Produk (Admin)

```mermaid
flowchart TD
    A([Admin Buka Menu Produk]) --> B{Pilih Aksi}

    B -->|Tambah Produk| C[Form Tambah Produk]
    C --> D{Validasi Form}
    D -->|SKU Sudah Ada| E[Error: SKU Duplikat]
    E --> C
    D -->|Field Wajib Kosong| F[Error: Lengkapi Form]
    F --> C
    D -->|Valid| G[Simpan Produk ke DB]
    G --> H[Catat Log Stok Awal]
    H --> I([Produk Tersimpan])

    B -->|Edit Produk| J[Tampil Form Edit - Data Terisi]
    J --> K{Ubah Harga?}
    K -->|Ya| L[Simpan Riwayat Harga Lama]
    K -->|Tidak| M[Simpan Perubahan]
    L --> M
    M --> N([Produk Diperbarui])

    B -->|Stok Opname| O[Tampil Form Stok Opname]
    O --> P[Input: Stok Aktual + Alasan]
    P --> Q[Hitung Selisih: Aktual - Sistem]
    Q --> R[Konfirmasi Penyesuaian]
    R --> S[Update Stok di DB]
    S --> T[Simpan Log Stok Opname]
    T --> U([Stok Diperbarui])

    B -->|Nonaktifkan| V[Konfirmasi Nonaktifkan]
    V -->|Ya| W[Set is_active = 0]
    W --> X([Produk Nonaktif])
    V -->|Tidak| B
```

---

## 5b. Flow Manajemen Diskon (Admin)

```mermaid
flowchart TD
    A([Admin Buka Menu Diskon]) --> B{Pilih Aksi}

    B -->|Buat Diskon Baru| C[Isi Form Diskon\nnama, tipe, nilai, scope\nmin_purchase, max_discount]
    C --> D{Validasi Form}
    D -->|Nilai <= 0| E[Error: Nilai tidak valid]
    E --> C
    D -->|Valid| F{Status saat simpan?}
    F -->|Aktif langsung| G[Simpan + is_active = 1]
    F -->|Simpan nonaktif| H[Simpan + is_active = 0]
    G --> I([Diskon Tersimpan & Aktif])
    H --> J([Diskon Tersimpan, Nonaktif])

    B -->|Toggle Aktif/Nonaktif| K[Ubah is_active 0↔1]
    K --> L{Aktifkan atau Nonaktifkan?}
    L -->|Aktifkan| M([Diskon Aktif\nMuncul di kasir])
    L -->|Nonaktifkan| N([Diskon Nonaktif\nTidak muncul di kasir])

    B -->|Edit Diskon| O[Tampil Form Edit\nData terisi]
    O --> P{Ada transaksi\nmenggunakan diskon ini?}
    P -->|Ya| Q[⚠️ Perubahan tidak mempengaruhi\ntransaksi yang sudah ada]
    P -->|Tidak| R[Edit bebas]
    Q --> R
    R --> S[Simpan Perubahan]
    S --> T([Diskon Diperbarui])
```

---

## 6. Flow Laporan & Export (Admin)

```mermaid
flowchart TD
    A([Admin Buka Menu Laporan]) --> B{Pilih Jenis Laporan}

    B -->|Penjualan| C[Tampil Laporan Penjualan]
    B -->|Cash Flow| D[Tampil Cash Flow]
    B -->|Hutang| E[Tampil Laporan Hutang]
    B -->|Stok| F[Tampil Laporan Stok]

    C --> G{Set Filter Tanggal}
    D --> G
    E --> G
    F --> G

    G -->|Hari Ini| H[Query Data Hari Ini]
    G -->|Minggu Ini| I[Query Data 7 Hari]
    G -->|Bulan Ini| J[Query Data Bulan Ini]
    G -->|Custom Range| K[Pilih Tanggal Awal & Akhir]
    K --> L[Query Data Custom]

    H --> M[Render Data + Grafik]
    I --> M
    J --> M
    L --> M

    M --> N{Export PDF?}
    N -->|Ya| O[Generate PDF via expo-print]
    O --> P{Simpan atau Share?}
    P -->|Simpan| Q[Simpan ke Downloads]
    P -->|Share| R[Buka Share Dialog\nWhatsApp / Email / Drive]
    Q --> S([Selesai])
    R --> S
    N -->|Tidak| S
```

---

## 7. Flow Manajemen Member (Admin)

```mermaid
flowchart TD
    A([Admin Buka Menu Member]) --> B{Pilih Aksi}

    B -->|Tambah Member| C[Form Tambah Member]
    C --> D[Generate Kode Member: MBR-XXXX]
    D --> E{Validasi}
    E -->|No. HP Duplikat| F[Error: No. HP Sudah Terdaftar]
    F --> C
    E -->|Valid| G[Simpan Member ke DB]
    G --> H([Member Tersimpan])

    B -->|Edit Member| I[Form Edit Member]
    I --> J{Ubah Limit Hutang?}
    J -->|Turunkan Limit < Saldo Hutang| K[Warning: Limit < Hutang Berjalan]
    K --> L{Lanjut?}
    L -->|Tidak| I
    L -->|Ya| M[Simpan Perubahan]
    J -->|Naik/Tidak Berubah| M
    M --> N([Member Diperbarui])

    B -->|Nonaktifkan| O[Konfirmasi Nonaktifkan]
    O -->|Ya| P{Member Ada Hutang?}
    P -->|Ya| Q[Warning: Masih Ada Hutang Rp X]
    Q --> R{Tetap Nonaktifkan?}
    R -->|Tidak| A
    R -->|Ya| S[Set is_active = 0]
    P -->|Tidak| S
    S --> T([Member Nonaktif])
    O -->|Tidak| A
```

---

## 8. Flow Backup & Restore Data

```mermaid
flowchart TD
    A([Admin Buka Pengaturan → Backup]) --> B{Pilih Aksi}

    B -->|Backup| C[Klik Export Database]
    C --> D[Generate File: pos_backup_YYYYMMDD.db]
    D --> E[Pilih Lokasi Simpan]
    E --> F{Simpan atau Share?}
    F -->|Simpan ke Device| G[Simpan ke folder Downloads]
    F -->|Share| H[Buka Share Dialog]
    G --> I[Update last_backup di settings]
    H --> I
    I --> J([Backup Berhasil])

    B -->|Restore| K[Pilih File Backup .db]
    K --> L[Validasi File]
    L -->|File Tidak Valid| M[Error: File Bukan Backup Valid]
    M --> K
    L -->|Valid| N[WARNING: Data saat ini akan ditimpa!]
    N --> O{Konfirmasi?}
    O -->|Batal| A
    O -->|Ya| P[Backup Data Saat Ini Otomatis]
    P --> Q[Replace Database dengan File Backup]
    Q --> R[Restart Aplikasi]
    R --> S([Restore Berhasil])

    subgraph AUTO_REMINDER [Reminder Backup Otomatis]
        T{Sudah > 7 hari\ntanpa backup?}
        T -->|Ya| U[Tampil Notifikasi:\nWaktunya Backup!]
        T -->|Tidak| V[Skip]
    end
```

---

## 8b. Flow Pencatatan Pengeluaran Kas (Admin Only) [FEAT-02]

```mermaid
flowchart TD
    A([Admin Buka Menu Pengeluaran]) --> B{Pilih Aksi}

    B -->|Catat Baru| C[Tampil Form Pengeluaran]
    C --> D[Pilih Kategori:\nOperasional / ATK / Transportasi / Lain-lain]
    D --> E[Input Nominal Rp]
    E --> F[Pilih Tanggal\nDefault: hari ini]
    F --> G[Input Keterangan - opsional]
    G --> H{Validasi Form}
    H -->|Nominal <= 0| I[Error: Nominal tidak valid]
    I --> E
    H -->|Kategori kosong| J[Error: Pilih kategori]
    J --> D
    H -->|Valid| K[Simpan ke tabel expenses]
    K --> L[Otomatis catat ke cash_flow\ntype = 'out', category = 'pengeluaran']
    L --> M([Pengeluaran Tercatat ✅])

    B -->|Lihat Daftar| N[Tampil Daftar Pengeluaran]
    N --> O[Filter: tanggal, kategori]
    O --> P[Tampil ringkasan per kategori\n+ total pengeluaran periode]
```

---

## 8d. Flow Cetak Ulang Struk [FEAT-04]

```mermaid
flowchart TD
    A([Buka Riwayat Transaksi]) --> B[Pilih Transaksi dari Daftar]
    B --> C[Tampil Detail Transaksi]
    C --> D{Role Pengguna?}

    D -->|Kasir| E{Transaksi hari ini?}
    E -->|Tidak| F[Tombol Cetak Ulang\ntidak tersedia / disabled\n'Hanya transaksi hari ini']
    E -->|Ya| G[Tombol 🖨️ Cetak Ulang Struk tersedia]

    D -->|Admin| G

    G --> H[Klik 🖨️ Cetak Ulang Struk]
    H --> I[Generate struk dengan\ndata dari transaksi]
    I --> J[Tambahkan footer:\n'*** CETAK ULANG ***'\n+ tanggal/waktu cetak ulang]
    J --> K{Printer Terhubung?}
    K -->|Ya| L[Kirim ke Printer Bluetooth]
    L --> M([Struk Tercetak ✅])
    K -->|Tidak| N[Tampil Error:\nPrinter tidak ditemukan]
    N --> O{Coba Lagi?}
    O -->|Ya| K
    O -->|Tidak| P([Batal Cetak])
```

---

## 8e. Flow Surat Tagihan Hutang [FEAT-05]

```mermaid
flowchart TD
    A([Admin Buka Detail Member]) --> B{Member punya hutang?}
    B -->|Tidak| C[Tombol Buat Tagihan\ntidak muncul]
    B -->|Ya| D[Tampil tombol 📄 Buat Tagihan]

    D --> E[Klik Buat Tagihan]
    E --> F[Sistem kumpulkan data:\n- Info member: nama, kode, HP, alamat\n- Info toko: nama, alamat, telepon\n- Rincian hutang per transaksi\n- Total hutang outstanding]

    F --> G[Generate dokumen tagihan\nformat PDF via expo-print]
    G --> H[Tampil Preview Surat Tagihan]
    H --> I{Pilih Aksi}

    I -->|Simpan PDF| J[Simpan ke folder Downloads]
    J --> K([PDF Tersimpan ✅])

    I -->|Kirim WhatsApp| L[Buka Share ke WhatsApp\ndengan file PDF terlampir\n+ pesan otomatis:\n'Tagihan hutang dari Toko Kurnia']
    L --> M([Terkirim via WhatsApp ✅])

    I -->|Share Lain| N[Buka Share Dialog\nEmail / Drive / dll]
    N --> O([Dibagikan ✅])

    I -->|Batal| P([Kembali ke Detail Member])
```

---

## 8f. Flow Mode Cek Harga [FEAT-06]

```mermaid
flowchart TD
    A([Kasir di Layar Kasir]) --> B[Klik tombol 🔍 CEK HARGA]
    B --> C[Tampil Modal Cek Harga\ndengan field pencarian]
    C --> D{Metode Cari?}

    D -->|Scan QR| E[Buka Kamera Scanner]
    E --> F{QR Terdeteksi?}
    F -->|Tidak| G[Tampil: Produk tidak ditemukan\nScan ulang atau ketik manual]
    G --> D
    F -->|Ya| H[Cari produk by SKU dari QR]

    D -->|Ketik Manual| I[Input nama / SKU]
    I --> J[Cari produk by nama atau SKU]

    H --> K{Produk ditemukan?}
    J --> K

    K -->|Tidak| L[Tampil: Produk tidak ditemukan]
    L --> D

    K -->|Ya| M[Tampil Popup Info:\n- Nama produk\n- SKU\n- Kategori\n- Harga per satuan\n- Stok tersedia\n- Lokasi rak]
    M --> N[Timer auto-tutup 5 detik]

    N --> O{Kasir tutup manual\natau auto-tutup?}
    O -->|Auto-tutup 5 detik| P[Popup tertutup]
    O -->|Kasir klik ✕ Tutup| P
    O -->|Cek produk lain| D

    P --> Q([Kembali ke Layar Kasir\nKeranjang TIDAK terpengaruh])

    style M fill:#e8f5e9
```

---

## 8g. Flow Laporan Laba Kotor (Admin Only) [FEAT-01]

```mermaid
flowchart TD
    A([Admin Buka Laporan Laba Kotor]) --> B[Pilih Filter Periode]
    B --> C{Periode?}
    C -->|Hari Ini| D[Query transaksi hari ini]
    C -->|Minggu Ini| E[Query 7 hari terakhir]
    C -->|Bulan Ini| F[Query bulan berjalan]
    C -->|Custom Range| G[Pilih tanggal awal & akhir]
    G --> H[Query data custom]

    D --> I[Kalkulasi Laba Kotor]
    E --> I
    F --> I
    H --> I

    I --> J[Untuk setiap item terjual:\nLaba = price × qty − cost_price × qty]
    J --> K{Ada produk tanpa cost_price?}
    K -->|Ya| L[Tampil warning:\n'X produk tanpa HPP\ntidak dihitung']
    K -->|Tidak| M[Semua produk dihitung]
    L --> M

    M --> N[Render Laporan:\n- Omzet periode\n- Total HPP\n- Laba Kotor + margin %\n- Total Diskon\n- Laba Bersih Estimasi\n- Grafik Laba vs Omzet\n- Rincian per produk]

    N --> O{Export PDF?}
    O -->|Ya| P[Generate PDF]
    P --> Q{Simpan atau Share?}
    Q -->|Simpan| R[Simpan ke Downloads]
    Q -->|Share| S[Buka Share Dialog]
    R --> T([Selesai])
    S --> T
    O -->|Tidak| T
```

---

## 9. Diagram Alur Data (Data Flow Overview)

```mermaid
flowchart LR
    KASIR([Kasir]) -->|Input produk, bayar| POS[Layar POS]
    ADMIN([Admin]) -->|Kelola data| MGMT[Management Panel]

    POS -->|Simpan| TRX[(transactions\ntransaction_items)]
    POS -->|Kurangi| STK[(products\nstock)]
    POS -->|Update| DBT[(customers\ndebt_balance)]
    POS -->|Catat| CF[(cash_flow)]

    MGMT -->|CRUD| PRD[(products)]
    MGMT -->|CRUD| MBR[(customers)]
    MGMT -->|CRUD| USR[(users)]
    MGMT -->|Catat| EXP[(expenses)]
    MGMT -->|Baca| RPT[Laporan]

    EXP -->|Auto insert| CF
    TRX -->|Query| RPT
    STK -->|Query| RPT
    DBT -->|Query| RPT
    CF -->|Query| RPT

    RPT -->|Generate| PDF[Export PDF]
    RPT -->|Laba Kotor| PROFIT[Laporan Laba]
    RPT -->|Tagihan| TAGIHAN[Surat Tagihan PDF]
    POS -->|Print| PRINTER[🖨️ Thermal Printer]
    POS -->|Cek Harga| PRICE[Info Produk Popup]
```

---

## 10. State Machine: Status Transaksi

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Kasir mulai input
    DRAFT --> CONFIRMED: Kasir klik Bayar
    CONFIRMED --> DONE: Transaksi tersimpan
    DONE --> VOID: Admin void + alasan
    VOID --> [*]
    DRAFT --> [*]: Kasir batal / session timeout
```

---

## 11. State Machine: Status Hutang Member

```mermaid
stateDiagram-v2
    [*] --> BEBAS: Member baru, hutang=0
    BEBAS --> ADA_HUTANG: Transaksi hutang pertama
    ADA_HUTANG --> BEBAS: Hutang lunas
    ADA_HUTANG --> ADA_HUTANG: Bayar sebagian / tambah hutang baru
    ADA_HUTANG --> KRITIS: Saldo >= 80% limit
    KRITIS --> ADA_HUTANG: Bayar hingga < 80% limit
    KRITIS --> BEBAS: Hutang lunas
    ADA_HUTANG --> BLOCKED: Saldo = limit (tidak bisa transaksi hutang)
    KRITIS --> BLOCKED: Saldo = limit
    BLOCKED --> ADA_HUTANG: Bayar hutang
```

---

*Semua flowchart menggunakan sintaks Mermaid dan dapat dirender di GitHub, Notion, atau VS Code dengan ekstensi Markdown Preview Mermaid.*
