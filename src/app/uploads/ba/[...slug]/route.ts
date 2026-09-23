import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  try {
    const { slug } = await context.params;

    if (!slug || slug.length === 0) {
      return NextResponse.json({ error: "File not specified" }, { status: 400 });
    }

    const uploadBaseDir = path.resolve(process.cwd(), "public", "uploads", "ba");

    // Cegah path traversal dengan memvalidasi setiap segment
    const relativePath = path.join(...slug);
    const resolvedPath = path.resolve(uploadBaseDir, relativePath);

    // Keamanan: Pastikan path berada tepat di dalam folder uploadBaseDir
    if (!resolvedPath.startsWith(uploadBaseDir + path.sep)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Periksa keberadaan file fisik di disk
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Not a valid file" }, { status: 400 });
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const filename = path.basename(resolvedPath);

    const fileBuffer = fs.readFileSync(resolvedPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    console.error("[Serve Evidence BA Error]:", err);
    return NextResponse.json(
      { error: "Internal server error reading evidence file" },
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const getRes = await GET(request, context);
  return new NextResponse(null, {
    status: getRes.status,
    headers: getRes.headers,
  });
}
