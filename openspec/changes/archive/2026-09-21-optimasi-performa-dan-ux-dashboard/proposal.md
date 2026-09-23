# Proposal

## Why

Saat ini, pembacaan data spreadsheet di endpoint `/api/dashboard` masih menggunakan loop sekuensial per bulan (`for-of` sheet), yang menyebabkan latensi backend lambat (4–8 detik saat cache miss atau refresh). Selain itu, di sisi antarmuka, pencarian tabel (`searchQuery`) belum didebounce dan memicu render ulang berantai pada Recharts SVG dan metrik KPI di setiap ketukan tombol. Dari sisi kenyamanan pengguna (UX), filter belum memiliki tombol reset instan, tabel belum mendukung pengurutan kolom (*sortable headers*), dan navigasi halaman masih terbatas pada tombol Sebelumnya/Selanjutnya saja.

Optimasi ini diperlukan untuk memastikan dashboard berjalan cepat (respons instan < 500ms), mulus saat pencarian data, serta memberikan pengalaman navigasi data pengadaan aset yang lebih produktif dan ramah pengguna.

## What Changes

- **Batch Data Fetching di `/api/dashboard`**: Mengganti pemanggilan sekuensial per sheet dengan Google Sheets `spreadsheets.values.batchGet` untuk mengambil seluruh sheet transaksi bulanan dalam 1 kali round-trip HTTP (peningkatan kecepatan 8x–10x).
- **Debounced / Deferred Table Search & Isolasi Render**: Menerapkan `useDeferredValue` atau *debounce* pada pencarian tabel dan memisahkan cakupan filter tabel agar tidak memicu render ulang kalkulasi diagram Recharts dan kartu KPI di setiap karakter yang diketik.
- **Fitur Reset Filter & Indikator Filter Aktif**: Menyediakan tombol "Reset Filter" yang muncul secara kontekstual saat ada filter aktif beserta badge jumlah filter yang sedang diterapkan.
- **Tabel Transaksi Interaktif (Sortable Columns)**: Mendukung pengurutan data tabel berdasarkan kolom utama (*Tanggal*, *Nama Mitra*, *Qty*, *Total Harga*) secara *ascending* dan *descending* dengan indikator panah interaktif.
- **Peningkatan Navigasi Halaman (Numbered Pagination)**: Menambahkan tombol nomor halaman dan indikasi visual yang jelas untuk melompat antar halaman dengan cepat.
- **Peningkatan Empty State pada Tabel**: Menampilkan visual/ikon pencarian kosong yang elegan beserta tombol pintas "Bersihkan Pencarian / Reset Filter" saat 0 data cocok.
- **Code-Splitting Recharts via `next/dynamic`**: Memuat komponen diagram Recharts secara dinamis (`ssr: false`) untuk mengurangi ukuran initial JavaScript bundle pada halaman dashboard.

## Capabilities

### New Capabilities
- `dashboard-analytics`: Kemampuan analitik dashboard dengan pemrosesan data batch yang cepat, pencarian tabel terisolasi tanpa *frame drop*, pengurutan data interaktif, dan kontrol filter terintegrasi.

### Modified Capabilities
<!-- Tidak ada spesifikasi awal yang dimodifikasi karena ini merupakan penambahan capability spec pertama pada proyek. -->

## Impact

- **API & Backend**: `src/app/api/dashboard/route.ts` dan `src/lib/sheets/client.ts` (menambahkan fungsi `batchGetSheetValues`).
- **Komponen Frontend**: `src/components/DashboardView.tsx` (state pagination, sorting, deferred search, reset filter) dan pembuatan sub-komponen diagram yang di-lazy-load.
- **Dependencies**: Menggunakan kapabilitas bawaan Next.js 16 (`next/dynamic`) dan React 19 (`useDeferredValue`). Tidak ada penambahan paket eksternal baru.
