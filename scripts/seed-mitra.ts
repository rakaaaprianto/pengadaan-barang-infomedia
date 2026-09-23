import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import {
  isGoogleConfigured,
  getSpreadsheetId,
  ensureSheetExists,
  overwriteSheetValues,
  getSheetValues,
} from "../src/lib/sheets/client";
import {
  MASTER_SHEET_NAMES,
  MASTER_MITRA_HEADERS,
} from "../src/lib/sheets/master";
import { invalidateMasterCache } from "../src/lib/sheets/cache";
import { format } from "date-fns";

async function runSeedMitra() {
  const defaultFilePath = path.resolve(
    process.cwd(),
    "docs/references/DATA OKR UNTUK BULAN JAN-AGUSTUS 2026 (2) (1).xlsx"
  );

  console.log("==========================================================");
  console.log("  SEED MASTER DATA MITRA — INFOMEDIA");
  console.log("==========================================================");

  if (!fs.existsSync(defaultFilePath)) {
    console.error(`❌ File data OKR tidak ditemukan di: ${defaultFilePath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(defaultFilePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const vendorSet = new Set<string>();
  for (const r of rows) {
    const v = String(r["VENDOR"] || r["Vendor"] || r["Nama Mitra"] || "").trim().replace(/\s+/g, " ");
    if (v) {
      vendorSet.add(v);
    }
  }

  const uniqueVendors = Array.from(vendorSet).sort((a, b) => a.localeCompare(b, "id"));
  console.log(`Ditemukan ${uniqueVendors.length} nama vendor/mitra unik dari data existing:`);
  uniqueVendors.forEach((v, idx) => console.log(`  ${idx + 1}. ${v}`));

  if (!isGoogleConfigured()) {
    console.log("\n⚠️ Konfigurasi Google Sheets belum aktif di .env.local.");
    console.log("Daftar mitra di atas akan otomatis digunakan di mode mock.");
    return;
  }

  const spreadsheetId = getSpreadsheetId();
  await ensureSheetExists(spreadsheetId, MASTER_SHEET_NAMES.MITRA, MASTER_MITRA_HEADERS);

  // Ambil mitra yang sudah ada di Sheets untuk mencegah penimpaan mitra baru dari form
  const existingRows = await getSheetValues(spreadsheetId, `'${MASTER_SHEET_NAMES.MITRA}'!A2:C`);
  const existingMap = new Map<string, { addedByForm: string; addedAt: string }>();

  existingRows.forEach((r) => {
    const name = String(r[0] || "").trim();
    if (name) {
      existingMap.set(name.toLowerCase(), {
        addedByForm: String(r[1] || ""),
        addedAt: String(r[2] || ""),
      });
    }
  });

  const nowStr = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const finalRows: unknown[][] = [Array.from(MASTER_MITRA_HEADERS)];

  // Gabungkan uniqueVendors dengan existing yang belum ada
  uniqueVendors.forEach((v) => {
    const ex = existingMap.get(v.toLowerCase());
    finalRows.push([
      v,
      ex ? ex.addedByForm : "",
      ex ? ex.addedAt : nowStr,
    ]);
  });

  // Tambahkan mitra yang ada di sheet tapi tidak ada di file Excel (misal hasil input form)
  existingRows.forEach((r) => {
    const name = String(r[0] || "").trim();
    if (name && !uniqueVendors.some((v) => v.toLowerCase() === name.toLowerCase())) {
      finalRows.push([name, String(r[1] || "Ya"), String(r[2] || nowStr)]);
    }
  });

  console.log(`\nMenulis ${finalRows.length - 1} mitra ke Google Sheets (${MASTER_SHEET_NAMES.MITRA})...`);
  await overwriteSheetValues(spreadsheetId, MASTER_SHEET_NAMES.MITRA, finalRows);
  invalidateMasterCache();
  console.log("✅ Seed master mitra ke Google Sheets berhasil diselesaikan!");
}

runSeedMitra().catch((err) => {
  console.error("❌ Terjadi kesalahan saat seed mitra:", err);
  process.exit(1);
});
