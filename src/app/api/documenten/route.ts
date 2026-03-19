import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createNotionDocument, fetchAllDocuments } from "@/lib/notion";
import { categorizeDocument } from "@/lib/ai/documenten";
import { DocumentPayload, SortOption } from "@/types/documenten";
import { db } from "@/lib/db";
import { klanten, projecten } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = request.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const sort = (searchParams.get("sort") as SortOption) ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    const result = await fetchAllDocuments({
      pageSize: Math.min(limit, 100),
      cursor,
      sort,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
    }
    return NextResponse.json({ fout: "Kon documenten niet ophalen" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const payload = (await request.json()) as DocumentPayload;

    let klantNaam: string | undefined;
    let projectNaam: string | undefined;

    if ("klantId" in payload && payload.klantId) {
      const klant = await db.select({ bedrijfsnaam: klanten.bedrijfsnaam }).from(klanten).where(eq(klanten.id, payload.klantId)).get();
      klantNaam = klant?.bedrijfsnaam;
    }

    if ("projectId" in payload && payload.projectId) {
      const project = await db.select({ naam: projecten.naam }).from(projecten).where(eq(projecten.id, payload.projectId)).get();
      projectNaam = project?.naam;
    }

    const categorisatie = await categorizeDocument(payload.content, payload.type);

    const result = await createNotionDocument(
      payload,
      categorisatie.samenvatting,
      gebruiker.naam,
      klantNaam,
      projectNaam
    );

    return NextResponse.json({ document: { ...result, type: payload.type } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
    }
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Kon document niet aanmaken" },
      { status: 500 }
    );
  }
}
