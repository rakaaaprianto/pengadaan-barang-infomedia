import { google, sheets_v4 } from "googleapis";

// Format private key agar newline \n terbaca dengan benar
function getFormattedPrivateKey(): string | undefined {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!rawKey) return undefined;
  return rawKey.replace(/\\n/g, "\n");
}

export function isGoogleConfigured(): boolean {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = getFormattedPrivateKey();
  const sheetId = process.env.GOOGLE_SHEET_ID;

  return Boolean(clientEmail && privateKey && sheetId && sheetId !== "your_google_spreadsheet_id_here");
}

export function isMockMode(): boolean {
  return process.env.MOCK_SHEETS === "true" || !isGoogleConfigured();
}

export function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error("Konfigurasi GOOGLE_SHEET_ID belum diisi di .env.local, cek README.md");
  }
  return id;
}

let sheetsClientInstance: sheets_v4.Sheets | null = null;

export function getGoogleSheetsClient(): sheets_v4.Sheets {
  if (sheetsClientInstance) {
    return sheetsClientInstance;
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = getFormattedPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error("Konfigurasi Google Sheets belum lengkap (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY). Cek file .env.local dan panduan di README.md");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClientInstance = google.sheets({ version: "v4", auth });
  return sheetsClientInstance;
}

/**
 * Eksekusi panggilan Google API dengan mekanisme retry dan backoff singkat jika terkena rate limit (429)
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const err = error as { code?: number | string; status?: number; message?: string };
    const statusCode = err?.code || err?.status;
    const isRateLimit = statusCode === 429 || err?.message?.includes("RESOURCE_EXHAUSTED");

    if (isRateLimit && retries > 0) {
      console.warn(`[Google Sheets API] Rate limit terdeteksi. Mencoba kembali dalam ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return executeWithRetry(fn, retries - 1, delayMs * 2);
    }

    // Format pesan error yang informatif dan aman
    if (err?.message?.includes("invalid_grant")) {
      throw new Error("Autentikasi Service Account gagal (invalid_grant). Periksa GOOGLE_CLIENT_EMAIL dan GOOGLE_PRIVATE_KEY di .env.local.");
    }
    if (err?.message?.includes("The caller does not have permission") || statusCode === 403) {
      throw new Error("Akses Spreadsheet ditolak (403). Pastikan spreadsheet telah dibagikan (Share) sebagai Editor ke email Service Account.");
    }
    if (err?.message?.includes("Requested entity was not found") || statusCode === 404) {
      throw new Error("Spreadsheet tidak ditemukan (404). Periksa kembali GOOGLE_SHEET_ID di .env.local.");
    }

    throw error;
  }
}

/**
 * Mengambil informasi metadata spreadsheet (daftar nama sheet dan id)
 */
export async function getSpreadsheetMetadata(spreadsheetId: string) {
  const sheets = getGoogleSheetsClient();
  return executeWithRetry(async () => {
    const res = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });
    return res.data.sheets || [];
  });
}

/**
 * Memastikan sebuah sheet ada. Jika belum ada, otomatis dibuat dengan header yang ditentukan.
 */
export async function ensureSheetExists(
  spreadsheetId: string,
  sheetTitle: string,
  initialHeaders?: readonly string[]
): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const existingSheets = await getSpreadsheetMetadata(spreadsheetId);
  const exists = existingSheets.some((s) => s.properties?.title === sheetTitle);

  if (exists) {
    return false; // Sheet sudah ada sebelumnya
  }

  // Buat sheet baru
  await executeWithRetry(async () => {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetTitle,
              },
            },
          },
        ],
      },
    });
  });

  // Tulis header jika diberikan
  if (initialHeaders && initialHeaders.length > 0) {
    await executeWithRetry(async () => {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetTitle}'!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [Array.from(initialHeaders)],
        },
      });
    });
  }

  return true; // Sheet baru berhasil dibuat
}

/**
 * Membaca nilai dari range tertentu
 */
