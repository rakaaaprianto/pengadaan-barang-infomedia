# PRD — Web Input Kartu Register Asset & Dashboard (Asset Management)

> **Versi 1.1** — revisi setelah arahan atasan (21 Sep 2026): field Nama Mitra, Internal Order (IO), dan Cost Center dibuat sebagai **dropdown** yang datanya diambil dari file master `KKP IO UPDATE (12).xlsx`. Ringkasan perubahan ada di bagian 11.

## 1. Latar Belakang & Tujuan

Tim Asset Management membutuhkan web internal untuk input data pembelian/pengadaan asset (kartu register asset), menggantikan proses input manual di Excel. Setiap data yang di-submit lewat form akan otomatis tersimpan ke **Google Sheets**, dengan satu spreadsheet berisi banyak sheet — satu sheet per bulan (contoh: "Januari 2026", "Februari 2026", dst). Sheet baru otomatis dibuat kalau belum ada.

Selain form input, web ini juga akan punya **halaman dashboard** untuk menampilkan ringkasan data secara visual (total pembelian, breakdown Capex/Opex, tren bulanan, dll) tanpa harus buka Google Sheets manual.

Field **Nama Mitra, Internal Order (IO), dan Cost Center** diisi lewat **dropdown yang bisa dicari** (bukan ketik bebas), supaya data seragam dan tidak ada salah ketik. Daftar pilihannya bersumber dari **master data** (lihat bagian 5.3) yang bisa diperbarui tanpa mengubah kode program.

**Tujuan utama:**
- Mempercepat & merapikan proses input data pembelian/asset dibanding input manual di Excel
- Menjaga konsistensi data (Mitra, IO, Cost Center) lewat dropdown yang mengacu ke master resmi
- Data tetap tersimpan di Google Sheets, bisa diakses & diolah lebih lanjut oleh siapa saja yang punya akses
- Ada dashboard ringkas untuk melihat gambaran besar data tanpa perlu buka spreadsheet
- Bisa diakses tim dari mana saja, termasuk saat WFH — tidak terbatas jaringan kantor saja

**Bukan tujuan (out of scope untuk versi awal):**
- Tidak perlu login/autentikasi user
- Tidak perlu upload foto/lampiran
- Tidak perlu sistem approval/workflow berjenjang
- Tidak perlu halaman admin di web untuk mengedit master data — master diperbarui langsung di Google Sheets (atau lewat script import, lihat 5.3)

---

## 2. User & Environment

| Aspek | Detail |
|---|---|
| Pengguna | Tim internal Asset Management (perkiraan sekitar 3–10 orang) |
| Server | 1 komputer kantor yang menyala terus, berperan sebagai "server" |
| Akses tim | Lewat browser, **bisa dari jaringan kantor maupun dari luar (WFH)** |
| Koneksi internet | **Wajib aktif** di komputer server, karena data dikirim ke Google Sheets API dan web perlu bisa diakses dari luar |
| Autentikasi user | **Tidak ada** — web terbuka, siapapun yang punya link/akses jaringan bisa input & lihat data |

> ⚠️ **Catatan penting soal keamanan**: karena tidak ada login dan web bisa diakses dari luar jaringan kantor, siapapun yang tahu link/alamat web ini bisa input maupun melihat data pembelian (termasuk harga). Ini trade-off yang perlu disadari tim — kalau nanti ternyata data ini sensitif, opsi paling ringan tanpa bikin ribet user adalah menambahkan satu "kode akses" sederhana (bukan login penuh) yang dimasukkan sekali di browser. Tapi untuk versi awal ini, sesuai requirement, tidak ada proteksi tambahan.
>
> Catatan tambahan: master IO/Cost Center memuat nama departemen, divisi, dan direktorat internal. Data ini ikut terbaca lewat dropdown oleh siapapun yang bisa membuka web.

---

