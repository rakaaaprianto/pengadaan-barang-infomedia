import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import dotenv from "dotenv";

// Load environment variables dari .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import {
  isGoogleConfigured,
  getSpreadsheetId,
  ensureSheetExists,
  overwriteSheetValues,
} from "../src/lib/sheets/client";
import {
  MASTER_SHEET_NAMES,
  MASTER_IO_HEADERS,
  MASTER_COST_CENTER_HEADERS,
} from "../src/lib/sheets/master";
import { invalidateMasterCache } from "../src/lib/sheets/cache";

interface IOItem {
  io: string;
  longDescription: string;
  status: string;
  costCenter: string;
  department: string;
  division: string;
  directorate: string;
  profitCenterName: string;
  isActive: boolean;
}

interface CostCenterItem {
  code: string;
  name: string;
  division: string;
  directorate: string;
  isFromRemapping: boolean;
}

async function runImport() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const fileArg = args.find((arg) => !arg.startsWith("--"));

  const defaultFilePath = path.resolve(
    process.cwd(),
    "docs/references/KKP IO UPDATE (12).xlsx"
  );
  const targetFilePath = fileArg ? path.resolve(process.cwd(), fileArg) : defaultFilePath;

  console.log("==========================================================");
  console.log("  IMPORT MASTER DATA IO & COST CENTER — INFOMEDIA");
  console.log("==========================================================");
  console.log(`📁 File sumber: ${targetFilePath}`);
  console.log(`⚙️  Mode: ${isDryRun ? "DRY RUN (Hanya Validasi)" : "LIVE WRITE (Google Sheets)"}`);

  if (!fs.existsSync(targetFilePath)) {
    console.error(`❌ File tidak ditemukan: ${targetFilePath}`);
    process.exit(1);
  }

  console.log("\nMemproses file Excel...");
  const workbook = XLSX.readFile(targetFilePath);

  // 1. Validasi keberadaan sheet
  if (!workbook.Sheets["INTERNAL ORDER UPDATE"]) {
    console.error("❌ Sheet 'INTERNAL ORDER UPDATE' tidak ditemukan di workbook!");
    process.exit(1);
  }
  if (!workbook.Sheets["COMPARE COST CENTER"]) {
    console.error("❌ Sheet 'COMPARE COST CENTER' tidak ditemukan di workbook!");
    process.exit(1);
  }

  // 2. Baca sheet COMPARE COST CENTER (Kolom AFTER 2026)
  const ccSheet = workbook.Sheets["COMPARE COST CENTER"];
  const ccRawRows = XLSX.utils.sheet_to_json<string[]>(ccSheet, { header: 1 });
  const costCenterMap = new Map<string, CostCenterItem>();

  for (let i = 3; i < ccRawRows.length; i++) {
    const row = ccRawRows[i];
    if (!row) continue;
    // Kolom G: Cost Ctr Remapping (idx 6)
    // Kolom H: Cost Center Name (idx 7)
    // Kolom I: Divisi (idx 8)
    // Kolom J: Direktorat (idx 9)
    const code = String(row[6] || "").trim().replace(/\u00a0/g, "");
    const name = String(row[7] || "").trim().replace(/\u00a0/g, "");
    const division = String(row[8] || "").trim().replace(/\u00a0/g, "");
    const directorate = String(row[9] || "").trim().replace(/\u00a0/g, "");

    if (code && code.startsWith("IN0")) {
      costCenterMap.set(code, {
        code,
        name,
        division,
        directorate,
        isFromRemapping: true,
      });
    }
  }

  // 3. Baca sheet INTERNAL ORDER UPDATE
  const ioSheet = workbook.Sheets["INTERNAL ORDER UPDATE"];
  const ioRawRows = XLSX.utils.sheet_to_json<string[]>(ioSheet, { header: 1 });

  const allIOs: IOItem[] = [];
  const activeIOs: IOItem[] = [];
  const activeIOCostCenters = new Map<string, { count: number; sampleDept: string; sampleDiv: string; sampleDir: string }>();
  const uniqueIOCodes = new Set<string>();

  for (let i = 1; i < ioRawRows.length; i++) {
    const row = ioRawRows[i];
    if (!row) continue;

    // Kolom I: Status (idx 8)
    // Kolom J: IO (idx 9) - tepat di sebelah status
    // Kolom K: Long Description (idx 10)
    // Kolom N: Cost Center (idx 13)
    // Kolom O: Departement (idx 14)
    // Kolom P: Division (idx 15)
    // Kolom Q: Directorate (idx 16)
    // Kolom S: Profit Center Name (idx 18)
    const status = String(row[8] || "").trim();
    const ioCode = String(row[9] || "").trim();
    const longDesc = String(row[10] || "").trim();
    const costCenter = String(row[13] || "").trim();
    const dept = String(row[14] || "").trim();
    const div = String(row[15] || "").trim();
    const dir = String(row[16] || "").trim();
    const profitCenterName = String(row[18] || "").trim();

    if (!ioCode) continue;

    const isActive = status.toUpperCase().startsWith("AKTIF");
    const item: IOItem = {
      io: ioCode,
      longDescription: longDesc,
      status,
      costCenter,
      department: dept,
      division: div,
      directorate: dir,
      profitCenterName,
      isActive,
    };

    allIOs.push(item);
    uniqueIOCodes.add(ioCode);

    if (isActive) {
      activeIOs.push(item);
      if (costCenter) {
        const cur = activeIOCostCenters.get(costCenter) || {
          count: 0,
          sampleDept: dept,
          sampleDiv: div,
          sampleDir: dir,
        };
        cur.count += 1;
        activeIOCostCenters.set(costCenter, cur);
      }
    }
  }

  // 4. Identifikasi Cost Center di luar daftar AFTER remapping yang dipakai oleh IO aktif (ada 14 kode)
  const missingCostCenters: Array<{ code: string; count: number; dept: string }> = [];
  activeIOCostCenters.forEach((info, ccCode) => {
    if (!costCenterMap.has(ccCode)) {
      missingCostCenters.push({
        code: ccCode,
        count: info.count,
        dept: info.sampleDept || "DEPT. NON-REMAPPED",
      });

      // Tambahkan ke map Cost Center agar IO aktif tetap bisa dipilih (sesuai PRD 5.3b)
      costCenterMap.set(ccCode, {
        code: ccCode,
        name: info.sampleDept || ccCode,
        division: info.sampleDiv || "",
        directorate: info.sampleDir || "",
        isFromRemapping: false,
      });
    }
  });

  const totalAffectedActiveIO = missingCostCenters.reduce((sum, item) => sum + item.count, 0);

  // 5. Cetak Ringkasan Hasil
  console.log("\n📊 HASIL ANALISIS DATA MASTER:");
  console.log(`   - Total IO terisi: ${allIOs.length} baris (unik: ${uniqueIOCodes.size})`);
  console.log(`   - IO Aktif (status diawali 'AKTIF'): ${activeIOs.length}`);
  console.log(`   - Cost Center AFTER (Remapping 2026): ${costCenterMap.size - missingCostCenters.length}`);
  console.log(`   - Cost Center di luar daftar AFTER yang dipakai IO aktif: ${missingCostCenters.length} kode`);
  console.log(`     (Memengaruhi ${totalAffectedActiveIO} IO aktif, contoh: ${missingCostCenters.slice(0, 3).map((c) => `${c.code} (${c.count} IO)`).join(", ")})`);
  console.log(`   - Total Cost Center akhir yang disimpan: ${costCenterMap.size}`);

  // Validasi angka acuan PRD 3.4
  console.log("\n🔍 VALIDASI TERHADAP ANGKA ACUAN PRD (Versi 12):");
  const checkTotalIO = allIOs.length === 3629;
  const checkActiveIO = activeIOs.length === 1612;
  const checkMissingCC = missingCostCenters.length === 14;
  const checkAffectedIO = totalAffectedActiveIO === 86;

  console.log(`   [${checkTotalIO ? "PASS" : "FAIL"}] Total IO = 3.629 (Ditemukan: ${allIOs.length})`);
  console.log(`   [${checkActiveIO ? "PASS" : "FAIL"}] IO Aktif = 1.612 (Ditemukan: ${activeIOs.length})`);
  console.log(`   [${checkMissingCC ? "PASS" : "FAIL"}] Cost Center non-remapped = 14 (Ditemukan: ${missingCostCenters.length})`);
  console.log(`   [${checkAffectedIO ? "PASS" : "FAIL"}] IO Aktif terdampak non-remapped = 86 (Ditemukan: ${totalAffectedActiveIO})`);

  if (!checkTotalIO || !checkActiveIO || !checkMissingCC) {
    console.warn("⚠️ Perhatian: Angka acuan berbeda dengan spesifikasi PRD v12. Harap periksa file sumber.");
  } else {
    console.log("✅ Seluruh angka acuan PRD 100% COCOK!");
  }

  if (isDryRun) {
    console.log("\n✨ Mode --dry-run selesai. Tidak ada perubahan yang ditulis ke Google Sheets.");
    return;
  }

  // 6. Penulisan ke Google Sheets
  console.log("\n🚀 Menulis data master ke Google Sheets...");
  if (!isGoogleConfigured()) {
    console.error("❌ Konfigurasi Google Sheets (.env.local) belum lengkap!");
    process.exit(1);
  }

  const spreadsheetId = getSpreadsheetId();

  // Siapkan data MASTER_IO
  const masterIORows: unknown[][] = [
    Array.from(MASTER_IO_HEADERS),
    ...allIOs.map((item) => [
      item.io,
      item.longDescription,
      item.status,
      item.costCenter,
      item.department,
      item.division,
      item.directorate,
      item.profitCenterName,
    ]),
  ];

  // Siapkan data MASTER_COST_CENTER
  const sortedCCList = Array.from(costCenterMap.values()).sort((a, b) =>
    a.code.localeCompare(b.code)
  );
  const masterCCRows: unknown[][] = [
    Array.from(MASTER_COST_CENTER_HEADERS),
    ...sortedCCList.map((item) => [
      item.code,
      item.name,
      item.division,
      item.directorate,
    ]),
  ];

  console.log(`   -> Memastikan sheet ${MASTER_SHEET_NAMES.IO} dan ${MASTER_SHEET_NAMES.COST_CENTER} ada...`);
  await ensureSheetExists(spreadsheetId, MASTER_SHEET_NAMES.IO, MASTER_IO_HEADERS);
  await ensureSheetExists(spreadsheetId, MASTER_SHEET_NAMES.COST_CENTER, MASTER_COST_CENTER_HEADERS);

  console.log(`   -> Menulis ${masterIORows.length - 1} baris ke ${MASTER_SHEET_NAMES.IO}...`);
  await overwriteSheetValues(spreadsheetId, MASTER_SHEET_NAMES.IO, masterIORows);

  console.log(`   -> Menulis ${masterCCRows.length - 1} baris ke ${MASTER_SHEET_NAMES.COST_CENTER}...`);
  await overwriteSheetValues(spreadsheetId, MASTER_SHEET_NAMES.COST_CENTER, masterCCRows);

  invalidateMasterCache();
  console.log("✅ Import master data ke Google Sheets berhasil diselesaikan!");
}

runImport().catch((err) => {
  console.error("❌ Terjadi kesalahan saat proses import:", err);
  process.exit(1);
});
