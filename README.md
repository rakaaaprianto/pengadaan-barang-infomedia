# Web Input Kartu Register Asset & Dashboard (Infomedia)

Aplikasi internal web terintegrasi untuk tim **Asset Management** di **PT Infomedia Nusantara**. Aplikasi ini menggantikan proses pencatatan manual di Excel dengan form input berbasis web yang otomatis tersimpan ke **Google Sheets** (1 sheet per bulan) serta dilengkapi **Dashboard Analitik** visual.

---

## 🚀 Fitur Utama

1. **Form Input Kartu Register Asset (`/`)**:
   - Pencatatan seluruh field pengadaan: Tanggal Terima Barang, Nomor DO, Nama Mitra, Nama Barang, Nama Project, PIC, Internal Order (IO), Cost Center, Harga Satuan, Jumlah, Satuan, dan Jenis Anggaran.
   - **Kalkulasi Otomatis**: *Total Harga* terhitung *live* (`Harga Satuan × Jumlah`) dan divalidasi ulang di server.
   - **Dropdown Cerdas & Terhubung**:
     - Memilih **Internal Order** otomatis mengisi **Cost Center**.
     - Memilih **Cost Center** terlebih dahulu menyaring daftar Internal Order sesuai cost center tersebut.
     - Hanya IO dengan status aktif (`AKTIF`) yang ditampilkan (1.612 IO).
   - **Penambahan Mitra Baru Langsung dari Form**:
     - Fitur *"+ Tambah mitra baru"* otomatis muncul saat mengetik nama mitra yang belum terdaftar.
     - Peringatan deteksi kemiripan nama (*"Maksud Anda: [Nama Mitra]?"*) untuk mencegah duplikasi akibat salah eja.
     - Nama mitra baru otomatis disimpan ke `MASTER_MITRA` di Google Sheets.
   - **Pemisahan Sheet Bulanan Otomatis**: Transaksi otomatis dialokasikan ke sheet bulanan sesuai tanggal terima barang (format: `MMMM yyyy` bahasa Indonesia, contoh: `September 2026`). Jika sheet bulan tersebut belum ada, sistem otomatis membuatnya lengkap beserta header kolom resmi.
   - **Nomor Urut Otomatis**: Kolom `No.` dihitung secara berurutan per bulan.

2. **Dashboard Analitik Pengadaan (`/dashboard`)**:
   - **KPI Summary Cards**: Total Nilai Pengadaan (Rp), Total Kuantitas Item, Proporsi Anggaran (Capex vs Opex), dan Jumlah Mitra Terlibat.
   - **Visualisasi Recharts**:
     - *Donut Chart*: Proporsi Capex vs Opex menggunakan warna resmi brand Infomedia (`#ED1C24`) dan Charcoal slate (`#334155`).
     - *Bar Chart Tren Bulanan*: Akumulasi pengadaan antar bulan secara kronologis.
     - *Top 5 Mitra*: Peringkat mitra dengan nilai transaksi terbesar.
   - **Filter Interaktif Multi-Kriteria**: Filter real-time berdasarkan Bulan, Nama Mitra, PIC, Jenis Anggaran, Cost Center, dan Internal Order.
   - **Tabel Transaksi Mentah**: Dilengkapi pencarian instan, paginasi (10/25/50 per halaman), *horizontal scroll*, serta lookup otomatis nama Internal Order dan Cost Center dari master data.

3. **Design System & Aksesibilitas (UI/UX Pro Max)**:
   - Warna primer merah resmi **Infomedia Red (`#ED1C24`)** yang disampling langsung dari logo perusahaan.
   - Kontras warna memenuhi standar **WCAG AA** (minimal 4.5:1 untuk teks normal).
   - Seluruh combobox mendukung navigasi penuh keyboard (Panah Atas/Bawah, Enter, Esc).
   - Pembedaan visual tegas antara warna brand dan notifikasi error (error menggunakan container tint merah muda, border khusus, dan ikon `AlertCircle`).

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Design Tokens Infomedia
- **Form & Validasi**: React Hook Form + Zod
- **Visualisasi**: Recharts
- **Integrasi Cloud**: Google Sheets API v4 (`googleapis`)
- **Manipulasi Tanggal**: `date-fns` (locale `id`)
- **Ikon**: Lucide React
- **Pemrosesan Excel**: SheetJS (`xlsx`) + `tsx`
- **Akses Jaringan**: Cloudflare Tunnel (`cloudflared`)

