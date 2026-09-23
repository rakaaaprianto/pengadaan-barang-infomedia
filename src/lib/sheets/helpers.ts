import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { TransactionRow, AnggaranType } from "../schemas/asset-register";

export const TRANSACTION_HEADERS = [
  "No.",
  "Tanggal Terima Barang",
  "Nomor DO",
  "Nama Mitra",
  "Nama Barang",
  "Nama Project",
  "PIC",
  "Internal Order",
  "Cost Center",
  "Harga Satuan",
  "Jumlah",
  "Satuan",
  "Anggaran",
  "Total Harga",
  "Keterangan",
  "Tanggal Terima Barcode",
  "Tanggal Proses Barcode",
  "Tanggal Kirim Barang",
  "User Pemakai",
  "Tujuan Pengiriman",
  "Status Proses",
  "Evidence BA Pengeluaran",
] as const;

export const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/**
 * Format tanggal ISO (YYYY-MM-DD) menjadi nama sheet bulanan bahasa Indonesia: "MMMM yyyy"
 * Contoh: "2026-09-15" -> "September 2026"
 */
export function getMonthSheetName(dateString: string): string {
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : new Date(dateString);
    if (isNaN(date.getTime())) {
      return format(new Date(), "MMMM yyyy", { locale: id });
    }
    return format(date, "MMMM yyyy", { locale: id });
  } catch {
    return format(new Date(), "MMMM yyyy", { locale: id });
  }
}

/**
 * Mengecek apakah nama sheet merupakan sheet transaksi bulanan
 * Pola: <Nama Bulan Indonesia> <4 digit tahun> (contoh: "Januari 2026", "Agustus 2026")
 * Mengabaikan MASTER_IO, MASTER_COST_CENTER, MASTER_MITRA, atau sheet catatan lainnya.
 */
export function isMonthlySheet(sheetName: string): boolean {
  if (!sheetName || sheetName.startsWith("MASTER_")) {
    return false;
  }
  const regex = /^(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}$/i;
  return regex.test(sheetName.trim());
}

/**
 * Normalisasi string header untuk pencocokan toleran
 */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Parsing angka dari string cell Google Sheets (misal: "Rp 1.500.000", "1500000", "1,500.00")
 */
export function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const str = String(value)
    .replace(/Rp\.?/gi, "")
    .replace(/\s+/g, "")
    .trim();

  // Jika format menggunakan titik sebagai pemisah ribuan (misal 1.250.000)
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
    return parseFloat(str.replace(/\./g, "").replace(",", "."));
  }
  // Jika format menggunakan koma sebagai pemisah ribuan (misal 1,250,000)
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    return parseFloat(str.replace(/,/g, ""));
  }
  // Standard float
  const parsed = parseFloat(str.replace(/,/g, "."));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Memetakan baris Google Sheets menjadi objek TransactionRow berdasarkan header kolom
 * Toleran terhadap urutan kolom berbeda dan nama header lama (misal "VENDOR" atau "INTERNAL ORDER/COST CENTRE")
 */
