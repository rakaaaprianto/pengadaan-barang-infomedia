# Technical Design: Modern UI/UX Redesign & User Experience Overhaul

## Context

Sistem ini dibangun menggunakan **Next.js 16.3.5 (App Router & Turbopack)**, **Tailwind CSS v4**, **React Hook Form dengan Zod**, **Lucide React**, dan **Recharts**, terintegrasi dengan Google Sheets API sebagai basis data.

Arsitektur saat ini memiliki tiga halaman fungsional utama:
1. Input Pengadaan ([`src/components/AssetRegisterForm.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/AssetRegisterForm.tsx))
2. Dashboard Analitik ([`src/components/DashboardView.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/DashboardView.tsx))
3. Tracking & Distribusi ([`src/components/TrackingView.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/TrackingView.tsx) & [`src/components/UpdateTrackingModal.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/UpdateTrackingModal.tsx))

Perubahan ini berfokus pada refaktor lapisan antarmuka pengguna (UI) dan alur interaksi (UX) tanpa merusak atau mengubah skema data backend dan Google Sheets API yang sudah berjalan.

## Goals / Non-Goals

**Goals:**
- Mengadopsi tata letak **Split-Screen Dual-Pane** pada halaman input pengadaan dengan *sticky summary rail* agar tombol aksi dan kalkulasi finansial selalu terlihat.
- Menyederhanakan 7 dropdown filter pada dashboard menjadi **Smart Filter Bar** dengan *Active Filter Chips* dan kontrol rentang waktu cepat (*Presets*).
- Menghadirkan **Slide-Over Detail Drawer** pada dashboard untuk peninjauan cepat baris transaksi tanpa membebani tabel.
- Menyediakan **View Switcher: Table View vs Kanban Pipeline Board** pada modul pelacakan logistik.
- Menyediakan fitur **Batch / Bulk Selection** pada tabel tracking untuk memperbarui status banyak aset dalam satu kali aksi.
- Menerapkan **Interactive Visual Stepper** pada modal pelacakan dan **Toast Notification System** mengambang yang bersih.
- Menjamin mekanisme pengembalian (*safe rollback*) 100% menggunakan Git Branch `feature/redesign-ui-ux-modern` terhadap `main`.

**Non-Goals:**
- Mengubah struktur kolom Google Sheets (Kolom A-V tetap persis seperti yang telah distandardisasi).
- Mengganti atau memodifikasi endpoint backend yang ada (`/api/submit`, `/api/dashboard`, `/api/tracking`, `/api/upload-evidence`).
- Menambahkan pustaka pihak ketiga berukuran besar (semua komponen dibangun secara natif menggunakan Tailwind CSS v4 dan Lucide Icons).

## Decisions

### 1. Tata Letak Split-Screen (65% Workspace / 35% Sticky Summary)
- **Keputusan**: Pada layar desktop (`lg:` ke atas), form pendaftaran aset dibagi menjadi dua kolom:
  - Kolom Kiri: Form isian dokumen vendor, anggaran, dan tabel dinamis item barang (*Compact Inline Data Grid*).
  - Kolom Kanan: Panel ringkasan melayang (*Sticky Summary*) yang menampilkan total nilai Capex/Opex, kuantitas total, daftar ringkas item, dan tombol "Simpan ke Sheets".
- **Alternatif yang Dipertimbangkan**:
  - *Multi-Step Wizard Form*: Ditolak karena staf pengadaan lebih menyukai pengisian fleksibel dan cepat tanpa harus klik tombol *Next/Back* berulang kali.
  - *Single Column Vertikal (Saat ini)*: Memiliki kelemahan pengguna harus menggulir jauh ke bawah saat item barang bertambah banyak.

### 2. Smart Filter Bar & Active Filter Chips pada Dashboard
- **Keputusan**: Mengganti 7 select dropdown yang berjejer horizontal dengan struktur hierarki:
  - Baris atas: Tombol preset cepat (*Semua*, *YTD 2026*, *Bulan Ini*) + Tombol "Filter Lanjutan" (menampilkan modal/popover filter untuk PIC, Cost Center, Internal Order).
  - Baris bawah: Tag/Chip interaktif untuk setiap filter yang aktif (misal `[Mitra: PT Telkom (x)]`), di mana pengguna dapat mengklik ikon `(x)` untuk menghapus filter spesifik tersebut.
- **Alternatif yang Dipertimbangkan**:
  - *Sidebar Filter Tetap*: Memakan ruang horizontal yang krusial untuk tabel 11+ kolom. Popover + chips memberikan efisiensi ruang terbaik.

