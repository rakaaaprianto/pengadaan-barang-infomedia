import { NextRequest, NextResponse } from "next/server";
import {
  isMockMode,
  getSpreadsheetId,
  getSpreadsheetMetadata,
  getSheetValues,
  batchGetSheetValues,
} from "@/lib/sheets/client";
import {
  isMonthlySheet,
  parseSheetRowsToTransactions,
  INDONESIAN_MONTHS,
} from "@/lib/sheets/helpers";
import { getMasterData } from "@/lib/sheets/master";
import {
  getCached,
  setCached,
  DASHBOARD_CACHE_KEY,
  DASHBOARD_CACHE_TTL,
} from "@/lib/sheets/cache";
import { DashboardSummary } from "@/lib/sheets/types";
import { getMockDashboardData } from "@/lib/sheets/mock";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "1";

    if (!forceRefresh) {
      const cached = getCached<DashboardSummary>(DASHBOARD_CACHE_KEY);
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached,
        });
      }
    }

    if (isMockMode()) {
      const mockData = getMockDashboardData();
      setCached(DASHBOARD_CACHE_KEY, mockData, DASHBOARD_CACHE_TTL);
      return NextResponse.json({
        success: true,
        data: mockData,
      });
    }

    const spreadsheetId = getSpreadsheetId();

    // 1. Dapatkan daftar seluruh sheet
    const sheetsMetadata = await getSpreadsheetMetadata(spreadsheetId);
    const monthlySheetNames: string[] = [];

    sheetsMetadata.forEach((s) => {
      const title = s.properties?.title || "";
      if (isMonthlySheet(title)) {
        monthlySheetNames.push(title);
      }
    });

    // 2. Ambil master data untuk lookup nama IO dan Cost Center
    const master = await getMasterData();
    const ioMap = new Map<string, string>();
    master.internalOrders.forEach((io) => ioMap.set(io.code.toUpperCase(), io.description));

    const ccMap = new Map<string, string>();
    master.costCenters.forEach((cc) => ccMap.set(cc.code.toUpperCase(), cc.name));

    // 3. Baca setiap sheet bulanan dan gabungkan transaksinya
    let totalPurchaseAmount = 0;
    let totalItems = 0;
    let totalTransactions = 0;
    let capexTotal = 0;
    let opexTotal = 0;
    let capexOpexTotal = 0;

    const mitraMap = new Map<
      string,
      { totalAmount: number; itemCount: number; transactionCount: number }
    >();
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

    const allTransactions: DashboardSummary["transactions"] = [];

    // Baca seluruh sheet bulanan secara batch dalam 1 pemanggilan API
    const ranges = monthlySheetNames.map((name) => `'${name}'!A1:Z`);
    const allSheetsRawRows = await batchGetSheetValues(spreadsheetId, ranges);

    monthlySheetNames.forEach((sheetName, sheetIdx) => {
      const rawRows = allSheetsRawRows[sheetIdx] || [];
      const transactions = parseSheetRowsToTransactions(rawRows);

      transactions.forEach((tx, index) => {
        totalPurchaseAmount += tx.totalHarga;
        totalItems += tx.jumlah;
        totalTransactions += 1;

        if (tx.anggaran === "Capex") {
          capexTotal += tx.totalHarga;
        } else if (tx.anggaran === "Opex") {
          opexTotal += tx.totalHarga;
        } else {
          capexOpexTotal += tx.totalHarga;
        }

        // Agregasi Mitra
        const mitraName = tx.namaMitra || "Tanpa Mitra";
        const curMitra = mitraMap.get(mitraName) || {
          totalAmount: 0,
          itemCount: 0,
          transactionCount: 0,
        };
        curMitra.totalAmount += tx.totalHarga;
        curMitra.itemCount += tx.jumlah;
        curMitra.transactionCount += 1;
        mitraMap.set(mitraName, curMitra);

        // Agregasi Bulanan
        const parts = sheetName.split(" ");
        const monthName = parts[0] || sheetName;
        const year = parseInt(parts[1] || "2026", 10);

        const curMonth = monthlyMap.get(sheetName) || {
          month: monthName,
          year,
          label: sheetName,
          totalAmount: 0,
          transactionCount: 0,
          capexAmount: 0,
          opexAmount: 0,
        };
        curMonth.totalAmount += tx.totalHarga;
        curMonth.transactionCount += 1;
        if (tx.anggaran === "Capex") curMonth.capexAmount += tx.totalHarga;
        if (tx.anggaran === "Opex") curMonth.opexAmount += tx.totalHarga;
        monthlyMap.set(sheetName, curMonth);

        // Lookup nama IO dan Cost Center
        const ioCode = (tx.internalOrder || "").toUpperCase();
        const ccCode = (tx.costCenter || "").toUpperCase();

        allTransactions.push({
          id: `${sheetName}-${tx.no}-${index}`,
          no: tx.no,
          sheetName,
          rowNumber: tx.rowNumber || (index + 2),
          tanggalTerimaBarang: tx.tanggalTerimaBarang,
          nomorDo: tx.nomorDo,
          namaMitra: tx.namaMitra,
          namaBarang: tx.namaBarang,
          namaProject: tx.namaProject,
          pic: tx.pic,
          internalOrder: tx.internalOrder,
          internalOrderName: ioMap.get(ioCode) || tx.internalOrder,
          costCenter: tx.costCenter,
          costCenterName: ccMap.get(ccCode) || tx.costCenter,
          hargaSatuan: tx.hargaSatuan,
          jumlah: tx.jumlah,
          satuan: tx.satuan,
          anggaran: tx.anggaran,
          totalHarga: tx.totalHarga,
          keterangan: tx.keterangan || "",
          tanggalTerimaBarcode: tx.tanggalTerimaBarcode || "",
          tanggalProsesBarcode: tx.tanggalProsesBarcode || "",
          tanggalKirimBarang: tx.tanggalKirimBarang || "",
          userPemakai: tx.userPemakai || "",
          tujuanPengiriman: tx.tujuanPengiriman || "",
          prosesStatus: tx.prosesStatus || "Diterima",
          evidenceBaUrl: tx.evidenceBaUrl || "",
          evidenceBaFileName: tx.evidenceBaFileName || "",
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

    // Urutkan tren bulanan secara kronologis berdasarkan tahun dan indeks bulan Indonesia
    const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const mIdxA = INDONESIAN_MONTHS.indexOf(a.month as unknown as (typeof INDONESIAN_MONTHS)[number]);
      const mIdxB = INDONESIAN_MONTHS.indexOf(b.month as unknown as (typeof INDONESIAN_MONTHS)[number]);
      return mIdxA - mIdxB;
    });

    const summary: DashboardSummary = {
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
      transactions: allTransactions.sort((a, b) =>
        b.tanggalTerimaBarang.localeCompare(a.tanggalTerimaBarang)
      ),
    };

    setCached(DASHBOARD_CACHE_KEY, summary, DASHBOARD_CACHE_TTL);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat data dashboard";
    console.error("[API /api/dashboard] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
