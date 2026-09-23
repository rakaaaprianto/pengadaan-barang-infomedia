import { NextRequest, NextResponse } from "next/server";
import { trackingUpdateSchema } from "@/lib/schemas/asset-register";
import { isMockMode, getSpreadsheetId, updateRowTrackingValues } from "@/lib/sheets/client";
import { updateMockTrackingRow } from "@/lib/sheets/mock";
import { invalidateDashboardCache } from "@/lib/sheets/cache";

export async function POST(request: NextRequest) {
  return handleTrackingUpdate(request);
}

export async function PATCH(request: NextRequest) {
  return handleTrackingUpdate(request);
}

async function handleTrackingUpdate(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = trackingUpdateSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Data input pembaruan status tidak valid",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    if (isMockMode()) {
      const updated = updateMockTrackingRow(data.sheetName, data.rowNumber, {
        keterangan: data.keterangan,
        tanggalTerimaBarcode: data.tanggalTerimaBarcode,
        tanggalProsesBarcode: data.tanggalProsesBarcode,
        tanggalKirimBarang: data.tanggalKirimBarang,
        userPemakai: data.userPemakai,
        tujuanPengiriman: data.tujuanPengiriman,
        prosesStatus: data.prosesStatus,
        evidenceBaUrl: data.evidenceBaUrl,
        evidenceBaFileName: data.evidenceBaFileName,
      });

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            message: `Baris ke-${data.rowNumber} pada sheet "${data.sheetName}" tidak ditemukan dalam data mock.`,
          },
          { status: 404 }
        );
      }
    } else {
      const spreadsheetId = getSpreadsheetId();
      await updateRowTrackingValues(spreadsheetId, data.sheetName, data.rowNumber, {
        keterangan: data.keterangan,
        tanggalTerimaBarcode: data.tanggalTerimaBarcode,
        tanggalProsesBarcode: data.tanggalProsesBarcode,
        tanggalKirimBarang: data.tanggalKirimBarang,
        userPemakai: data.userPemakai,
        tujuanPengiriman: data.tujuanPengiriman,
        prosesStatus: data.prosesStatus,
        evidenceBaUrl: data.evidenceBaUrl,
      });
    }

    // Invalidate cache agar dashboard dan tracking view langsung menampilkan data terbaru
    invalidateDashboardCache();

    return NextResponse.json({
      success: true,
      message: `Status proses baris ke-${data.rowNumber} (${data.sheetName}) berhasil diperbarui!`,
      data: {
        sheetName: data.sheetName,
        rowNumber: data.rowNumber,
        prosesStatus: data.prosesStatus,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Tracking API Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Gagal memperbarui status proses ke spreadsheet. Silakan coba beberapa saat lagi.",
      },
      { status: 500 }
    );
  }
}
