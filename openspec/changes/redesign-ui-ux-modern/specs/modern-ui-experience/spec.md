# modern-ui-experience Specification Delta

## Purpose

Menyediakan antarmuka pengguna modern berstandar enterprise yang memaksimalkan produktivitas kerja staf melalui tata letak split-screen dengan ringkasan sticky, papan alur Kanban, operasi batch, dan notifikasi mengambang yang responsif.

## ADDED Requirements

### Requirement: Split-Screen Layout dengan Sticky Order Summary pada Input Pengadaan
Sistem SHALL menyediakan tata letak dua kolom (*split-screen layout*) pada halaman Input Pengadaan (`/`), di mana kolom utama memuat formulir masukan data dan kolom pendamping (*sidebar*) memuat ringkasan (*Order Summary*) nilai pengadaan dan tombol aksi yang tetap melayang (*sticky*) saat pengguna menggulir halaman.

#### Scenario: Pengguna menginput banyak item barang
- **WHEN** pengguna menambahkan beberapa baris barang dan menggulir ke bawah pada formulir
- **THEN** kartu ringkasan di kolom kanan tetap terlihat di layar (*sticky*), menampilkan kalkulasi Grand Total dan Kuantitas secara *real-time*, serta tombol "Simpan ke Sheets" tetap dapat diakses tanpa perlu menggulir ke bawah.

### Requirement: Compact Inline Data-Grid untuk Entri Cepat Item Barang
Sistem SHALL menyediakan antarmuka tabel masukan barang yang ringkas (*compact data grid*) yang memungkinkan staf menambahkan, mengedit, dan menghapus baris barang dengan navigasi keyboard yang mulus (*Tab* untuk berpindah antar kolom input).

#### Scenario: Entri baris barang cepat
- **WHEN** pengguna selesai mengisi satu baris barang dan menekan tombol tambah baris
- **THEN** baris input baru langsung ditambahkan ke tabel dengan fokus kursor otomatis pada kolom nama barang, dan total nilai langsung teragregasi.

### Requirement: Tampilan Papan Alur (Kanban Pipeline Board) pada Modul Tracking
Sistem SHALL menyediakan tombol pengalih tampilan (*View Switcher*) pada halaman Tracking (`/tracking`) yang memungkinkan pengguna beralih antara Tampilan Tabel Tradisional dan Tampilan Papan Alur (*Kanban Pipeline Board*) dengan 4 kolom tahapan: "Diterima / Menunggu Barcode", "Proses Labeling", "Siap Dikirim", dan "Selesai / Terdistribusi".

#### Scenario: Beralih ke Tampilan Kanban Board
- **WHEN** pengguna mengklik tombol "Tampilan Kanban" pada bar kontrol
- **THEN** transaksi disajikan dalam kartu-kartu ringkas yang dikelompokkan ke dalam 4 kolom tahapan distribusi dengan jumlah item pada masing-masing kolom.

### Requirement: Fitur Batch Update Status Transaksi Distribusi
Sistem SHALL menyediakan fitur pemilihan ganda (*multi-row selection*) menggunakan kotak centang (*checkbox*) pada tabel pelacakan, serta memunculkan bilah tindakan massal (*Batch Action Bar*) untuk memperbarui status proses beberapa transaksi sekaligus dalam satu aksi.

#### Scenario: Memperbarui status 5 barang sekaligus
- **WHEN** pengguna mencentang beberapa baris transaksi yang berasal dari satu pengiriman dan mengklik "Update Batch"
- **THEN** sistem memunculkan modal pembaruan massal dan menyimpan perubahan tanggal kirim, user pemakai, dan tujuan ke Google Sheets untuk semua baris yang dipilih.

### Requirement: Interactive Visual Stepper pada Modal Tracking Status
Sistem SHALL menampilkan indikator tahapan visual interaktif (*Visual Stepper*) pada modal pembaruan status pelacakan ([`UpdateTrackingModal.tsx`](file:///c:/Project/request-kartu-register-asset/src/components/UpdateTrackingModal.tsx)) yang memperlihatkan progres alur dari tahap Penerimaan, Labeling, Pengiriman, hingga Penyelesaian Berita Acara.

#### Scenario: Membuka modal update pelacakan
- **WHEN** pengguna membuka modal update untuk suatu barang
- **THEN** modal menampilkan garis alur tahapan dengan penanda warna jelas (Hijau: Selesai, Biru: Sedang Berjalan, Abu-abu: Menunggu) sesuai dengan data tanggal dan status yang tersimpan.

### Requirement: Sistem Notifikasi Mengambang (Floating Toast Notifications)
Sistem SHALL menampilkan notifikasi hasil aksi pengguna (berhasil simpan, gagal validasi, atau proses unggah bukti) menggunakan komponen *Toast* mengambang di sudut layar yang memiliki animasi transisi halus dan hilang otomatis setelah durasi tertentu tanpa menggeser tata letak konten halaman.

#### Scenario: Pengguna berhasil menyimpan data transaksi
- **WHEN** formulir pendaftaran aset berhasil disubmit ke backend
- **THEN** sistem memunculkan toast hijau melayang dengan pesan sukses dan nomor referensi transaksi tanpa menggeser tata letak formulir.
