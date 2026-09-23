import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { MasterDataResponse, DashboardSummary } from "./types";
import { TransactionRow, AssetRegisterInput } from "../schemas/asset-register";
import { getMonthSheetName } from "./helpers";

// In-memory mock data store
let mockMasterData: MasterDataResponse | null = null;
const mockMonthlyTransactions = new Map<string, TransactionRow[]>();

/**
 * Load mock master data dari file Excel lokal
 */
export function loadMockMasterData(): MasterDataResponse {
  if (mockMasterData) {
    return mockMasterData;
  }

  const kkpPath = path.resolve(process.cwd(), "docs/references/KKP IO UPDATE (12).xlsx");
  const dataOkrPath = path.resolve(
    process.cwd(),
    "docs/references/DATA OKR UNTUK BULAN JAN-AGUSTUS 2026 (2) (1).xlsx"
  );

  let mitraList: string[] = [
    "PT Angkasa Buana Cipta",
    "Berca Hardyaperkasa",
    "Padi UMKM",
    "Lima Antaran Nusantara",
    "Tijarah Barakah Mulia",
  ];

  if (fs.existsSync(dataOkrPath)) {
    try {
      const wb = XLSX.readFile(dataOkrPath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const vendors = new Set<string>();
      for (const r of rows) {
        const v = String(r["VENDOR"] || r["Vendor"] || r["Nama Mitra"] || "").trim();
        if (v) vendors.add(v);
      }
      if (vendors.size > 0) {
        mitraList = Array.from(vendors).sort();
      }
    } catch (e) {
      console.warn("Gagal membaca vendor dari data OKR mock:", e);
    }
  }

  const internalOrders: MasterDataResponse["internalOrders"] = [];
  const costCentersMap = new Map<
    string,
    { code: string; name: string; division: string; directorate: string }
  >();

  if (fs.existsSync(kkpPath)) {
    try {
      const wb = XLSX.readFile(kkpPath);
      
      // 1. Baca sheet COMPARE COST CENTER (AFTER 2026)
      if (wb.Sheets["COMPARE COST CENTER"]) {
        const ccSheet = wb.Sheets["COMPARE COST CENTER"];
        const ccRows = XLSX.utils.sheet_to_json<string[]>(ccSheet, { header: 1 });
        // Mulai baris ke-4 (indeks 3)
        for (let i = 3; i < ccRows.length; i++) {
          const row = ccRows[i];
          if (!row) continue;
          const code = String(row[6] || "").trim().replace(/\u00a0/g, ""); // Col G (Cost Ctr Remapping)
          const name = String(row[7] || "").trim().replace(/\u00a0/g, ""); // Col H (Cost Center Name)
          const division = String(row[8] || "").trim().replace(/\u00a0/g, ""); // Col I (Divisi)
          const directorate = String(row[9] || "").trim().replace(/\u00a0/g, ""); // Col J (Direktorat)

          if (code && code.startsWith("IN0")) {
            costCentersMap.set(code, { code, name, division, directorate });
          }
        }
      }

      // 2. Baca sheet INTERNAL ORDER UPDATE
      if (wb.Sheets["INTERNAL ORDER UPDATE"]) {
        const ioSheet = wb.Sheets["INTERNAL ORDER UPDATE"];
        const ioRows = XLSX.utils.sheet_to_json<string[]>(ioSheet, { header: 1 });
        // Baris 1 adalah header, data mulai baris 2 (indeks 1)
        for (let i = 1; i < ioRows.length; i++) {
          const row = ioRows[i];
          if (!row) continue;
          const status = String(row[8] || "").trim(); // Col I (Status)
          const ioCode = String(row[9] || "").trim(); // Col J (IO)
          const description = String(row[10] || "").trim(); // Col K (Long Description)
          const costCenter = String(row[13] || "").trim(); // Col N (Cost Center)
          const dept = String(row[14] || "").trim(); // Col O (Departement)
          const div = String(row[15] || "").trim(); // Col P (Division)
          const dir = String(row[16] || "").trim(); // Col Q (Directorate)

          if (!ioCode) continue;

          // Hanya yang berstatus aktif
          if (status.toUpperCase().startsWith("AKTIF")) {
            internalOrders.push({
              code: ioCode,
              description: description || ioCode,
              costCenter,
            });

            // Jika Cost Center IO aktif belum ada di daftar AFTER remapping, tambahkan (ada 14 kode)
            if (costCenter && !costCentersMap.has(costCenter)) {
              costCentersMap.set(costCenter, {
                code: costCenter,
                name: dept || costCenter,
                division: div || "",
                directorate: dir || "",
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Gagal membaca master KKP IO mock:", e);
    }
  }

  mockMasterData = {
    mitra: mitraList,
    internalOrders,
    costCenters: Array.from(costCentersMap.values()),
  };

  return mockMasterData;
}

/**
 * Seed initial mock transactions dari file DATA OKR jika sheet mock masih kosong
 */
function seedInitialMockTransactions(): void {
  if (mockMonthlyTransactions.size > 0) return;

  const lengkapPath = path.resolve(
    process.cwd(),
    "docs/references/DATA OKR UNTUK BULAN JAN-AGUSTUS 2026 Lengkap.xlsx"
  );
  const fallbackPath = path.resolve(
    process.cwd(),
    "docs/references/DATA OKR UNTUK BULAN JAN-AGUSTUS 2026 (2) (1).xlsx"
  );

  const dataOkrPath = fs.existsSync(lengkapPath) ? lengkapPath : fallbackPath;

  if (fs.existsSync(dataOkrPath)) {
    try {
      const wb = XLSX.readFile(dataOkrPath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      rows.forEach((r, idx) => {
        const tgl = String(r["TANGGAL TERIMA BARANG"] || "2026-08-01");
        const sheetName = getMonthSheetName(tgl);
        if (!mockMonthlyTransactions.has(sheetName)) {
          mockMonthlyTransactions.set(sheetName, []);
        }

        const harga = Number(r["HARGA SATUAN"]) || 0;
        const qty = Number(r["JUMLAH"]) || 1;
        const total = Number(r["TOTAL HARGA"]) || harga * qty;
        const anggaranRaw = String(r["ANGGARAN"] || "Capex");

        const tglTerimaBarcode = String(r["TANGGAL TERIMA BARCODE"] || "");
        const tglProsesBarcode = String(r["TANGGAL PROSES BARCODE"] || r["TANGGAL PROSES"] || "");
        const tglKirimBarang = String(r["TANGGAL KIRIM BARANG"] || "");
        const userPemakai = String(r["User Pemakai"] || r["USER PEMAKAI"] || "");
        const tujuanPengiriman = String(r["TUJUAN"] || r["Tujuan Pengiriman"] || "");
        let prosesStatus = String(r["Proses Status"] || r["STATUS PROSES"] || "").trim();

        if (!prosesStatus) {
          if (tglKirimBarang) prosesStatus = "Selesai";
          else if (tglProsesBarcode) prosesStatus = "Siap Kirim";
          else if (tglTerimaBarcode) prosesStatus = "Proses Labeling";
          else prosesStatus = "Diterima";
        }

        mockMonthlyTransactions.get(sheetName)!.push({
          no: idx + 1,
          rowNumber: idx + 2,
          tanggalTerimaBarang: tgl,
          nomorDo: String(r["NOMOR DO"] || ""),
          namaMitra: String(r["VENDOR"] || r["NAMA MITRA"] || ""),
          namaBarang: String(r["NAMA BARANG"] || ""),
          namaProject: String(r["NAMA PROJECT"] || ""),
          pic: String(r["PIC"] || ""),
          internalOrder: "",
          costCenter: String(r["INTERNAL ORDER/COST CENTRE"] || r["COST CENTER"] || ""),
          hargaSatuan: harga,
          jumlah: qty,
          satuan: String(r["SATUAN"] || "Unit"),
          anggaran: anggaranRaw.includes("Opex") ? "Opex" : "Capex",
          totalHarga: total,
          keterangan: String(r["KETERANGAN"] || ""),
          tanggalTerimaBarcode: tglTerimaBarcode,
          tanggalProsesBarcode: tglProsesBarcode,
          tanggalKirimBarang: tglKirimBarang,
          userPemakai,
          tujuanPengiriman,
          prosesStatus,
        });
      });
    } catch (e) {
      console.warn("Gagal seed transaksi mock awal:", e);
    }
  }
}

export function submitMockTransaction(input: AssetRegisterInput): {
  sheetName: string;
  startRowNumber: number;
  rowCount: number;
  totalHargaGabungan: number;
} {
  const master = loadMockMasterData();
  const sheetName = getMonthSheetName(input.tanggalTerimaBarang);

  if (!mockMonthlyTransactions.has(sheetName)) {
    mockMonthlyTransactions.set(sheetName, []);
  }

  // Tambah mitra baru jika belum ada
  if (input.isNewMitra && !master.mitra.some((m) => m.toLowerCase() === input.namaMitra.toLowerCase())) {
    master.mitra.push(input.namaMitra.trim());
    master.mitra.sort();
  }

  const list = mockMonthlyTransactions.get(sheetName)!;
  const startRowNumber = list.length + 1;
  let totalHargaGabungan = 0;

  input.items.forEach((item, index) => {
    const rowNumber = startRowNumber + index;
    const itemTotal = item.hargaSatuan * item.jumlah;
    totalHargaGabungan += itemTotal;

    list.push({
      no: rowNumber,
      rowNumber: list.length + 2,
      tanggalTerimaBarang: input.tanggalTerimaBarang,
      nomorDo: input.nomorDo || "",
      namaMitra: input.namaMitra,
      namaBarang: item.namaBarang,
      namaProject: input.namaProject,
      pic: input.pic,
      internalOrder: input.internalOrder || "",
      costCenter: input.costCenter || "",
      hargaSatuan: item.hargaSatuan,
      jumlah: item.jumlah,
      satuan: item.satuan,
      anggaran: input.anggaran,
      totalHarga: itemTotal,
      keterangan: input.keterangan || "",
      tanggalTerimaBarcode: "",
      tanggalProsesBarcode: "",
      tanggalKirimBarang: "",
      userPemakai: "",
      tujuanPengiriman: "",
      prosesStatus: "Diterima",
    });
  });

  return {
    sheetName,
    startRowNumber,
    rowCount: input.items.length,
    totalHargaGabungan,
  };
}

export function getMockDashboardData(): DashboardSummary {
  seedInitialMockTransactions();
  const master = loadMockMasterData();

  const ioMap = new Map<string, string>();
  master.internalOrders.forEach((io) => ioMap.set(io.code, io.description));

  const ccMap = new Map<string, string>();
  master.costCenters.forEach((cc) => ccMap.set(cc.code, cc.name));

  let totalPurchaseAmount = 0;
  let totalItems = 0;
  let totalTransactions = 0;
  let capexTotal = 0;
  let opexTotal = 0;
  let capexOpexTotal = 0;

  const monthlyMap = new Map<
    string,
    {
      month: string;
      year: number;
      label: string;
      totalAmount: number;
      transactionCount: number;
      capexAmount: number;
      opexAmount: number;
    }
  >();

  const mitraMap = new Map<string, { totalAmount: number; itemCount: number; transactionCount: number }>();
  const allTransactions: DashboardSummary["transactions"] = [];

  mockMonthlyTransactions.forEach((items, sheetName) => {
    items.forEach((item, index) => {
      totalPurchaseAmount += item.totalHarga;
      totalItems += item.jumlah;
      totalTransactions += 1;

      if (item.anggaran === "Capex") capexTotal += item.totalHarga;
      else if (item.anggaran === "Opex") opexTotal += item.totalHarga;
      else capexOpexTotal += item.totalHarga;

      const mitraName = item.namaMitra || "Tanpa Mitra";
      const curMitra = mitraMap.get(mitraName) || { totalAmount: 0, itemCount: 0, transactionCount: 0 };
      curMitra.totalAmount += item.totalHarga;
      curMitra.itemCount += item.jumlah;
      curMitra.transactionCount += 1;
      mitraMap.set(mitraName, curMitra);

      const curMonth = monthlyMap.get(sheetName) || {
        month: sheetName.split(" ")[0] || sheetName,
        year: parseInt(sheetName.split(" ")[1] || "2026", 10),
        label: sheetName,
        totalAmount: 0,
        transactionCount: 0,
        capexAmount: 0,
        opexAmount: 0,
      };
      curMonth.totalAmount += item.totalHarga;
      curMonth.transactionCount += 1;
      if (item.anggaran === "Capex") curMonth.capexAmount += item.totalHarga;
      if (item.anggaran === "Opex") curMonth.opexAmount += item.totalHarga;
      monthlyMap.set(sheetName, curMonth);

      allTransactions.push({
        id: `${sheetName}-${item.no}-${index}`,
        no: item.no,
        sheetName,
        rowNumber: item.rowNumber || (index + 2),
        tanggalTerimaBarang: item.tanggalTerimaBarang,
        nomorDo: item.nomorDo,
        namaMitra: item.namaMitra,
        namaBarang: item.namaBarang,
        namaProject: item.namaProject,
        pic: item.pic,
        internalOrder: item.internalOrder,
        internalOrderName: ioMap.get(item.internalOrder) || item.internalOrder,
        costCenter: item.costCenter,
        costCenterName: ccMap.get(item.costCenter) || item.costCenter,
        hargaSatuan: item.hargaSatuan,
        jumlah: item.jumlah,
        satuan: item.satuan,
        anggaran: item.anggaran,
        totalHarga: item.totalHarga,
        keterangan: item.keterangan || "",
        tanggalTerimaBarcode: item.tanggalTerimaBarcode || "",
        tanggalProsesBarcode: item.tanggalProsesBarcode || "",
        tanggalKirimBarang: item.tanggalKirimBarang || "",
        userPemakai: item.userPemakai || "",
        tujuanPengiriman: item.tujuanPengiriman || "",
        prosesStatus: item.prosesStatus || "Diterima",
        evidenceBaUrl: item.evidenceBaUrl || "",
        evidenceBaFileName: item.evidenceBaFileName || (item.evidenceBaUrl ? item.evidenceBaUrl.split("/").pop() || item.evidenceBaUrl : ""),
      });
    });
  });

  const uniqueMitraCount = mitraMap.size;
  const grandTotal = totalPurchaseAmount || 1;
  const capexPercentage = Math.round((capexTotal / grandTotal) * 100);
  const opexPercentage = Math.round((opexTotal / grandTotal) * 100);

  const topMitra = Array.from(mitraMap.entries())
    .map(([name, stat]) => ({
      name,
      ...stat,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.label.localeCompare(b.label);
  });

  return {
    totalPurchaseAmount,
    totalItems,
    totalTransactions,
    uniqueMitraCount,
    capexTotal,
    opexTotal,
    capexOpexTotal,
    capexPercentage,
    opexPercentage,
    monthlyTrend,
    topMitra,
    transactions: allTransactions.sort((a, b) => b.tanggalTerimaBarang.localeCompare(a.tanggalTerimaBarang)),
  };
}

/**
 * Update tracking status pada data mock memory
 */
export function updateMockTrackingRow(
  sheetName: string,
  rowNumber: number,
  trackingData: {
    keterangan?: string;
    tanggalTerimaBarcode?: string;
    tanggalProsesBarcode?: string;
    tanggalKirimBarang?: string;
    userPemakai?: string;
    tujuanPengiriman?: string;
    prosesStatus?: string;
    evidenceBaUrl?: string;
    evidenceBaFileName?: string;
  }
): boolean {
  seedInitialMockTransactions();
  const list = mockMonthlyTransactions.get(sheetName);
  if (!list) return false;

  // Temukan item berdasarkan rowNumber atau index
  const item = list.find((tx) => tx.rowNumber === rowNumber) || list[rowNumber - 2];
  if (item) {
    if (trackingData.keterangan !== undefined) item.keterangan = trackingData.keterangan;
    if (trackingData.tanggalTerimaBarcode !== undefined) item.tanggalTerimaBarcode = trackingData.tanggalTerimaBarcode;
    if (trackingData.tanggalProsesBarcode !== undefined) item.tanggalProsesBarcode = trackingData.tanggalProsesBarcode;
    if (trackingData.tanggalKirimBarang !== undefined) item.tanggalKirimBarang = trackingData.tanggalKirimBarang;
    if (trackingData.userPemakai !== undefined) item.userPemakai = trackingData.userPemakai;
    if (trackingData.tujuanPengiriman !== undefined) item.tujuanPengiriman = trackingData.tujuanPengiriman;
    if (trackingData.prosesStatus !== undefined) item.prosesStatus = trackingData.prosesStatus;
    if (trackingData.evidenceBaUrl !== undefined) item.evidenceBaUrl = trackingData.evidenceBaUrl;
    if (trackingData.evidenceBaFileName !== undefined) item.evidenceBaFileName = trackingData.evidenceBaFileName;
    return true;
  }
  return false;
}
