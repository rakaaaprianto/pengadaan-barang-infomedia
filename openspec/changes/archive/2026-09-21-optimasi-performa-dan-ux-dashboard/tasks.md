# Tasks

## 1. Backend: Batch Data Fetching di Google Sheets API

- [x] 1.1 Buat fungsi `batchGetSheetValues(spreadsheetId: string, ranges: string[])` di `src/lib/sheets/client.ts` menggunakan `sheets.spreadsheets.values.batchGet` dengan mekanisme retry dan verifikasi error handling.
- [x] 1.2 Refaktor route `src/app/api/dashboard/route.ts` untuk memanggil `batchGetSheetValues` satu kali mengambil seluruh sheet bulanan secara batch, menggantikan loop sekuensial `getSheetValues`.
- [x] 1.3 Verifikasi endpoint `GET /api/dashboard?refresh=1` merespons dalam waktu < 1 detik dengan data yang tetap lengkap dan akurat.

## 2. Frontend: Isolasi Render Pencarian Tabel & useDeferredValue

- [x] 2.1 Pisahkan `filteredBaseTransactions` (hanya dipengaruhi filter Tahun, Bulan, Mitra, PIC, IO, CC, Anggaran) sebagai sumber data KPI Cards, Donut Chart, Tren Bulanan, dan Top Mitra di `src/components/DashboardView.tsx`.
- [x] 2.2 Terapkan `useDeferredValue` untuk `searchQuery` pada `tableTransactions` sehingga pengetikan cepat di kotak pencarian tabel tidak memicu kalkulasi dan render ulang diagram visual.
- [x] 2.3 Verifikasi pengetikan teks pencarian pada tabel berjalan mulus tanpa *input lag* atau *frame drop*.

## 3. Frontend: Kontrol Reset Filter & Indikator Filter Aktif

- [x] 3.1 Hitung jumlah filter aktif (`activeFilterCount`) dan tampilkan tombol "Reset Filter" di area panel filter `DashboardView.tsx` yang hanya muncul ketika minimal ada 1 filter selain "ALL".
- [x] 3.2 Implementasikan handler `handleResetFilters` untuk mengembalikan seluruh state filter ke "ALL" dan me-reset `currentPage` ke 1.
- [x] 3.3 Tambahkan badge visual jumlah filter aktif di samping kontrol filter untuk transparansi status pencarian data.

## 4. Frontend: Fitur Sortable Table Headers & Empty State

- [x] 4.1 Tambahkan state `sortField` dan `sortDirection` di `DashboardView.tsx` dengan fungsi pembanding khusus untuk Tanggal (kronologis), Teks Nama Mitra (alfabetis), Kuantitas, dan Total Harga (numerik).
- [x] 4.2 Tambahkan ikon panah sortable (naik/turun/netral) pada header kolom tabel yang interaktif dan dapat diklik.
- [x] 4.3 Buat komponen *Empty State* yang ramah pengguna dengan tombol pintas "Reset Filter / Bersihkan Pencarian" saat tabel tidak menghasilkan baris transaksi.

## 5. Frontend: Numbered Pagination & Code-Splitting Recharts

- [x] 5.1 Implementasikan tombol navigasi nomor halaman (*numbered pagination buttons*) dengan *sliding window* di bawah tabel transaksi agar pengguna dapat melompat halaman langsung.
- [x] 5.2 Pisahkan chart Donut Capex dan Bar Tren ke sub-komponen terpisah di `src/components/charts/` dan gunakan `next/dynamic` dengan `{ ssr: false }` untuk mengurangi initial JS bundle.
- [x] 5.3 Jalankan verifikasi menyeluruh tipe data dengan `npx tsc --noEmit` dan build produksi Next.js dengan `npm run build` untuk memastikan nol error kompilasi.
