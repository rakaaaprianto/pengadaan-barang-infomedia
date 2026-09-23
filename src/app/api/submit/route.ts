import { NextRequest, NextResponse } from "next/server";
import { assetRegisterSchema } from "@/lib/schemas/asset-register";
import { getMasterData, addMitraIfNew } from "@/lib/sheets/master";
import {
  isMockMode,
  getSpreadsheetId,
  ensureSheetExists,
  getSheetValues,
  appendRowsToSheet,
} from "@/lib/sheets/client";
import {
  getMonthSheetName,
  TRANSACTION_HEADERS,
} from "@/lib/sheets/helpers";
import { invalidateDashboardCache } from "@/lib/sheets/cache";
import { submitMockTransaction } from "@/lib/sheets/mock";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validasi skema dasar dengan Zod
    const validationResult = assetRegisterSchema.safeParse(body);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      const issues = validationResult.error.issues || (validationResult.error as unknown as { errors: Array<{ path: (string | number)[]; message: string }> }).errors || [];
      issues.forEach((err: { path: (string | number)[]; message: string }) => {
        const fieldName = err.path.join(".");
        fieldErrors[fieldName] = err.message;
      });

      return NextResponse.json(
        {
          success: false,
          error: "Data form tidak valid. Mohon periksa kembali input Anda.",
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // 2. Hitung ulang total harga per item dan grand total gabungan di server
    const calculatedItems = input.items.map((item) => {
      const itemSubtotal = item.hargaSatuan * item.jumlah;
      return {
        ...item,
        totalHarga: itemSubtotal,
      };
    });

    const grandTotalHarga = calculatedItems.reduce((acc, item) => acc + item.totalHarga, 0);
    const grandTotalQty = calculatedItems.reduce((acc, item) => acc + item.jumlah, 0);

    // 3. Validasi terhadap Master Data
    const masterData = await getMasterData();

    // Validasi Internal Order (jika diisi)
    let matchedIO: { code: string; description: string; costCenter: string } | undefined;
    if (input.internalOrder) {
      matchedIO = masterData.internalOrders.find(
        (io) => io.code.toLowerCase() === input.internalOrder.toLowerCase()
      );
      if (!matchedIO) {
        return NextResponse.json(
          {
            success: false,
            error: `Kode Internal Order '${input.internalOrder}' tidak ditemukan atau tidak berstatus AKTIF.`,
            details: { internalOrder: "Internal Order tidak valid atau tidak aktif" },
          },
          { status: 400 }
        );
      }
    }

    // Validasi Cost Center (jika diisi)
    if (input.costCenter) {
      // Jika IO dan Cost Center sama-sama diisi, pastikan cocok
      if (matchedIO) {
        if (input.costCenter.toUpperCase() !== matchedIO.costCenter.toUpperCase()) {
          return NextResponse.json(
            {
              success: false,
              error: `Cost Center '${input.costCenter}' tidak cocok dengan Cost Center milik IO '${matchedIO.code}' (${matchedIO.costCenter}).`,
              details: { costCenter: `Harus sesuai dengan IO (${matchedIO.costCenter})` },
            },
            { status: 400 }
          );
        }
      } else {
        // Jika hanya Cost Center yang diisi
        const matchedCC = masterData.costCenters.find(
          (cc) => cc.code.toLowerCase() === input.costCenter.toLowerCase()
        );
        if (!matchedCC) {
          return NextResponse.json(
            {
              success: false,
              error: `Kode Cost Center '${input.costCenter}' tidak ditemukan di master data.`,
              details: { costCenter: "Cost Center tidak ditemukan di master" },
            },
            { status: 400 }
          );
        }
      }
    }

    // 4. Penanganan Nama Mitra (Alur Mitra Baru sesuai PRD 6.2)
    let finalMitraName = input.namaMitra.trim().replace(/\s+/g, " ");
    const existingMitra = masterData.mitra.find(
      (m) => m.toLowerCase() === finalMitraName.toLowerCase()
    );

    if (existingMitra) {
      // Gunakan casing yang ada di master
      finalMitraName = existingMitra;
    } else {
      // Mitra belum ada di master: tambahkan ke MASTER_MITRA
      const mitraResult = await addMitraIfNew(finalMitraName);
      finalMitraName = mitraResult.finalName;
    }

    // 5. Tentukan nama sheet bulanan berdasarkan tanggal terima barang
    const sheetName = getMonthSheetName(input.tanggalTerimaBarang);

    // 6. Simpan transaksi
    if (isMockMode()) {
      const mockResult = submitMockTransaction({
        ...input,
        namaMitra: finalMitraName,
        items: calculatedItems,
        totalHargaGabungan: grandTotalHarga,
      });

      invalidateDashboardCache();

      return NextResponse.json({
        success: true,
        message: `${calculatedItems.length} jenis barang berhasil disimpan ke sheet '${mockResult.sheetName}' (Baris #${mockResult.startRowNumber}${calculatedItems.length > 1 ? ` - #${mockResult.startRowNumber + calculatedItems.length - 1}` : ""}) [Mode Mock]`,
        data: {
          sheetName: mockResult.sheetName,
          startRowNumber: mockResult.startRowNumber,
          itemCount: calculatedItems.length,
          totalHarga: grandTotalHarga,
          totalQty: grandTotalQty,
        },
      });
    }

    const spreadsheetId = getSpreadsheetId();

    // Pastikan sheet bulan tersebut ada (jika belum ada, buat + header)
    await ensureSheetExists(spreadsheetId, sheetName, TRANSACTION_HEADERS);

    // Hitung nomor urut "No." berdasarkan jumlah baris data yang sudah ada di sheet bulan tersebut
    const existingRows = await getSheetValues(spreadsheetId, `'${sheetName}'!A2:A`);
    const startRowNumber = existingRows.length + 1;

    // Baris data per item sesuai urutan kolom TRANSACTION_HEADERS
    const rowsToAppend = calculatedItems.map((item, idx) => [
      startRowNumber + idx, // No.
      input.tanggalTerimaBarang, // Tanggal Terima Barang
      input.nomorDo || "", // Nomor DO
      finalMitraName, // Nama Mitra
      item.namaBarang, // Nama Barang
      input.namaProject, // Nama Project
      input.pic, // PIC
      input.internalOrder ? input.internalOrder.toUpperCase() : "", // Internal Order (Kode saja)
      input.costCenter ? input.costCenter.toUpperCase() : "", // Cost Center (Kode saja)
      item.hargaSatuan, // Harga Satuan
      item.jumlah, // Jumlah
      item.satuan, // Satuan
      input.anggaran, // Anggaran
      item.totalHarga, // Total Harga per item (dihitung ulang)
      input.keterangan || "", // Keterangan (kolom terakhir)
    ]);

    await appendRowsToSheet(spreadsheetId, sheetName, rowsToAppend);

    // Invalidate cache dashboard agar data terbaru langsung terlihat
    invalidateDashboardCache();

    return NextResponse.json({
      success: true,
      message: `${calculatedItems.length} jenis barang berhasil disimpan ke sheet '${sheetName}' (Baris #${startRowNumber}${calculatedItems.length > 1 ? ` - #${startRowNumber + calculatedItems.length - 1}` : ""})`,
      data: {
        sheetName,
        startRowNumber,
        itemCount: calculatedItems.length,
        totalHarga: grandTotalHarga,
        totalQty: grandTotalQty,
        namaMitra: finalMitraName,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data transaksi";
    console.error("[API /api/submit] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
