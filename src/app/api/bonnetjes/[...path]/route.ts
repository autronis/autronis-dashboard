import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const fileName = segments.join("/");

    // Prevent directory traversal
    if (fileName.includes("..") || fileName.includes("\\")) {
      return NextResponse.json({ fout: "Ongeldig pad" }, { status: 400 });
    }

    const filePath = path.join(
      process.cwd(),
      "data",
      "uploads",
      "bonnetjes",
      fileName
    );
    const buffer = await readFile(filePath);

    // Determine content type from extension
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { fout: "Bestand niet gevonden" },
      { status: 404 }
    );
  }
}
