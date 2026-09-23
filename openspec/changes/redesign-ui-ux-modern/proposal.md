# Proposal: Modern UI/UX Redesign & User Experience Overhaul

## Why

Sistem pencatatan dan pelacakan pengadaan aset saat ini telah berfungsi dengan sangat stabil dan akurat di level backend dan integrasi Google Sheets. Namun, dari sisi antarmuka pengguna (UI/UX), sistem masih menghadapi beberapa titik friksi (*friction points*):
1. Formulir pendaftaran pengadaan (`/`) memiliki struktur vertikal memanjang (*single-column scroll* hingga >900 baris) yang memaksa pengguna terus *scrolling* naik-turun untuk melihat Grand Total dan tombol Submit saat menginput banyak item barang.
2. Halaman Dashboard Analitik (`/dashboard`) memiliki 7 dropdown filter yang bertumpuk canggung di layar monitor standar/laptop, serta tabel data yang padat tanpa ringkasan instan (*drawer detail*).
3. Halaman Tracking & Distribusi (`/tracking`) menyatukan data sub-proses dalam sel tabel yang sangat padat, dan staf logistik harus memperbarui status baris secara individual satu per satu tanpa fitur *batch update* atau visualisasi alur *Kanban Pipeline*.

Pembaruan ini bertujuan menghadirkan antarmuka modern tingkat enterprise (sekelas Linear/Stripe Dashboard) dengan hierarki visual yang bersih, alur kerja cepat (*high productivity*), dan estetika profesional berbasis identitas brand Infomedia.

## What Changes

- **Halaman Input Pengadaan (`/`)**:
  - Transformasi tata letak menjadi **Split-Screen Workspace**: Area input di sebelah kiri dan *Sticky Order Summary Rail* di sebelah kanan.
  - Ringkasan Grand Total, Kuantitas, dan tombol aksi utama (*Simpan ke Sheets* / *Reset*) selalu melayang dan terlihat tanpa perlu *scrolling*.
  - Entri baris barang dibuat lebih ringkas dengan mode *Compact Data Grid* yang mendukung navigasi keyboard cepat (*Tab/Enter*).
- **Halaman Dashboard Analitik (`/dashboard`)**:
  - Penggantian deretan dropdown filter yang padat dengan **Smart Filter Bar**: Tombol preset rentang waktu cepat (*YTD*, *Bulan Ini*, *Kuartal*), popover filter lanjutan, serta *Active Filter Chips* yang dapat dihapus satu per satu (*removable tags*).
  - Penambahan panel geser samping (**Slide-Over Detail Drawer**) saat pengguna mengeklik baris transaksi di tabel untuk meninjau riwayat lengkap dan status bukti fisik.
- **Halaman Tracking & Distribusi (`/tracking`)**:
  - Penambahan tombol pengalih tampilan (**View Switcher**): Tampilan Tabel (*Table View*) dan Tampilan Papan Alur (**Kanban Pipeline Board View**: *Diterima* -> *Labeling* -> *Siap Kirim* -> *Selesai*).
  - Fitur **Batch / Bulk Update**: Kemampuan mencentang beberapa baris sekaligus untuk memperbarui status dan tujuan distribusi secara kolektif.
  - Penambahan **Interactive Visual Stepper** pada modal pelacakan ([`UpdateTrackingModal.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/UpdateTrackingModal.tsx)) untuk memperjelas progres tahapan barang.
- **Global Shell & Visual Polish**:
  - Harmonisasi warna aksen brand Infomedia Crimson/Red (`#ed1c24`) dengan kartu berkedalaman lembut (*subtle depth & elevated cards*).
  - Sistem notifikasi mengambang (**Toast Notifications**) yang mulus dan non-disruptif menggantikan banner alert yang menggeser tata letak.
  - Lebar kontainer adaptif (*fluid responsive*) sehingga tabel data lega di monitor 1080p ke atas.

## Capabilities

### New Capabilities
- `modern-ui-experience`: Menyediakan antarmuka modern mencakup tata letak *split-screen* formulir pengadaan, *smart filter bar* dan *slide-over drawer* pada dashboard, *kanban pipeline board* serta *batch update* pada modul tracking, serta komponen notifikasi toast global.

### Modified Capabilities
- `dashboard-analytics`: Memperbarui perilaku filter transaksi dan penyajian data agar mendukung *active filter chips*, *quick time-range presets*, serta interaktivitas *slide-over drawer*.

## Impact

- **Frontend Components**:
  - [`src/components/AssetRegisterForm.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/AssetRegisterForm.tsx): Penyesuaian tata letak ke split-screen 2-kolom dengan sticky summary.
  - [`src/components/DashboardView.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/DashboardView.tsx): Penataan ulang filter bar, penambahan filter chips dan drawer detail.
  - [`src/components/TrackingView.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/TrackingView.tsx): Penambahan view switcher (Table/Kanban), batch selection, dan batch update handler.
  - [`src/components/UpdateTrackingModal.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/UpdateTrackingModal.tsx): Penambahan visual stepper progress bar.
  - [`src/components/Navbar.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/Navbar.tsx) & [`src/app/layout.tsx`](file:///c:/Project/request-kartu-register-asset/src/app/layout.tsx): Peningkatan visual glassmorphism, responsive container, dan toast container.
- **Dependencies**:
  - Menggunakan pustaka ikon `lucide-react` yang sudah ada, serta komponen utilitas berbasis Tailwind CSS v4 tanpa dependensi pihak ketiga yang memberatkan.
- **Backend / API**:
  - Tidak ada perubahan skema data inti atau breaking changes pada Google Sheets API. Semua endpoint API yang ada (`/api/submit`, `/api/dashboard`, `/api/tracking`, `/api/upload-evidence`) tetap kompatibel 100%.
