# Spec Delta

## Purpose

Menyediakan sistem analitik dashboard pengadaan aset dengan pemrosesan data batch yang efisien, pencarian tabel yang responsif tanpa lag, pengurutan kolom interaktif, dan kontrol navigasi serta filter yang user-friendly.

## ADDED Requirements

### Requirement: Batch Data Fetching untuk Seluruh Sheet Bulanan
Sistem SHALL mengambil seluruh data transaksi sheet bulanan yang terdaftar dalam satu kali pemanggilan batch request (`batchGet`) ke Google Sheets API, bukan secara sekuensial per sheet.

#### Scenario: Mengambil data dashboard pertama kali atau saat refresh
- **WHEN** pengguna mengakses halaman dashboard atau menekan tombol muat ulang (*force refresh*)
- **THEN** sistem mengeksekusi satu panggilan `batchGet` untuk seluruh sheet bulanan dan mengembalikan data agregasi dalam waktu di bawah 1 detik

### Requirement: Pencarian Data Tabel yang Terisolasi dan Responsif
Sistem SHALL menerapkan mekanisme *deferred* atau *debounced search* pada kotak pencarian tabel transaksi sehingga pengetikan tidak memicu kalkulasi ulang atau render ulang pada diagram visual (Donut dan Bar Chart).

#### Scenario: Pengguna mengetik kata kunci pencarian di tabel
- **WHEN** pengguna mengetik teks pencarian barang atau nomor DO secara cepat pada kotak pencarian tabel
- **THEN** baris tabel difilter secara mulus tanpa adanya *input lag*, dan komponen diagram di bagian atas dashboard tetap mempertahankan kondisi render tanpa re-animasi yang tidak perlu

### Requirement: Tombol Reset Filter dan Indikator Filter Aktif
Sistem SHALL menampilkan jumlah filter aktif yang sedang diterapkan dan menyediakan tombol "Reset Filter" yang hanya tampil ketika minimal terdapat satu filter aktif (selain nilai default "ALL").

#### Scenario: Menyetel filter dan melakukan reset
- **WHEN** pengguna memilih filter tertentu (misalnya Mitra atau Kategori Anggaran)
- **THEN** sistem menampilkan badge jumlah filter aktif dan tombol "Reset Filter", dan ketika tombol reset diklik, seluruh dropdown filter otomatis kembali ke status "ALL"

### Requirement: Pengurutan Kolom Data Tabel (Sortable Headers)
Sistem SHALL memungkinkan pengguna untuk mengurutkan baris transaksi tabel berdasarkan kolom utama (*Tanggal*, *Nama Mitra*, *Qty*, *Total Harga*) secara *ascending* dan *descending* dengan indikator panah status pengurutan pada header kolom.

#### Scenario: Pengguna mengklik header kolom Total Harga
- **WHEN** pengguna mengklik header kolom "Total Harga"
- **THEN** baris transaksi diurutkan dari nilai total terbesar ke terkecil (*descending*), dan klik kedua membalikkan urutan dari terkecil ke terbesar (*ascending*)

### Requirement: Navigasi Halaman dengan Nomor Halaman (Numbered Pagination)
Sistem SHALL menyediakan tombol nomor halaman (*numbered pagination*) berdampingan dengan tombol Sebelumnya dan Selanjutnya agar pengguna dapat melompat langsung ke halaman yang diinginkan.

#### Scenario: Berpindah halaman transaksi
- **WHEN** pengguna mengklik salah satu nomor halaman yang tersedia
- **THEN** tabel langsung menampilkan data baris yang bersesuaian dengan halaman tersebut dan memperbarui penanda halaman aktif

### Requirement: Tampilan Status Kosong yang Informatif (Empty State)
Sistem SHALL menampilkan tampilan kosong (*empty state*) yang bersih dengan pesan yang jelas dan tombol pintas "Reset Filter / Bersihkan Pencarian" apabila filter atau kata kunci pencarian tidak menghasilkan data.

#### Scenario: Pencarian menghasilkan nol transaksi
- **WHEN** kombinasi filter atau kata kunci pencarian tidak menemukan transaksi yang cocok
- **THEN** tabel menampilkan pesan bantuan dan tombol pintas untuk langsung mereset pencarian tanpa harus menghapus teks secara manual
