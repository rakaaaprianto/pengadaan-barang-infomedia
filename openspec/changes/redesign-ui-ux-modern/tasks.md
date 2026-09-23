# Tasks: Modern UI/UX Redesign & User Experience Overhaul

## 1. Foundation & Global Shell UI (Toast, Layout, Navbar)

- [x] 1.1 Buat komponen `ToastProvider` dan custom hook `useToast` di `src/components/ui/Toast.tsx` serta integrasikan di [`src/app/layout.tsx`](file:///c:/Project/request-kartu-register-asset/src/app/layout.tsx). Verifikasi kemunculan toast mengambang beranimasi halus dan auto-dismiss tanpa menggeser tata letak.
- [x] 1.2 Perbarui [`src/components/Navbar.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/Navbar.tsx) dan [`src/app/layout.tsx`](file:///c:/Project/request-kartu-register-asset/src/app/layout.tsx) dengan kontainer adaptif yang lebih lega (`max-w-[1536px]` / 2xl), visual glassmorphism modern, dan identitas aksen Infomedia Crimson. Verifikasi navigasi responsif pada desktop dan drawer mobile.


## 2. Halaman Input Pengadaan: Split-Screen Dual-Pane Workspace

- [x] 2.1 Refaktor tata letak [`src/components/AssetRegisterForm.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/AssetRegisterForm.tsx) menjadi struktur Split-Screen dua kolom (area isian formulir di kiri dan *Sticky Order Summary Rail* di kanan). Verifikasi kartu ringkasan Grand Total dan tombol "Simpan ke Sheets" tetap melayang saat menggulir formulir.
- [x] 2.2 Desain ulang bagian entri barang menjadi *Compact Inline Data Grid* yang rapi dan ringkas, menggantikan tumpukan kartu kotak yang tebal. Verifikasi navigasi input dengan keyboard (*Tab/Enter*) dan perhitungan Grand Total secara *real-time*.


## 3. Halaman Dashboard Analitik: Smart Filter & Slide-Over Detail Drawer

- [x] 3.1 Rombak area filter pada [`src/components/DashboardView.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/DashboardView.tsx) dengan **Smart Filter Bar**: Tombol preset rentang waktu cepat (*Semua*, *YTD 2026*, *Bulan Ini*), popover filter sekunder, dan *Active Filter Chips* yang dapat dihapus secara individual via tombol silang (x). Verifikasi filter berfungsi reaktif terhadap tabel dan grafik.
- [x] 3.2 Bangun komponen **Slide-Over Detail Drawer** pada dashboard yang muncul saat pengguna mengeklik baris data pada tabel. Verifikasi drawer menampilkan detail transaksi lengkap, status bukti fisik BA, dan dapat ditutup via tombol silang, tombol Esc, atau klik backdrop.

## 4. Halaman Tracking & Distribusi: Kanban Pipeline & Batch Update

- [x] 4.1 Tambahkan tombol pengalih tampilan (**View Switcher**) pada [`src/components/TrackingView.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/TrackingView.tsx) untuk beralih antara Tampilan Tabel dan **Kanban Pipeline Board** 4-kolom (*Diterima*, *Labeling*, *Siap Kirim*, *Selesai*). Verifikasi kartu-kartu transaksi terdistribusi tepat ke kolom masing-masing sesuai statusnya.
- [x] 4.2 Tambahkan fitur pemilihan ganda (*multi-row selection*) dengan *checkbox* dan *Floating Batch Action Bar* pada tabel tracking. Verifikasi pemilihan beberapa baris dapat membuka modal update massal dan memperbarui data secara simultan.
- [x] 4.3 Tambahkan **Interactive Visual Stepper** pada [`src/components/UpdateTrackingModal.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/UpdateTrackingModal.tsx) di bagian atas modal. Verifikasi indikator tahapan (Penerimaan -> Labeling -> Pengiriman -> Evidence BA) berubah warna secara dinamis sesuai tanggal dan status transaksi.

## 5. Verifikasi Sistem & Quality Assurance

- [x] 5.1 Jalankan pengecekan tipe kompilasi TypeScript `npx tsc --noEmit` dan pastikan selesai dengan Exit Code 0 tanpa error tipe.
- [x] 5.2 Jalankan build produksi `npm run build` dan pastikan seluruh rute terkompilasi optimal tanpa peringatan atau kegagalan bundle.
- [x] 5.3 Validasi alur pengguna di peramban pada semua resolusi (Desktop, Laptop, Tablet, Mobile) dan konfirmasi keselarasan visual dengan identitas brand Infomedia.
