import {
  isMockMode,
  getSpreadsheetId,
  batchGetSheetValues,
  appendRowToSheet,
  ensureSheetExists,
  getSheetValues,
} from "./client";
import { MasterDataResponse } from "./types";
import {
  getCached,
  setCached,
  MASTER_CACHE_KEY,
  MASTER_CACHE_TTL,
  invalidateMasterCache,
} from "./cache";
import { loadMockMasterData } from "./mock";
import { format } from "date-fns";

export const MASTER_SHEET_NAMES = {
  IO: "MASTER_IO",
  COST_CENTER: "MASTER_COST_CENTER",
  MITRA: "MASTER_MITRA",
} as const;

export const MASTER_MITRA_HEADERS = [
  "Nama Mitra",
  "Ditambahkan Oleh Form",
  "Tanggal Ditambahkan",
] as const;

export const MASTER_IO_HEADERS = [
  "IO",
  "Long Description",
  "Status",
  "Cost Center",
  "Departement",
  "Division",
  "Directorate",
  "Profit Center Name",
] as const;

export const MASTER_COST_CENTER_HEADERS = [
  "Cost Center",
  "Nama",
  "Divisi",
  "Direktorat",
] as const;

/**
 * Mengambil master data (Mitra, IO aktif, Cost Center)
 * Dengan caching in-memory 10 menit
 */
export async function getMasterData(forceRefresh = false): Promise<MasterDataResponse> {
  if (isMockMode()) {
    return loadMockMasterData();
  }

  if (!forceRefresh) {
    const cached = getCached<MasterDataResponse>(MASTER_CACHE_KEY);
    if (cached) {
      return cached;
    }
  }

  const spreadsheetId = getSpreadsheetId();

  // Pastikan sheet master ada
  await Promise.all([
    ensureSheetExists(spreadsheetId, MASTER_SHEET_NAMES.IO, MASTER_IO_HEADERS),
    ensureSheetExists(spreadsheetId, MASTER_SHEET_NAMES.COST_CENTER, MASTER_COST_CENTER_HEADERS),
    ensureSheetExists(spreadsheetId, MASTER_SHEET_NAMES.MITRA, MASTER_MITRA_HEADERS),
  ]);

  // Batch get seluruh sheet master
  const ranges = [
    `'${MASTER_SHEET_NAMES.MITRA}'!A2:C`,
    `'${MASTER_SHEET_NAMES.IO}'!A2:H`,
    `'${MASTER_SHEET_NAMES.COST_CENTER}'!A2:D`,
  ];

  const [mitraRows = [], ioRows = [], ccRows = []] = await batchGetSheetValues(spreadsheetId, ranges);

  // 1. Parsing Mitra
  const mitraList: string[] = [];
  mitraRows.forEach((r) => {
    const name = String(r[0] || "").trim();
    if (name && !mitraList.includes(name)) {
      mitraList.push(name);
    }
  });
  mitraList.sort((a, b) => a.localeCompare(b, "id"));

  // 2. Parsing IO (Hanya status aktif)
  const internalOrders: MasterDataResponse["internalOrders"] = [];
  ioRows.forEach((r) => {
    const ioCode = String(r[0] || "").trim();
    const desc = String(r[1] || "").trim();
    const status = String(r[2] || "").trim();
    const costCenter = String(r[3] || "").trim();

    if (ioCode && status.toUpperCase().startsWith("AKTIF")) {
      internalOrders.push({
        code: ioCode,
        description: desc || ioCode,
        costCenter,
      });
    }
  });

  // 3. Parsing Cost Center
  const costCenters: MasterDataResponse["costCenters"] = [];
  ccRows.forEach((r) => {
    const code = String(r[0] || "").trim();
    const name = String(r[1] || "").trim();
    const division = String(r[2] || "").trim();
    const directorate = String(r[3] || "").trim();

    if (code) {
      costCenters.push({
        code,
        name: name || code,
        division,
        directorate,
      });
    }
  });

  const response: MasterDataResponse = {
    mitra: mitraList,
    internalOrders,
    costCenters,
  };

  // Simpan ke cache
  setCached(MASTER_CACHE_KEY, response, MASTER_CACHE_TTL);
  return response;
}

/**
 * Menambahkan mitra baru ke MASTER_MITRA sesuai aturan PRD 6.2:
 * (1) Baca ulang MASTER_MITRA langsung dari Sheets (tanpa cache)
 * (2) Cek apakah sudah ada (case-insensitive)
 * (3) Jika belum ada, append baris baru ke MASTER_MITRA
 * (4) Kosongkan cache master
 */
export async function addMitraIfNew(rawMitraName: string): Promise<{ added: boolean; finalName: string }> {
  const trimmedName = rawMitraName.trim().replace(/\s+/g, " ");
  if (!trimmedName) {
    throw new Error("Nama mitra tidak boleh kosong");
  }

  if (isMockMode()) {
    const mock = loadMockMasterData();
    const existing = mock.mitra.find((m) => m.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      return { added: false, finalName: existing };
    }
    mock.mitra.push(trimmedName);
    mock.mitra.sort((a, b) => a.localeCompare(b, "id"));
    return { added: true, finalName: trimmedName };
  }

  const spreadsheetId = getSpreadsheetId();
  await ensureSheetExists(spreadsheetId, MASTER_SHEET_NAMES.MITRA, MASTER_MITRA_HEADERS);

  // 1. Baca ulang MASTER_MITRA tanpa cache
  const rows = await getSheetValues(spreadsheetId, `'${MASTER_SHEET_NAMES.MITRA}'!A2:A`);
  for (const r of rows) {
    const existing = String(r[0] || "").trim();
    if (existing.toLowerCase() === trimmedName.toLowerCase()) {
      return { added: false, finalName: existing };
    }
  }

  // 2. Append ke MASTER_MITRA
  const nowStr = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  await appendRowToSheet(spreadsheetId, MASTER_SHEET_NAMES.MITRA, [
    trimmedName,
    "Ya",
    nowStr,
  ]);

  // 3. Invalidate cache master
  invalidateMasterCache();

  return { added: true, finalName: trimmedName };
}
