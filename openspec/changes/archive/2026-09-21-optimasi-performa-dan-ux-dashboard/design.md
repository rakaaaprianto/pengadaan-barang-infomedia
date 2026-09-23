# Design

## Context

Sistem dashboard saat ini membaca spreadsheet bulanan menggunakan loop sekuensial pada endpoint `/api/dashboard`, yang menyebabkan waktu tunggu 4–8 detik saat cache tidak tersedia. Di sisi frontend, komponen `DashboardView.tsx` mengelola seluruh state (filter global, pencarian tabel, metrik KPI, data diagram, dan baris tabel) dalam satu siklus render tunggal. Setiap ketukan karakter pada pencarian tabel memicu kalkulasi ulang diagram dan metrik KPI.

Lihat `proposal.md` untuk latar belakang dan `specs/dashboard-analytics/spec.md` untuk spesifikasi fungsional.

## Goals / Non-Goals

**Goals:**
- Mengurangi waktu response backend pada cold fetch `/api/dashboard` dari ~6 detik menjadi < 1 detik dengan `batchGet`.
- Menghilangkan *input lag* dan *stuttering* saat pengguna mengetik pada kotak pencarian tabel dengan memisahkan state pencarian tabel dari kalkulasi diagram atas.
- Meningkatkan produktivitas pengguna dengan tombol *Reset Filter*, *Sortable Table Headers*, dan *Numbered Pagination*.
- Mengurangi ukuran *initial JS bundle* halaman dashboard dengan *code-splitting* Recharts melalui `next/dynamic`.

**Non-Goals:**
- Perubahan pada form input kartu register maupun logika multi-barang (sesuai arahan eksplisit pengguna).
- Perubahan pada skema kolom Google Sheets.
- Penggunaan library state management eksternal tambahan (Redux, Zustand, dsb.) — memanfaatkan state lokal React 19 dan React hooks bawaan.

## Decisions

### 1. Implementasi `batchGetSheetValues` di `src/lib/sheets/client.ts`
- **Pilihan**: Menggunakan Google Sheets API `sheets.spreadsheets.values.batchGet({ spreadsheetId, ranges })`.
- **Rasional**: `batchGet` mengeksekusi pengambilan data dari banyak sheet bulanan sekaligus dalam 1 request HTTP.
- **Alternatif**: `Promise.all` dengan `getSheetValues`. Ditolak karena tetap membuka 12 koneksi HTTP terpisah yang rentan terhadap *rate limit* Google API (429 Quota Exceeded).

### 2. Pemisahan Ruang Lingkup Pencarian Tabel & `useDeferredValue`
- **Pilihan**:
  1. Filter global (Tahun, Bulan, Mitra, PIC, IO, CC, Anggaran) memfilter dataset transaksi dasar (`filteredBaseTransactions`). Dataset inilah yang menjadi sumber data KPI Cards, Donut Chart, Tren Bulanan, dan Top Mitra.
  2. Pencarian teks tabel (`searchQuery`) diterapkan pada level tabel saja (`tableTransactions = useMemo(...)`), dengan `deferredSearchQuery = useDeferredValue(searchQuery)`.
- **Rasional**: Mengetik "ThinkPad" di tabel tidak lagi memicu perhitungan ulang Donut Chart dan Tren Bulanan yang ada di atas. Recharts tidak perlu re-render di setiap ketukan tombol.

### 3. Pengurutan Tabel Dinamis (Client-Side Sorting)
- **Pilihan**: Menambahkan state `sortField` (contoh: `tanggal`, `namaMitra`, `jumlah`, `totalHarga`) dan `sortDirection` (`asc` | `desc`).
- **Rasional**: Karena data yang difilter berada di memori browser, pengurutan client-side berjalan instan (< 5ms) tanpa request ke server.

### 4. Navigasi Halaman dengan Nomor (Numbered Pagination)
- **Pilihan**: Membuat pagination bar yang menampilkan nomor halaman aktif beserta *range window* (misal: `1, 2, 3 ... 8`), dilengkapi tombol Sebelumnya/Selanjutnya.
- **Rasional**: Mempermudah pengguna melompat ke halaman tengah/akhir tanpa harus mengklik tombol "Selanjutnya" belasan kali.

### 5. Code-Splitting Recharts dengan `next/dynamic`
- **Pilihan**: Memisahkan komponen `CapexDonutChart` dan `MonthlyTrendBarChart` ke file terpisah dan memuatnya menggunakan:
  ```tsx
  const DynamicDonutChart = dynamic(() => import("./charts/CapexDonutChart"), { ssr: false });
  ```
- **Rasional**: Menunda pemuatan bundle Recharts (~450KB) hingga komponen mount, mempercepat First Contentful Paint dashboard.

## Risks / Trade-offs

- **[Risk] Format Nama Sheet dengan Spasi pada `batchGet`**  
  → *Mitigasi*: Pastikan seluruh range dibungkus tanda petik tunggal secara konsisten, contoh: `'${sheetName}'!A1:Z`.
- **[Risk] State Sorting Reset saat Filter Berubah**  
  → *Mitigasi*: Pertahankan `sortField` dan `sortDirection` saat pengguna mengganti filter tahun/bulan, tetapi otomatis setel `currentPage = 1`.
- **[Risk] Ketidakcocokan Tipe Data saat Sorting (Tanggal atau String)**  
  → *Mitigasi*: Gunakan fungsi pembanding khusus: `parseISO` / perbandingan timestamp untuk tanggal, `localeCompare` untuk teks nama mitra, dan nilai numerik untuk harga/kuantitas.