## 3. Tech Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Frontend + backend (API routes) jadi satu project |
| Bahasa | **TypeScript** | Type-safety untuk data form & response API |
| Styling | **Tailwind CSS** | Cepat untuk styling form, tabel, dan dashboard |
| Form handling | **React Hook Form + Zod** | Validasi form |
| Dropdown yang bisa dicari | **Combobox/searchable select** (contoh: `react-select` atau Headless UI Combobox — agent boleh pilih yang paling ringan) | Daftar IO aktif ±1.600 item, tidak praktis kalau pakai `<select>` biasa |
| Chart/Dashboard | **Recharts** atau **Chart.js** | Untuk visualisasi data (bar chart, pie chart, dll) |
| Integrasi data | **googleapis** (Google Sheets API v4) | Baca/tulis data ke spreadsheet (transaksi **dan** master data) |
| Import master (script) | **xlsx** (SheetJS) atau **exceljs** | Baca file `KKP IO UPDATE (xx).xlsx` untuk diimpor ke sheet master |
| Auth ke Google | **Service Account** (JSON key) | Tidak perlu login manual tiap request |
| Package manager | **npm** | Paling umum |
| Runtime | **Node.js 18 LTS atau lebih baru** | Requirement minimum Next.js 14 |
| Akses jaringan luar | **Cloudflare Tunnel** (direkomendasikan) | Lihat bagian 3.1 |

### 3.1 Solusi Akses dari Luar Jaringan Kantor (WFH)

**Keputusan: pakai Cloudflare Tunnel.**

Untuk tahap testing/development sekarang, **belum pakai domain sendiri** — pakai subdomain gratis bawaan Cloudflare (`*.trycloudflare.com`). Domain sendiri baru dibeli nanti kalau sudah mau dipakai serius/production.

**Catatan penting soal subdomain gratis**: URL `trycloudflare.com` ini **berubah setiap kali `cloudflared` di-restart** (misal komputer server mati/nyala ulang, atau proses tunnel-nya di-stop). Jadi selama masih pakai opsi gratis ini:
- Link web akan berubah-ubah, perlu di-share ulang ke tim tiap kali berubah
- Kurang cocok untuk pemakaian sehari-hari jangka panjang, tapi cukup untuk testing
- Begitu tim mutusin beli domain, tunnel bisa diarahkan ke domain tetap dan URL tidak akan berubah lagi

Opsi lain (Tailscale, port forwarding, deploy ke cloud) tetap dicatat sebagai alternatif kalau nanti Cloudflare Tunnel dirasa kurang cocok, tapi untuk sekarang tidak perlu dieksplorasi agent.

---

## 4. Yang Perlu Di-install / Disiapkan (Checklist untuk Agent)

### 4.1 Software di komputer server
- [ ] Node.js versi 18 atau lebih baru (`node -v` untuk cek)
- [ ] npm (biasanya sudah include dengan Node.js)
- [ ] Git (opsional, untuk versioning kode)
- [ ] **cloudflared** (CLI Cloudflare Tunnel) — dijalankan manual dulu untuk testing (belum sebagai service/auto-start)