### 3. Slide-Over Detail Drawer pada Dashboard
- **Keputusan**: Menambahkan komponen laci samping yang meluncur halus dari kanan layar (*Slide-Over Drawer*) saat pengguna mengklik baris data pada tabel analitik. Panel ini menampilkan:
  - Header: Nomor DO, Nama Proyek, Status Anggaran (Capex/Opex).
  - Body: Rincian item barang, nilai harga, tanggal terima, alokasi CC & IO, data penerima fisik, dan tautan dokumen bukti BA jika sudah ada.
- **Rasional**: Pengguna tidak perlu membuka tab baru atau membaca tabel dengan horizontal scroll panjang untuk melihat detail lengkap suatu transaksi.

### 4. Kanban Pipeline Board View pada Tracking
- **Keputusan**: Mengelompokkan transaksi ke dalam 4 kolom pipeline Kanban berbasis status:
  - Kolom 1: *Diterima / Menunggu Barcode*
  - Kolom 2: *Proses Labeling Barcode*
  - Kolom 3: *Siap Kirim (Distribusi)*
  - Kolom 4: *Selesai (Sudah Diterima & Terbit BA)*
  Pengguna dapat berpindah instan antara Tampilan Tabel dan Tampilan Kanban dengan tombol *toggle tab*.
- **Rasional**: Sangat intuitif bagi pengawas gudang dan logistik untuk memantau beban antrean fisik barang yang sedang berjalan.

### 5. Batch / Bulk Operations
- **Keputusan**: Menambahkan kolom *checkbox* di tabel pelacakan. Ketika minimal satu baris dicentang, muncul *Floating Batch Bar* di bagian bawah layar:
  - Menampilkan jumlah baris terpilih (misal: "5 Aset Dipilih").
  - Tombol aksi: "Update Status Batch" (membuka modal untuk mengisi tanggal kirim, user pemakai, tujuan, dan status sekaligus untuk 5 item tersebut).
- **Rasional**: Menghemat waktu hingga 90% ketika 1 nomor DO memuat puluhan unit perangkat yang dikirim ke tujuan dan pemakai yang sama.

### 6. Interactive Visual Stepper pada Modal Tracking
- **Keputusan**: Di bagian atas modal pelacakan ([`UpdateTrackingModal.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/UpdateTrackingModal.tsx)), ditambahkan indikator progres horizontal:
  `[1. Barang Masuk] ---> [2. Label Barcode] ---> [3. Distribusi] ---> [4. Evidence BA]`
  Warna node step berubah secara dinamis (Selesai = Hijau, Aktif = Merah Infomedia, Belum = Abu-abu) mengikuti nilai tanggal dan status transaksi.

### 7. Global Toast Notification System
- **Keputusan**: Mengimplementasikan `ToastProvider` ringan berbasis React Context di `src/components/ui/Toast.tsx` yang dirender di level `src/app/layout.tsx`.
- **Rasional**: Menghilangkan banner error/sukses lokal yang sering menggeser tata letak formulir saat muncul atau ditutup.

## Risks / Trade-offs

- **[Layar Mobile / Responsivitas Split-Screen]**: Pada layar smartphone atau tablet kecil, tata letak dua kolom split-screen bisa menjadi terlalu sempit.
  - *Mitigasi*: Menggunakan breakpoint responsif `lg:grid-cols-12` (8 kolom form : 4 kolom summary di desktop), sementara pada layar di bawah `lg`, summary menjadi kartu ringkas di bagian atas atau sticky bottom-bar.
- **[Kinerja Render Kanban dengan Ratusan Item]**: Menampilkan 200+ kartu di 4 kolom sekaligus dapat membebani DOM.
  - *Mitigasi*: Menampilkan 15 kartu teratas per kolom dengan tombol *"Muat lebih banyak..."*, serta mengoptimalkan memoization React (`useMemo`).
- **[Keamanan Rollback jika Pengguna Tidak Suka]**:
  - *Mitigasi*: Seluruh pengerjaan dilakukan di cabang terisolasi `feature/redesign-ui-ux-modern`. Cabang `main` telah tersimpan rapi dan dipush ke GitHub remote sebagai patokan absolut.

## Migration & Rollback Plan

1. **Pengembangan**: Dilakukan di cabang `feature/redesign-ui-ux-modern`.
2. **Pengujian**: Validasi typechecking (`npx tsc --noEmit`), build produksi (`npm run build`), dan peninjauan interaktif melalui peramban.
3. **Keputusan Pengguna**:
   - Jika pengguna puas dengan desain baru: Cabang digabung (*merge*) ke `main` dan dipush ke GitHub.
   - Jika pengguna ingin membatalkan/kembali ke desain lama: Cukup jalankan `git checkout main`, seluruh antarmuka kembali 100% persis ke versi semula tanpa ada kode yang hilang.