---

## 📁 Struktur Folder

```text
├── docs/
│   └── references/                      # File acuan KKP IO & Data OKR
├── public/
│   └── logo/
│       └── infomedia_logo.webp          # Logo resmi Infomedia
├── scripts/
│   ├── import-master.ts                 # Script import master IO & Cost Center
│   └── seed-mitra.ts                    # Script seed master data mitra
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dashboard/route.ts       # Endpoint data dashboard & agregasi
│   │   │   ├── master/route.ts          # Endpoint master data (mitra, IO, CC)
│   │   │   └── submit/route.ts          # Endpoint validasi & submit transaksi
│   │   ├── dashboard/page.tsx           # Halaman Dashboard Analitik
│   │   ├── globals.css                  # CSS token, warna brand, scrollbar
│   │   ├── layout.tsx                   # Root layout, favicon, navbar, footer
│   │   └── page.tsx                     # Halaman Form Input Kartu Register
│   ├── components/
│   │   ├── AssetRegisterForm.tsx        # Form input kartu register asset
│   │   ├── Combobox.tsx                 # Searchable combobox keyboard-friendly
│   │   ├── CurrencyInput.tsx            # Input nominal Rupiah otomatis
│   │   ├── DashboardView.tsx            # Komponen visualisasi & tabel dashboard
│   │   └── Navbar.tsx                   # Header navigasi & logo Infomedia
│   └── lib/
│       ├── schemas/
│       │   └── asset-register.ts        # Skema Zod bersama (client & server)
│       └── sheets/
│           ├── cache.ts                 # In-memory cache (master & dashboard)
│           ├── client.ts                # Client Google Sheets API v4 + retry
│           ├── helpers.ts               # Formatter bulan Indonesia & header parser
│           ├── master.ts                # Operasi master data & alur mitra baru
│           ├── mock.ts                  # Provider in-memory mock fallback
│           └── types.ts                 # Definisi tipe data TypeScript
├── .env.example                         # Template environment variables
├── .env.local                           # Environment variables lokal (ignored)
├── package.json
└── README.md
```

---

## ⚙️ Langkah Instalasi & Menjalankan Pertama Kali

### 1. Kebutuhan Sistem
- **Node.js**: Versi 18 LTS atau lebih baru (`node -v` untuk memeriksa).
- **npm**: Bawaan dari Node.js.

### 2. Pasang Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin file template `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
Isi konfigurasi di `.env.local`:
```env
GOOGLE_CLIENT_EMAIL=your-service-account@your-project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_google_spreadsheet_id_here
MOCK_SHEETS=false
```

> **Catatan Penting Google Sheets**:
> 1. Spreadsheet tujuan wajib di-share ke email Service Account Anda dengan akses **Editor**.
> 2. Nilai `GOOGLE_PRIVATE_KEY` harus mempertahankan tanda kutip ganda dan karakter `\n`.

### 4. Inisialisasi Master Data ke Google Sheets
Jalankan script untuk mengisi sheet `MASTER_IO`, `MASTER_COST_CENTER`, dan `MASTER_MITRA`:

```bash
# Validasi data terlebih dahulu tanpa menulis ke Sheets (Dry Run)
npm run import-master -- --dry-run

# Tulis data master IO dan Cost Center ke Google Sheets
npm run import-master

# Tulis data master Mitra ke Google Sheets
npm run seed-mitra
```