export function parseSheetRowsToTransactions(rows: unknown[][]): TransactionRow[] {
  if (!rows || rows.length < 2) return [];

  const rawHeaders = rows[0].map((h) => String(h || ""));
  const headerMap = new Map<string, number>();

  rawHeaders.forEach((h, idx) => {
    headerMap.set(normalizeHeader(h), idx);
  });

  const getColIdx = (aliases: string[]): number => {
    for (const alias of aliases) {
      const idx = headerMap.get(normalizeHeader(alias));
      if (idx !== undefined) return idx;
    }
    return -1;
  };

  const noIdx = getColIdx(["no", "no."]);
  const tanggalIdx = getColIdx(["tanggalterimabarang", "tanggal", "tgl"]);
  const noDoIdx = getColIdx(["nomordo", "nodo", "do"]);
  const mitraIdx = getColIdx(["namamitra", "mitra", "vendor", "supplier"]);
  const barangIdx = getColIdx(["namabarang", "barang", "deskripsibarang"]);
  const projectIdx = getColIdx(["namaproject", "project", "namaproyek"]);
  const picIdx = getColIdx(["pic", "pemohon"]);
  const ioIdx = getColIdx(["internalorder", "io"]);
  const ccIdx = getColIdx(["costcenter", "cc", "costcentre"]);
  const legacyIoCcIdx = getColIdx(["internalordercostcentre", "io/cc", "internalordercostcenter"]);
  const hargaSatuanIdx = getColIdx(["hargasatuan", "harga", "hargasatuanrp"]);
  const jumlahIdx = getColIdx(["jumlah", "qty", "kuantitas"]);
  const satuanIdx = getColIdx(["satuan", "unit"]);
  const anggaranIdx = getColIdx(["anggaran", "jenisanggaran"]);
  const totalHargaIdx = getColIdx(["totalharga", "total", "totalrp"]);
  const keteranganIdx = getColIdx(["keterangan", "catatan", "notes", "ket"]);
  const tglTerimaBarcodeIdx = getColIdx(["tanggalterimabarcode", "tglterimabarcode", "terimabarcode"]);
  const tglProsesBarcodeIdx = getColIdx(["tanggalprosesbarcode", "tglprosesbarcode", "selesaibarcode", "tglproses", "tanggalproses"]);
  const tglKirimBarangIdx = getColIdx(["tanggalkirimbarang", "tglkirimbarang", "tanggalkirim", "tglkirim"]);
  const userPemakaiIdx = getColIdx(["userpemakai", "usernyapic", "user", "penerima", "picpenerima"]);
  const tujuanPengirimanIdx = getColIdx(["tujuanpengiriman", "tujuan", "lokasitujuan", "lokasi"]);
  const prosesStatusIdx = getColIdx(["statusproses", "prosesstatus", "status"]);
  const evidenceBaIdx = getColIdx(["evidencebapengeluaran", "evidenceba", "fileba", "bapengeluaran", "evidence", "lampiranba"]);

  const transactions: TransactionRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const getValue = (idx: number): string => {
      if (idx === -1 || idx >= row.length) return "";
      return String(row[idx] ?? "").trim();
    };

    const tanggalTerima = getValue(tanggalIdx);
    const namaBarang = getValue(barangIdx);
    const namaMitra = getValue(mitraIdx);

    // Abaikan baris yang sama sekali tidak memiliki barang dan mitra
    if (!namaBarang && !namaMitra && !tanggalTerima) continue;

    let internalOrder = getValue(ioIdx);
    let costCenter = getValue(ccIdx);

    // Penanganan sheet lama dengan 1 kolom "INTERNAL ORDER/COST CENTRE"
    if (!internalOrder && !costCenter && legacyIoCcIdx !== -1) {
      const legacyVal = getValue(legacyIoCcIdx);
      if (legacyVal.startsWith("IN0")) {
        costCenter = legacyVal;
      } else if (legacyVal) {
        internalOrder = legacyVal;
      }
    }

    const hargaSatuan = parseNumber(row[hargaSatuanIdx]);
    const jumlah = parseNumber(row[jumlahIdx]);
    let totalHarga = parseNumber(row[totalHargaIdx]);
    if (totalHarga === 0 && hargaSatuan > 0 && jumlah > 0) {
      totalHarga = hargaSatuan * jumlah;
    }

    const anggaranRaw = getValue(anggaranIdx);
    let anggaran: AnggaranType = "Capex";
    if (anggaranRaw.toLowerCase().includes("capex/opex") || anggaranRaw.toLowerCase().includes("capex / opex")) {
      anggaran = "Capex/Opex";
    } else if (anggaranRaw.toLowerCase().includes("opex")) {
      anggaran = "Opex";
    }

    const rowNum = parseNumber(row[noIdx]) || i;
    const tanggalTerimaBarcode = getValue(tglTerimaBarcodeIdx);
    const tanggalProsesBarcode = getValue(tglProsesBarcodeIdx);
    const tanggalKirimBarang = getValue(tglKirimBarangIdx);
    const userPemakai = getValue(userPemakaiIdx);
    const tujuanPengiriman = getValue(tujuanPengirimanIdx);
    let prosesStatus = getValue(prosesStatusIdx);
    const evidenceBaUrl = getValue(evidenceBaIdx);
    const evidenceBaFileName = evidenceBaUrl ? evidenceBaUrl.split("/").pop() || evidenceBaUrl : "";

    if (!prosesStatus) {
      if (tanggalKirimBarang) {
        prosesStatus = "Selesai";
      } else if (tanggalProsesBarcode) {
        prosesStatus = "Siap Kirim";
      } else if (tanggalTerimaBarcode) {
        prosesStatus = "Proses Labeling";
      } else {
        prosesStatus = "Diterima";
      }
    }

    transactions.push({
      no: rowNum,
      rowNumber: i + 1,
      tanggalTerimaBarang: tanggalTerima,
      nomorDo: getValue(noDoIdx),
      namaMitra: namaMitra,
      namaBarang: namaBarang,
      namaProject: getValue(projectIdx),
      pic: getValue(picIdx),
      internalOrder,
      costCenter,
      hargaSatuan,
      jumlah: jumlah || 1,
      satuan: getValue(satuanIdx) || "Unit",
      anggaran,
      totalHarga,
      keterangan: getValue(keteranganIdx !== -1 ? keteranganIdx : 14),
      tanggalTerimaBarcode,
      tanggalProsesBarcode,
      tanggalKirimBarang,
      userPemakai,
      tujuanPengiriman,
      prosesStatus,
      evidenceBaUrl,
      evidenceBaFileName,
    });
  }

  return transactions;
}
