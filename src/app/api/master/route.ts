import { NextRequest, NextResponse } from "next/server";
import { getMasterData } from "@/lib/sheets/master";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "1";

    const data = await getMasterData(forceRefresh);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat data master";
    console.error("[API /api/master] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
