import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fetchNotionDocument } from "@/lib/notion";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    const document = await fetchNotionDocument(id);
    if (!document) {
      return NextResponse.json({ fout: "Document niet gevonden" }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof Error && error.message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
    }
    return NextResponse.json({ fout: "Kon document niet ophalen" }, { status: 500 });
  }
}