export async function getSheetValues(
  spreadsheetId: string,
  range: string
): Promise<unknown[][]> {
  const sheets = getGoogleSheetsClient();
  return executeWithRetry(async () => {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return (res.data.values || []) as unknown[][];
  });
}

/**
 * Membaca batch nilai dari beberapa range sekaligus (hemat request API)
 */
export async function batchGetSheetValues(
  spreadsheetId: string,
  ranges: string[]
): Promise<Array<unknown[][]>> {
  if (!ranges || ranges.length === 0) return [];
  const sheets = getGoogleSheetsClient();
  return executeWithRetry(async () => {
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });
    return (res.data.valueRanges || []).map((vr) => (vr.values || []) as unknown[][]);
  });
}

/**
 * Menambahkan satu baris data ke sheet (append)
 */
export async function appendRowToSheet(
  spreadsheetId: string,
  sheetTitle: string,
  rowValues: unknown[]
): Promise<void> {
  const sheets = getGoogleSheetsClient();
  await executeWithRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetTitle}'!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowValues],
      },
    });
  });
}

/**
 * Menambahkan beberapa baris data sekaligus ke sheet (batch append)
 */
export async function appendRowsToSheet(
  spreadsheetId: string,
  sheetTitle: string,
  rowsValues: unknown[][]
): Promise<void> {
  if (!rowsValues || rowsValues.length === 0) return;
  const sheets = getGoogleSheetsClient();
  await executeWithRetry(async () => {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${sheetTitle}'!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: rowsValues,
      },
    });
  });
}

/**
 * Menimpa/mengisi seluruh sheet dengan nilai baru (berguna untuk import master)
 */
export async function overwriteSheetValues(
  spreadsheetId: string,
  sheetTitle: string,
  values: unknown[][]
): Promise<void> {
  const sheets = getGoogleSheetsClient();
  // Clear terlebih dahulu
  await executeWithRetry(async () => {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${sheetTitle}'!A1:Z`,
    });
  });

  // Tulis nilai baru
  if (values.length > 0) {
    await executeWithRetry(async () => {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetTitle}'!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values,
        },
      });
    });
  }
}

/**
 * Update data pelacakan proses (Columns O sampai V: Keterangan, Barcode, Pengiriman, & Evidence BA) pada baris tertentu
 */
export async function updateRowTrackingValues(
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  values: {
    keterangan?: string;
    tanggalTerimaBarcode?: string;
    tanggalProsesBarcode?: string;
    tanggalKirimBarang?: string;
    userPemakai?: string;
    tujuanPengiriman?: string;
    prosesStatus?: string;
    evidenceBaUrl?: string;
  }
): Promise<void> {
  const sheets = getGoogleSheetsClient();

  // Pastikan header kolom P1:V1 ada
  try {
    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!P1:V1`,
    });
    const headerRow = headerCheck.data.values?.[0] || [];
    if (headerRow.length === 0 || !headerRow[0]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!P1:V1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[
            "Tanggal Terima Barcode",
            "Tanggal Proses Barcode",
            "Tanggal Kirim Barang",
            "User Pemakai",
            "Tujuan Pengiriman",
            "Status Proses",
            "Evidence BA Pengeluaran"
          ]],
        },
      });
    } else if (headerRow.length < 7 || !headerRow[6]) {
      // Tambahkan header kolom V jika kolom P-U sudah ada sebelumnya
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!V1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["Evidence BA Pengeluaran"]],
        },
      });
    }
  } catch (err) {
    console.warn("[Google Sheets API] Peringatan penyesuaian header tracking & evidence:", err);
  }

  // Update nilai pada baris spesifik di range O{rowNumber}:V{rowNumber}
  await executeWithRetry(async () => {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!O${rowNumber}:V${rowNumber}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          values.keterangan ?? "",
          values.tanggalTerimaBarcode ?? "",
          values.tanggalProsesBarcode ?? "",
          values.tanggalKirimBarang ?? "",
          values.userPemakai ?? "",
          values.tujuanPengiriman ?? "",
          values.prosesStatus ?? "",
          values.evidenceBaUrl ?? ""
        ]],
      },
    });
  });
}
