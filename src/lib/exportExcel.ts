import * as XLSX from "xlsx";
import { DashboardSummary } from "./sheets/types";

type TransactionItem = DashboardSummary["transactions"][number];

export interface ExportExcelOptions {
  transactions: TransactionItem[];
  periodLabel: string;
  filename?: string;
}

/**
 * Ekspor data transaksi pengadaan ke format file Microsoft Excel (.xlsx) resmi
 */
export function exportTransactionsToExcel({
  transactions,
  periodLabel,
  filename,
}: ExportExcelOptions): void {
  const currentDateStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const nowTimeStr = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 1. Header Laporan Formal
  const rows: (string | number)[][] = [
    ["LAPORAN PENGADAAN ASET - PT INFOMEDIA NUSANTARA"],
    [`Periode Laporan: ${periodLabel}`],
    [`Waktu Unduh: ${currentDateStr}, Pukul ${nowTimeStr} WIB`],
    [`Total Transaksi Terdata: ${transactions.length} Baris`],
    [], // Baris kosong pemisah
    [
      "No.",
      "Tanggal Terima Barang",
      "Nomor DO / Surat Jalan",
      "Nama Mitra / Vendor",
      "Nama Barang & Spesifikasi",
      "Nama Project",
      "PIC Pemohon",
      "Internal Order (IO)",
      "Deskripsi IO",
      "Cost Center (CC)",
      "Deskripsi CC",
      "Harga Satuan (Rp)",
      "Jumlah (Qty)",
      "Satuan",
      "Kategori Anggaran",
      "Total Harga (Rp)",
      "Keterangan",
      "Tanggal Terima Barcode",
      "Tanggal Proses Barcode",
      "Tanggal Kirim Barang",
      "User Pemakai",
      "Tujuan Pengiriman",
      "Status Proses",
      "Evidence BA Pengeluaran",
    ],
  ];

  // 2. Baris Data Transaksi (Diurutkan secara kronologis: tertua/terlama di atas -> termuda/terbaru di bawah)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateComp = (a.tanggalTerimaBarang || "").localeCompare(b.tanggalTerimaBarang || "");
    if (dateComp !== 0) return dateComp;
    return (a.no || 0) - (b.no || 0);
  });

  let totalQty = 0;
  let grandTotalHarga = 0;

  sortedTransactions.forEach((tx, idx) => {
    totalQty += Number(tx.jumlah) || 0;
    grandTotalHarga += Number(tx.totalHarga) || 0;

    rows.push([
      idx + 1,
      tx.tanggalTerimaBarang || "-",
      tx.nomorDo || "-",
      tx.namaMitra || "-",
      tx.namaBarang || "-",
      tx.namaProject || "-",
      tx.pic || "-",
      tx.internalOrder || "-",
      tx.internalOrderName && tx.internalOrderName !== tx.internalOrder ? tx.internalOrderName : "-",
      tx.costCenter || "-",
      tx.costCenterName && tx.costCenterName !== tx.costCenter ? tx.costCenterName : "-",
      Number(tx.hargaSatuan) || 0,
      Number(tx.jumlah) || 0,
      tx.satuan || "Unit",
      tx.anggaran || "-",
      Number(tx.totalHarga) || 0,
      tx.keterangan || "-",
      tx.tanggalTerimaBarcode || "-",
      tx.tanggalProsesBarcode || "-",
      tx.tanggalKirimBarang || "-",
      tx.userPemakai || "-",
      tx.tujuanPengiriman || "-",
      tx.prosesStatus || "Diterima",
      tx.evidenceBaUrl || "-",
    ]);
  });

  // 3. Baris Ringkasan Akumulasi / Grand Total
  rows.push([]);
  rows.push([
    "TOTAL KESELURUHAN",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    totalQty,
    "Unit",
    "",
    grandTotalHarga,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  // 4. Generate Worksheet & Workbook
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Atur lebar kolom (column width) agar terbaca rapi di Excel
  worksheet["!cols"] = [
    { wch: 6 }, // No
    { wch: 18 }, // Tanggal
    { wch: 24 }, // No DO
    { wch: 28 }, // Nama Mitra
    { wch: 38 }, // Nama Barang
    { wch: 26 }, // Project
    { wch: 20 }, // PIC
    { wch: 18 }, // IO
    { wch: 26 }, // Deskripsi IO
    { wch: 18 }, // CC
    { wch: 26 }, // Deskripsi CC
    { wch: 20 }, // Harga Satuan
    { wch: 14 }, // Qty
    { wch: 10 }, // Satuan
    { wch: 16 }, // Anggaran
    { wch: 22 }, // Total Harga
    { wch: 30 }, // Keterangan
    { wch: 22 }, // Tanggal Terima Barcode
    { wch: 22 }, // Tanggal Proses Barcode
    { wch: 22 }, // Tanggal Kirim Barang
    { wch: 22 }, // User Pemakai
    { wch: 26 }, // Tujuan Pengiriman
    { wch: 18 }, // Status Proses
    { wch: 32 }, // Evidence BA Pengeluaran
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pengadaan Aset");

  // 5. Nama File
  const cleanLabel = periodLabel.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
  const finalFilename = filename || `Laporan_Pengadaan_Asset_${cleanLabel}.xlsx`;

  // 6. Unduh langsung di browser
  XLSX.writeFile(workbook, finalFilename);
}
