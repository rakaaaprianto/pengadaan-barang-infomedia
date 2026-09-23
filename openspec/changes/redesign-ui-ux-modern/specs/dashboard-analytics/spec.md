# Spec Delta: dashboard-analytics

## ADDED Requirements

### Requirement: Smart Filter Bar dengan Active Filter Chips yang Dapat Dihapus
Sistem SHALL menyediakan bilah filter terpadu (*Smart Filter Bar*) yang dilengkapi dengan tombol preset rentang waktu cepat (*Semua*, *YTD*, *Bulan Ini*) dan menampilkan *Active Filter Chips* berupa tag interaktif dengan ikon silang (x) untuk setiap kriteria filter yang sedang aktif, sehingga pengguna dapat menghapus filter individual secara cepat.

#### Scenario: Menghapus satu filter kriteria dari chip
- **WHEN** pengguna memilih filter Mitra dan Kategori Anggaran, lalu mengklik tombol silang (x) pada chip "Mitra: PT Telkom"
- **THEN** filter Mitra langsung dikembalikan ke nilai default "ALL" sementara filter Kategori Anggaran tetap dipertahankan, dan tabel serta diagram langsung diperbarui.

### Requirement: Slide-Over Detail Drawer untuk Peninjauan Lengkap Transaksi
Sistem SHALL menyediakan panel laci geser samping (*Slide-Over Drawer*) yang muncul dari sisi kanan layar ketika pengguna mengeklik baris transaksi pada tabel dashboard, menampilkan rincian komprehensif transaksi (identitas dokumen, detail finansial, nama PIC, status proses, dan tautan berkas bukti BA).

#### Scenario: Pengguna mengeklik baris transaksi pada tabel
- **WHEN** pengguna mengeklik salah satu baris transaksi pada tabel analitik
- **THEN** sistem membuka panel laci samping yang menampilkan informasi lengkap transaksi tanpa memuat ulang atau meninggalkan konteks halaman dashboard saat ini.