### 4.2 Setup Google Cloud
- [ ] Buat project di [Google Cloud Console](https://console.cloud.google.com)
- [ ] Enable **Google Sheets API**
- [ ] Buat **Service Account**, catat email-nya
- [ ] Generate & download **JSON key** dari service account
- [ ] Buat 1 Google Spreadsheet baru (contoh: "Data OKR Pengadaan 2026")
- [ ] Di spreadsheet yang sama, siapkan **3 sheet master** (kosong dulu, diisi lewat script import atau paste manual — lihat 5.3): `MASTER_IO`, `MASTER_COST_CENTER`, `MASTER_MITRA`
- [ ] **Share spreadsheet** ke email service account, akses **Editor**
- [ ] Catat **Spreadsheet ID** dari URL

### 4.3 Dependencies npm
```bash
npx create-next-app@latest asset-management-app
# TypeScript: Yes | ESLint: Yes | Tailwind: Yes | App Router: Yes

cd asset-management-app

npm install googleapis react-hook-form zod @hookform/resolvers
npm install date-fns recharts
npm install lucide-react
npm install react-select          # atau Headless UI Combobox, untuk dropdown yang bisa dicari
npm install -D xlsx tsx           # untuk script import master dari file Excel
```

### 4.4 File `.env.local` (WAJIB, JANGAN dicommit ke git)
```env
GOOGLE_CLIENT_EMAIL=xxx@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1BxiMVs0XRA5xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 5. Struktur Data

### 5.1 Field Form Input

Field ini diambil dari struktur data existing tim (`DATA_OKR_UNTUK_BULAN_JAN-AGUSTUS_2026.xlsx`), dengan perubahan di field Vendor/Mitra dan Internal Order/Cost Center (ditandai 🆕):

| Field | Tipe | Wajib? | Keterangan |
|---|---|---|---|
| No. | Auto (angka urut) | - | Digenerate otomatis oleh sistem, bukan input manual |
| Tanggal Terima Barang | Date | Ya | Tanggal barang diterima |
| Nomor DO | Text | Tidak | Nomor Delivery Order dari vendor. Field ini baru mulai dipakai belakangan — makanya di data lama banyak kosong, ke depannya diisi kalau ada |
| 🆕 Nama Mitra | **Dropdown (bisa dicari) + opsi "Tambah mitra baru"** | Ya | Nama mitra/vendor/supplier. Sebelumnya text bebas dengan label "Vendor". Sumber: `MASTER_MITRA` (lihat 5.3). Kalau mitra belum ada di daftar, user bisa menambahkannya langsung dari form dan nama itu otomatis masuk ke master |
| Nama Barang | Text | Ya | Nama & spesifikasi barang yang dibeli |
| Nama Project | Text | Ya | Nama project/keperluan pembelian |
| PIC | Text | Ya | Penanggung jawab/pemohon |
| 🆕 Internal Order (IO) | **Dropdown (bisa dicari)** | Tidak | Kode IO, contoh `26CIN10A0033`. Sumber: `MASTER_IO`, hanya IO berstatus aktif. Dipisah dari Cost Center |
| 🆕 Cost Center | **Dropdown (bisa dicari)** | Tidak | Kode cost center, contoh `IN0C0802`. Sumber: `MASTER_COST_CENTER`. Terhubung dengan IO (lihat 6.1) |
| Harga Satuan | Number (currency) | Ya | Harga per unit dalam Rupiah |
| Jumlah | Number | Ya | Kuantitas barang |
| Satuan | Text | Ya | Isi bebas (contoh: Unit, Pcs, Pack, Set, Paket) |
| Anggaran | Select | Ya | Dropdown: Capex, Opex, Capex/Opex |
| Total Harga | Number (currency), **auto-calculated** | - | = Harga Satuan × Jumlah, dihitung otomatis, tidak diinput manual |

> **Catatan koreksi**: di PRD versi sebelumnya, contoh isi field "Internal Order/Cost Centre" adalah `IN0C0902`. Itu sebenarnya format **Cost Center** (awalan `IN0...`). Format **IO** berbeda: 12 karakter, contoh `26CIN10A0033` (2 digit tahun + `CIN` + kode klasifikasi + nomor urut). Karena itu keduanya sekarang dipisah menjadi dua field.

### 5.2 Struktur Google Sheets (transaksi)
- **1 Spreadsheet** menampung semua data transaksi **dan** master data
- **1 Sheet per bulan** untuk transaksi, format nama `MMMM yyyy` dalam **bahasa Indonesia** (contoh: "Januari 2026", "Agustus 2026") — gunakan locale `id` dari `date-fns`, jangan default English
- Sheet baru **dibuat otomatis** saat ada input pertama di bulan tersebut, lengkap dengan header row dengan urutan kolom:

  `No.` · `Tanggal Terima Barang` · `Nomor DO` · `Nama Mitra` · `Nama Barang` · `Nama Project` · `PIC` · `Internal Order` · `Cost Center` · `Harga Satuan` · `Jumlah` · `Satuan` · `Anggaran` · `Total Harga`

- Kolom `Internal Order` dan `Cost Center` menyimpan **kode**-nya saja (contoh `26CIN10A0033`, `IN0C0802`). Nama/deskripsi ditampilkan di dashboard dengan cara lookup ke master
- Kolom "No." di-generate berdasarkan jumlah baris yang sudah ada di sheet bulan tersebut + 1
- Penentuan sheet tujuan berdasarkan **Tanggal Terima Barang** yang diinput user (bukan tanggal submit form) — supaya konsisten dengan cara tim mengelompokkan data existing per bulan
- Karena struktur kolom berubah (satu kolom "Internal Order/Cost Centre" → dua kolom), sheet lama bisa punya header berbeda. Saat **membaca** data (dashboard), baca kolom berdasarkan **nama header**, bukan posisi kolom; kolom yang tidak ada dianggap kosong

### 5.3 Master Data (dropdown)

Master data disimpan di **3 sheet khusus** dalam spreadsheet yang sama dan dibaca oleh web untuk mengisi dropdown. Dengan begitu, kalau atasan mengirim versi terbaru file IO, cukup impor ulang — **tidak perlu ubah kode**.

**Sumber data**: file `KKP IO UPDATE (12).xlsx` dari atasan (file ini di-update berkala, sudah versi ke-12). Isi file:

| Sheet di Excel | Isi | Dipakai untuk |
|---|---|---|
| `INTERNAL ORDER UPDATE` | ±3.630 baris IO (±1.610 berstatus aktif). Tiap IO punya tepat **1 Cost Center**, plus Departemen, Divisi, Direktorat, Profit Center | `MASTER_IO` dan (sebagian) `MASTER_COST_CENTER` |
| `COMPARE COST CENTER` | Perbandingan cost center sebelum vs sesudah remapping 2026 (±120 cost center kondisi terbaru), lengkap dengan nama, divisi, direktorat, pejabat | `MASTER_COST_CENTER` |
| `KLASIFIKASI` | Arti kode IO (mis. `26CIN10A` = Telkom, `10C` = Telkomsel, `10E` = SSO, `10F` = Enterprise, `10G` = POC) | Referensi saja, tidak jadi dropdown |

**a) `MASTER_IO`** — diambil dari sheet `INTERNAL ORDER UPDATE`. Kolom yang dibawa saja:

`IO` · `Long Description` · `Status` · `Cost Center` · `Departement` · `Division` · `Directorate` · `Profit Center Name`

Aturan:
- Sheet aslinya punya ±30.000 baris tapi hanya ±3.630 yang terisi — abaikan baris kosong
- Kolom IO di sheet asli muncul 3 kali (`IO`, `IO`, `IO`); pakai kolom **`IO`** yang di sebelah kolom `Status` (contoh: `17CIN00A0001`)
- **Dropdown hanya menampilkan IO aktif.** Status di file tidak seragam (`AKTIF`, `BLOCK`, `CHURN`, `MERGE TO ...`, `BLOCK CEK SHEET FMC`, dll). Aturan: setelah di-trim dan di-uppercase, status yang **diawali kata `AKTIF`** dianggap aktif (ini juga menangkap `AKTIF kontrak dgn Indibiz Jul-des23`). Semua status lain (BLOCK, CHURN, MERGE) tidak muncul di dropdown
- Kalau ada IO dengan status non-aktif yang sudah pernah tersimpan di transaksi lama, data lama tidak diubah

**b) `MASTER_COST_CENTER`** — kolom: `Cost Center` · `Nama` · `Divisi` · `Direktorat`

Aturan:
- Sumber utama: kolom **AFTER (2026)** di sheet `COMPARE COST CENTER` (kolom `Cost Ctr Remapping`, `Cost Center Name`, `Divisi`, `Direktorat`), karena itu kondisi cost center terkini setelah remapping
- Tambahkan juga cost center yang dipakai IO aktif tapi **tidak ada** di daftar AFTER, supaya IO tetap bisa dipilih dan Cost Center-nya tetap terisi. Per file versi 12: ada **14 kode** (memengaruhi ±86 IO aktif), contoh `IN0B0801` (38 IO), `IN0B0325` (18 IO), `IN0B0403` (10 IO). Nama untuk kode ini diambil dari kolom `Departement` di sheet IO. Ini perlu dikonfirmasi ke atasan (lihat bagian 10)

**c) `MASTER_MITRA`** — kolom: `Nama Mitra` (satu kolom, satu mitra per baris)

- **File KKP IO tidak berisi daftar mitra**, jadi `MASTER_MITRA` dibangun dengan dua cara:
  1. **Isi awal (sekali di depan)**: seed dari nilai unik kolom **Vendor** di data existing (`DATA_OKR_UNTUK_BULAN_JAN-AGUSTUS_2026.xlsx`), rapikan penulisan yang ganda/beda ejaan, lalu isi ke sheet `MASTER_MITRA`. Kalau atasan/procurement punya daftar vendor resmi, pakai itu sebagai isi awal
  2. **Bertambah otomatis dari form**: kalau user memilih "Tambah mitra baru" di form (lihat 6.1), nama mitra baru langsung ditambahkan ke `MASTER_MITRA` saat submit berhasil, sehingga muncul di dropdown untuk input berikutnya
- Kolom `MASTER_MITRA`: `Nama Mitra` · `Ditambahkan Oleh Form` (Ya/kosong) · `Tanggal Ditambahkan`. Kolom kedua dan ketiga hanya untuk memudahkan tim mengecek mitra mana saja yang ditambah lewat form (misalnya untuk dirapikan berkala)
- Tim boleh mengedit `MASTER_MITRA` langsung di Google Sheets kapan saja (rapikan ejaan, hapus duplikat). Perubahan nama di master **tidak** mengubah data transaksi lama yang sudah tersimpan

**Cara update master data:**
1. **Paste manual** langsung ke sheet `MASTER_*` di Google Sheets, atau
2. **Script import**: `npm run import-master -- ./data/KKP_IO_UPDATE.xlsx` yang membaca file Excel dari atasan, menerapkan aturan filter di atas, lalu menimpa isi `MASTER_IO` dan `MASTER_COST_CENTER`. Script ini tidak menyentuh sheet transaksi bulanan maupun `MASTER_MITRA`

---

## 6. Functional Requirements

### 6.1 Halaman Form Input (`/`)
- Form dengan semua field di bagian 5.1
- "Total Harga" otomatis ter-update live di form saat user isi Harga Satuan & Jumlah
- Validasi client-side (Zod) — field wajib harus terisi sebelum submit
- Loading state saat submit (mencegah double-submit)
- Notifikasi sukses/gagal setelah submit
- Form ter-reset otomatis setelah submit berhasil

**Perilaku dropdown Nama Mitra, IO, dan Cost Center:**
- Ketiganya berupa combobox: user bisa **klik lalu pilih**, atau **ketik untuk mencari**. Pencarian tidak case-sensitive dan mencocokkan sebagian teks
- **Nama Mitra**: tampil nama mitra, bisa dipilih dari daftar atau dicari dengan mengetik. **Kalau mitra belum ada**, tersedia opsi **"+ Tambah mitra baru: <teks yang diketik>"** di bagian bawah hasil pencarian:
  - Opsi ini hanya muncul kalau teks yang diketik **belum ada** di daftar (perbandingan tidak case-sensitive, spasi berlebih diabaikan)
  - Setelah dipilih, nama itu terisi di field dan diberi penanda visual kecil "baru" supaya user sadar ini akan ditambahkan ke master
  - Mitra baru **baru benar-benar masuk ke `MASTER_MITRA` saat form berhasil di-submit**. Kalau user batal atau submit gagal, tidak ada mitra yang tersimpan
  - Penulisan dirapikan otomatis sebelum disimpan: hapus spasi di awal/akhir dan spasi ganda. Huruf besar/kecil dibiarkan sesuai ketikan user
  - Untuk mengurangi duplikat akibat beda ejaan, kalau nama yang diketik **mirip** dengan mitra yang sudah ada (misal beda titik/spasi seperti "PT ABC" vs "P.T. ABC"), tampilkan peringatan ringan "Maksud Anda: PT ABC?" dengan pilihan memakai yang sudah ada
- **Internal Order**: tiap opsi tampil `KODE — Long Description` (contoh: `26CIN10A0033 — IO PABX System SDA 2026`). Pencarian mencakup kode **dan** deskripsi, karena user biasanya ingat nama project/pelanggannya, bukan kodenya
- **Cost Center**: tiap opsi tampil `KODE — Nama` (contoh: `IN0C0802 — DEPT. OPERATION IT & TELCO SEGMENT 2`)
- **IO dan Cost Center saling terhubung** (satu IO pasti punya satu Cost Center):
  - Pilih **IO** dulu → Cost Center **otomatis terisi** sesuai IO tersebut
  - Pilih **Cost Center** dulu → daftar IO **difilter** hanya IO milik cost center itu
  - Kalau user mengganti Cost Center jadi berbeda dari cost center IO yang sudah terpilih, IO dikosongkan
  - Tombol "hapus/clear" tersedia di kedua dropdown, karena field ini tidak wajib
- Daftar dropdown diambil dari `/api/master` sekali saat halaman dibuka, lalu difilter di sisi browser (±1.600 IO cukup ringan). Tampilkan skeleton/loading saat daftar belum siap dan pesan error yang jelas kalau gagal dimuat (form tidak boleh bisa disubmit dalam kondisi dropdown belum terisi)

### 6.2 API Route Submit (`/api/submit`)
- Terima data dari form (POST)
- Validasi ulang di server-side, termasuk terhadap master data:
  - `Nama Mitra` harus terisi (setelah di-trim). Kalau sudah ada di `MASTER_MITRA` (cocok tidak case-sensitive), pakai penulisan yang ada di master. Kalau belum ada **dan** request menandai mitra sebagai baru, tambahkan ke `MASTER_MITRA` (lihat urutan proses di bawah)
  - Kalau `Internal Order` diisi: harus ada di `MASTER_IO` dan berstatus aktif
  - Kalau `Internal Order` dan `Cost Center` sama-sama diisi: `Cost Center` harus sama dengan cost center milik IO tersebut
  - Kalau hanya `Cost Center` diisi: harus ada di `MASTER_COST_CENTER`
  - Total Harga dihitung ulang di server (jangan percaya nilai dari client)
- Tentukan nama sheet tujuan berdasarkan bulan dari field "Tanggal Terima Barang"
- Cek apakah sheet bulan tersebut sudah ada → buat baru + header kalau belum, append kalau sudah ada
- **Urutan proses kalau ada mitra baru**: (1) baca ulang `MASTER_MITRA` langsung dari Sheets (jangan dari cache) untuk memastikan nama itu belum ditambahkan orang lain barusan; (2) kalau masih belum ada, append ke `MASTER_MITRA`; (3) baru append transaksi ke sheet bulanan; (4) kosongkan cache master supaya dropdown ter-update. Kalau langkah (3) gagal setelah (2) berhasil, mitra tetap tersimpan di master — ini tidak masalah
- Return response sukses/gagal ke frontend (dengan pesan yang menjelaskan field mana yang tidak valid)

### 6.3 Halaman Dashboard (`/dashboard`)
Menampilkan ringkasan seluruh data dari semua sheet **transaksi bulanan**:

- **Summary cards**: total item dibeli, total nilai pembelian (Rp), jumlah transaksi, jumlah mitra unik
- **Breakdown Capex vs Opex**: chart (pie/donut atau bar) menampilkan proporsi nilai Rp antara Capex dan Opex
- **Tren bulanan**: bar/line chart menampilkan total nilai pembelian per bulan (Jan–Agustus, dst)
- **Top mitra**: tabel/chart mitra dengan total nilai pembelian terbesar
- **Filter**: berdasarkan bulan, nama mitra, PIC, jenis anggaran (Capex/Opex), **Cost Center**, dan **Internal Order**
- **Tabel data mentah**: list semua transaksi (bisa di-scroll/paginate), dengan search sederhana. Kolom IO dan Cost Center menampilkan kode beserta nama (lookup dari master); kalau kode tidak ditemukan di master (misal IO sudah dihapus dari master), tampilkan kodenya saja

### 6.4 API Route Dashboard Data (`/api/dashboard`)
- Fetch data dari **semua sheet transaksi bulanan** di spreadsheet, gabungkan jadi satu dataset
- **Abaikan sheet master.** Sheet dianggap transaksi bulanan **hanya jika** namanya cocok pola `<nama bulan Indonesia> <4 digit tahun>` (contoh: "Maret 2026"). Sheet lain (`MASTER_IO`, `MASTER_COST_CENTER`, `MASTER_MITRA`, atau sheet catatan) tidak boleh ikut dihitung
- Hitung agregasi (total, breakdown, tren) di server sebelum dikirim ke frontend
- **Caching**: simpan hasil di memory selama beberapa menit (misal 5 menit) supaya tidak terus-menerus hit Google Sheets API tiap kali dashboard dibuka — penting karena ada rate limit API dan supaya dashboard terasa cepat

### 6.5 API Route Master Data (`/api/master`) 🆕
- Method GET, mengembalikan daftar untuk dropdown: `mitra[]`, `internalOrders[]` (hanya yang aktif; berisi kode, deskripsi, cost center), `costCenters[]`
- Baca dari sheet `MASTER_MITRA`, `MASTER_IO`, `MASTER_COST_CENTER` (pakai batch read supaya hemat request)
- **Caching di memory ±10 menit**, dan sediakan cara refresh manual (misal `/api/master?refresh=1`) supaya setelah master di-update, hasilnya bisa langsung dilihat tanpa menunggu cache habis
- Validasi di `/api/submit` (6.2) juga memakai cache/data yang sama

---

## 7. Non-Functional Requirements

| Aspek | Requirement |
|---|---|
| Performance | Submit form → data masuk ke Sheets dalam <3 detik. Dropdown IO (±1.600 opsi) tetap responsif saat mengetik/mencari |
| Availability | Web harus tetap jalan selama komputer server menyala (pertimbangkan PM2 atau NSSM agar auto-restart kalau crash, plus `cloudflared` juga perlu tetap jalan sebagai service) |
| Akses jaringan | Bisa diakses dari jaringan kantor maupun dari luar (WFH) via Cloudflare Tunnel — lihat bagian 3.1 |
| Keamanan | `.env.local` tidak boleh ter-expose atau ter-commit ke git. Web tidak punya login — perlu kesadaran tim soal siapa saja yang bisa akses link tersebut |
| Rate limit | Google Sheets API ~300 requests/menit per project — cukup untuk tim kecil, dashboard dan master data pakai caching untuk jaga-jaga |
| Backup | Data otomatis ter-backup karena tersimpan di Google Drive (bawaan Google Sheets) |
| Kualitas data master | File KKP IO di-update berkala oleh atasan. Proses update master harus bisa dilakukan tim tanpa developer (paste manual atau jalankan satu perintah import) |

---

## 8. Keputusan yang Sudah Diambil

Poin-poin ini sudah difinalkan, dicatat di sini supaya agent tidak perlu tanya ulang:

1. **Akses luar jaringan**: pakai **Cloudflare Tunnel**, dengan subdomain gratis `trycloudflare.com` dulu untuk testing (domain sendiri dibeli belakangan — lihat bagian 3.1)
2. **Field "Satuan"**: input teks bebas, bukan dropdown
3. **Field "Nomor DO"**: teks bebas, tidak wajib (field baru, wajar kalau kosong di sebagian data)
4. ~~Field "Internal Order/Cost Centre": teks bebas~~ → **DIGANTI (arahan atasan, 21 Sep 2026)**: dipisah jadi field **Internal Order** dan **Cost Center**, keduanya **dropdown** dari master data (bagian 5.3), tetap tidak wajib
5. **Auto-start saat komputer nyala**: **belum perlu di tahap ini**. Setup PM2/NSSM/auto-start baru dikerjakan nanti setelah project dipindah ke komputer kantor yang jadi server permanen. Untuk sekarang, project cukup dijalankan manual (`npm run dev` / `npm start`) saat development & testing.
6. 🆕 **Nama Mitra** menggantikan "Vendor" dan berupa **dropdown** dari `MASTER_MITRA` (arahan atasan). Karena daftar mitra belum ada, user boleh **menambah mitra baru langsung dari form** lewat opsi "+ Tambah mitra baru"; nama baru otomatis masuk ke `MASTER_MITRA`
7. 🆕 **Master data disimpan di Google Sheets** (`MASTER_IO`, `MASTER_COST_CENTER`, `MASTER_MITRA`), bukan di-hardcode di kode, karena file KKP IO di-update berkala
8. 🆕 **Dropdown IO hanya menampilkan IO berstatus aktif** (status diawali `AKTIF`)
9. 🆕 **IO dan Cost Center saling terhubung**: pilih IO → Cost Center otomatis terisi; pilih Cost Center → daftar IO difilter
10. 🆕 Di Google Sheets transaksi, IO dan Cost Center disimpan sebagai **kode**; nama ditampilkan lewat lookup ke master

---

## 9. Deliverables yang Diharapkan dari Agent

- [ ] Project Next.js yang bisa langsung dijalankan (`npm run dev`)
- [ ] Form input sesuai field di bagian 5.1, dengan dropdown Nama Mitra, IO, dan Cost Center sesuai 6.1
- [ ] Halaman dashboard sesuai bagian 6.3
- [ ] API route submit, dashboard, **dan master** (`/api/submit`, `/api/dashboard`, `/api/master`), terhubung ke Google Sheets, dengan logika auto-create sheet per bulan
- [ ] 🆕 Script import master (`npm run import-master`) yang membaca file `KKP IO UPDATE (xx).xlsx` dan mengisi `MASTER_IO` + `MASTER_COST_CENTER` sesuai aturan 5.3
- [ ] 🆕 Import awal: jalankan script dengan file `KKP IO UPDATE (12).xlsx` yang sudah diberikan, dan seed `MASTER_MITRA` (lihat 5.3c)
- [ ] 🆕 Fitur "+ Tambah mitra baru" di dropdown Nama Mitra, lengkap dengan pengecekan duplikat/mirip dan penyimpanan otomatis ke `MASTER_MITRA` (lihat 6.1 dan 6.2)
- [ ] File `.env.example` (tanpa data asli) sebagai panduan environment variable
- [ ] Setup Cloudflare Tunnel dengan subdomain `trycloudflare.com` (testing) supaya web bisa diakses dari luar jaringan kantor
- [ ] README.md berisi cara menjalankan project pertama kali, cara mengakses dari luar jaringan, **dan cara memperbarui master data**
- [ ] *(Belum dikerjakan sekarang)* Auto-start & Cloudflare Tunnel sebagai service permanen — menyusul saat project dipindah ke komputer kantor

---

## 10. Hal yang Perlu Dikonfirmasi ke Atasan / Tim

Belum menghambat pengerjaan (agent bisa lanjut dengan asumsi di kolom kanan), tapi sebaiknya dikonfirmasi:

| # | Hal yang perlu dikonfirmasi | Asumsi sementara di PRD ini |
|---|---|---|
| 1 | **Sumber isi awal Nama Mitra.** File KKP IO tidak berisi daftar mitra. Apakah ada file/daftar vendor resmi dari atasan atau procurement? | Seed dari nilai unik kolom Vendor di data Jan–Agustus 2026. Mitra baru bisa ditambah langsung dari form (sudah diputuskan, lihat 8 no. 6) |
| 2 | Maksud "nama mitra" = field **Vendor** yang sekarang? | Ya, Vendor diganti nama jadi Nama Mitra |
| 3 | Pesan atasan berbunyi "seperti nama mitra, IO, Cost Center**...**" — apakah ada field lain yang juga mau dijadikan dropdown (misal PIC atau Nama Project)? | Hanya tiga field itu. PIC dan Nama Project tetap teks bebas |
| 4 | Apakah IO dan Cost Center **wajib diisi** sekarang? | Tidak wajib (sama seperti sebelumnya) |
| 5 | **14 cost center yang masih dipakai IO aktif tapi tidak ada di daftar remapping 2026** (mis. `IN0B0801`, `IN0B0325`, `IN0B0403`, total ±86 IO). Apakah memang masih valid, atau IO-nya belum di-update? | Tetap ditampilkan di dropdown supaya IO bisa dipilih |
| 6 | Beberapa IO aktif berasal dari tahun lama (kode tahun 17–24, ±865 dari ±1.610 IO aktif). Apakah semuanya boleh dipilih, atau hanya IO tahun tertentu? | Semua IO aktif boleh dipilih |
| 7 | Data existing Jan–Agustus 2026 (yang punya satu kolom "Internal Order/Cost Centre") akan diimpor ke Google Sheets baru atau tidak? | Tidak diimpor otomatis. Dashboard tetap toleran terhadap header lama (5.2) |

---

## 11. Riwayat Revisi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | — | PRD awal |
| 1.1 | 21 Sep 2026 | Arahan atasan: Nama Mitra, IO, Cost Center jadi dropdown dari file `KKP IO UPDATE (12).xlsx`. Perubahan: (1) "Vendor" → "Nama Mitra" dropdown; (2) "Internal Order/Cost Centre" dipisah jadi dua field dropdown yang saling terhubung; (3) bagian baru 5.3 Master Data dan 6.5 `/api/master`; (4) dashboard mengabaikan sheet master, dan filter ditambah IO & Cost Center; (5) tambah script import master; (6) koreksi contoh `IN0C0902` yang ternyata format Cost Center; (7) tambah bagian 10 (hal yang perlu dikonfirmasi); (8) Nama Mitra punya opsi "+ Tambah mitra baru" dari form karena master mitra belum tersedia |

---

## 12. Referensi Teknis untuk Agent

- Next.js App Router docs: https://nextjs.org/docs
- Google Sheets API (Node.js quickstart): https://developers.google.com/sheets/api/quickstart/nodejs
- googleapis npm package: https://www.npmjs.com/package/googleapis
- React Hook Form + Zod: https://react-hook-form.com/get-started#SchemaValidation
- Recharts: https://recharts.org/
- react-select: https://react-select.com/
- SheetJS (xlsx): https://docs.sheetjs.com/
- Cloudflare Tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