### 5. Kompilasi & Jalankan Aplikasi
Untuk penggunaan operasional yang stabil, jalankan dalam mode **produksi**:
```bash
# Build aplikasi
npm run build

# Jalankan server
npm start
```
Buka browser di [http://localhost:3000](http://localhost:3000).

*(Untuk mode development aktif, gunakan `npm run dev`)*.

---

## 🌐 Akses dari Luar Jaringan Kantor (WFH) via Cloudflare Tunnel

Aplikasi ini dapat diakses oleh tim yang bekerja dari rumah (WFH) secara gratis dan aman tanpa perlu port forwarding atau IP publik statis, menggunakan **Cloudflare Tunnel**.

### 1. Cara Pasang `cloudflared` di Windows
Buka PowerShell / Command Prompt:
- **Opsi A (via winget)**:
  ```powershell
  winget install --id Cloudflare.cloudflared
  ```
- **Opsi B (Download manual)**:
  1. Unduh file `cloudflared-windows-amd64.exe` dari [GitHub Releases Cloudflare](https://github.com/cloudflare/cloudflared/releases/latest).
  2. Ubah nama file menjadi `cloudflared.exe` dan simpan di folder yang terdaftar dalam `PATH` sistem (misal `C:\Windows\system32` atau folder project).

### 2. Membuka Tunnel
Pastikan aplikasi Next.js sudah berjalan di komputer server (`npm start` pada port 3000), lalu buka terminal baru dan jalankan:
```bash
npm run tunnel
```
*(atau perintah langsung: `cloudflared tunnel --url http://localhost:3000`)*.

### 3. Membaca URL Akses
Tunggu beberapa detik hingga muncul log baris URL pada terminal:
```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://random-subdomain-1234.trycloudflare.com                                           |
+--------------------------------------------------------------------------------------------+
```
Salin URL `https://*.trycloudflare.com` tersebut dan bagikan ke tim Asset Management yang sedang WFH.

> ⚠️ **Penting Soal URL Gratis `trycloudflare.com`**:
> - URL subdomain ini bersifat dinamis dan akan **berubah setiap kali proses tunnel di-restart**.
> - Saat komputer server atau tunnel dimatikan lalu dijalankan ulang, salin dan bagikan URL baru yang muncul.
> - Jika nanti perusahaan telah memiliki domain sendiri, Cloudflare Tunnel dapat dihubungkan ke domain tetap.

---

## 🔄 Cara Memperbarui Master Data

Jika atasan mengirimkan pembaruan file Excel IO (misal versi 13 atau 14):
1. Letakkan file `.xlsx` baru di folder project (misal `docs/references/KKP IO UPDATE (13).xlsx`).
2. Jalankan perintah import dengan menyertakan path file tersebut:
   ```bash
   npm run import-master -- "./docs/references/KKP IO UPDATE (13).xlsx"
   ```
3. Script akan otomatis:
   - Memvalidasi kolom dan status aktif.
   - Menimpa isi `MASTER_IO` dan `MASTER_COST_CENTER` di Google Sheets.
   - Mengosongkan cache memory web, sehingga dropdown di form langsung ter-update seketika **tanpa perlu restart server atau mengubah kode**.

---

## 🧪 Mode Mock (`MOCK_SHEETS=true`)

Jika ingin menguji coba atau mendemokan tampilan UI tanpa koneksi internet atau tanpa mengakses Google Sheets API:
1. Ubah variabel di `.env.local`:
   ```env
   MOCK_SHEETS=true
   ```
2. Seluruh data master (1.612 IO, 134 Cost Center, 26 Mitra) dan transaksi akan berjalan secara *in-memory* di memori server lokal, membaca langsung dari file Excel cadangan.

---

## 📋 Catatan Asumsi Teknis

Sesuai arahan PRD v1.1 bagian 8 & 10:
1. **14 Cost Center di luar daftar remapping 2026**: Kode seperti `IN0B0801` (38 IO), `IN0B0325` (18 IO), dan `IN0B0403` (10 IO) yang digunakan oleh 86 IO aktif tetap dimasukkan ke `MASTER_COST_CENTER` dengan nama yang diambil dari kolom `Departement` sheet IO.
2. **IO Lama**: Semua IO yang diawali status `AKTIF` tetap dapat dipilih tanpa batasan tahun kode.
3. **Format Angka & Tanggal**: Menggunakan locale `id-ID` (contoh mata uang: `Rp 1.250.000`, format tanggal sheet: `September 2026`).
4. **Header Transaksi**: Toleran terhadap sheet transaksi terdahulu dengan membaca kolom berdasarkan nama header (bukan indeks kolom statis).
