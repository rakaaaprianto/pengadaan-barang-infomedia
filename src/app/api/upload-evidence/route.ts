import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Daftar ekstensi yang diizinkan
const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"] as const;
type AllowedExt = (typeof ALLOWED_EXTENSIONS)[number];

// Daftar MIME-type yang diizinkan
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

// Ukuran maksimum berkas: 15 MB
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

/**
 * Validasi Magic Bytes (Binary File Signature)
 * Memastikan konten biner berkas sesuai dengan tipe berkas aslinya,
 * mencegah penyamaran file berbahaya (malware / executable / html) dengan ekstensi palsu.
 */
function isValidFileSignature(buffer: Buffer, ext: AllowedExt): boolean {
  if (buffer.length < 4) return false;

  // 1. Cek Magic Bytes yang DILARANG KERAS (Executable / Script / HTML Injection)
  // Windows MZ header (EXE, DLL, SYS)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return false;
  }
  // Linux ELF executable
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return false;
  }
  // Script shebang (#!)
  if (buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21) {
    return false;
  }

  // Cek apakah ada script HTML/PHP berbahaya di awal file
  const first1024Ascii = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("ascii").toLowerCase();
  if (
    first1024Ascii.includes("<html") ||
    first1024Ascii.includes("<script") ||
    first1024Ascii.includes("<?php") ||
    first1024Ascii.includes("<%@")
  ) {
    return false;
  }

  // 2. Validasi Magic Bytes berdasarkan ekstensi yang diklaim
  switch (ext) {
    case ".pdf": {
      // PDF wajib memiliki signature %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
      // Diperiksa dalam 1024 byte pertama untuk mengakomodasi UTF-8 BOM
      const slice = buffer.subarray(0, Math.min(buffer.length, 1024));
      return slice.includes(Buffer.from("%PDF-"));
    }

    case ".png": {
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (buffer.length < 8) return false;
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      return buffer.subarray(0, 8).equals(pngSignature);
    }

    case ".jpg":
    case ".jpeg": {
      // JPEG: FF D8 FF
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    case ".webp": {
      // WEBP: "RIFF" pada byte 0-3 dan "WEBP" pada byte 8-11
      if (buffer.length < 12) return false;
      const riff = buffer.subarray(0, 4).toString("ascii");
      const webp = buffer.subarray(8, 12).toString("ascii");
      return riff === "RIFF" && webp === "WEBP";
    }

    default:
      return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawSheet = formData.get("sheetName");
    const rawRow = formData.get("rowNumber");

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Tidak ada file bukti (evidence) yang diunggah." },
        { status: 400 }
      );
    }

    // 1. Validasi Ukuran File (Zero-byte & Max 15 MB)
    if (file.size <= 0) {
      return NextResponse.json(
        { success: false, message: "Berkas kosong (0 bytes) tidak diperbolehkan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: "Ukuran berkas terlalu besar. Maksimal 15 MB." },
        { status: 400 }
      );
    }

    // 2. Validasi Ekstensi Berkas (Whitelist Only)
    const rawOriginalName = file.name || "evidence_ba.pdf";
    // Mencegah traversal nama file original
    const originalName = path.basename(rawOriginalName).trim();
    const ext = path.extname(originalName).toLowerCase() as AllowedExt;

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format ekstensi berkas ditolak. Hanya format PDF, PNG, JPG, dan WEBP yang diizinkan.",
        },
        { status: 400 }
      );
    }

    // 3. Validasi MIME Type (jika dikirim oleh browser)
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          message: `MIME-type berkas (${file.type}) tidak valid atau tidak diizinkan.`,
        },
        { status: 400 }
      );
    }

    // 4. Baca Binary Buffer dan Validasi Magic Bytes (Deep Content Inspection)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, message: "Ukuran berkas melebihi batas 15 MB." },
        { status: 400 }
      );
    }

    const isValidSignature = isValidFileSignature(buffer, ext);
    if (!isValidSignature) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Keamanan Sistem: Isi berkas tidak valid atau tidak sesuai dengan format yang diklaim (Magic Bytes Mismatch). Berkas ditolak untuk mencegah potensi malware.",
        },
        { status: 400 }
      );
    }

    // 5. Sanitasi Parameter Input & Cegah Path Traversal
    const cleanSheet = String(rawSheet || "Sheet")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40) || "Sheet";

    const cleanRow = String(rawRow || "0")
      .replace(/[^0-9]/g, "")
      .slice(0, 10) || "0";

    const cleanBaseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30) || "file";

    // Token kriptografis acak berkekuatan tinggi (16 karakter hex)
    const secureToken = crypto.randomBytes(8).toString("hex");
    const uniqueFileName = `BA_${cleanSheet}_Row${cleanRow}_${Date.now()}_${secureToken}_${cleanBaseName}${ext}`;

    // 6. Direktori Penyimpanan & Verifikasi Jalur Mutlak (Sandbox Check)
    const uploadDir = path.resolve(process.cwd(), "public", "uploads", "ba");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const destinationPath = path.resolve(uploadDir, uniqueFileName);

    // Pastikan jalur tujuan berada tepat di dalam folder uploadDir (Cegah Directory Traversal Attack)
    if (!destinationPath.startsWith(uploadDir + path.sep)) {
      return NextResponse.json(
        { success: false, message: "Upaya akses direktori terlarang terdeteksi." },
        { status: 403 }
      );
    }

    // 7. Simpan Buffer Berkas ke Disk
    fs.writeFileSync(destinationPath, buffer);

    const fileUrl = `/uploads/ba/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      message: "Berkas Evidence BA berhasil diverifikasi dan diunggah dengan aman.",
      data: {
        fileUrl,
        fileName: uniqueFileName,
        originalName,
        size: buffer.length,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Upload Evidence Security Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Terjadi kesalahan internal pada server saat memproses berkas.",
      },
      { status: 500 }
    );
  }
}

