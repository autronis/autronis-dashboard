import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentInzichten, klanten, projecten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import type { InzichtCategorie } from "@/types/content";

export async function GET() {
  try {
    await requireAuth();

    const rows = await db
      .select({
        id: contentInzichten.id,
        titel: contentInzichten.titel,
        inhoud: contentInzichten.inhoud,
        categorie: contentInzichten.categorie,
        klantId: contentInzichten.klantId,
        projectId: contentInzichten.projectId,
        isGebruikt: contentInzichten.isGebruikt,
        aangemaaktDoor: contentInzichten.aangemaaktDoor,
        aangemaaktOp: contentInzichten.aangemaaktOp,
        klantNaam: klanten.bedrijfsnaam,
        projectNaam: projecten.naam,
      })
      .from(contentInzichten)
      .leftJoin(klanten, eq(contentInzichten.klantId, klanten.id))
      .leftJoin(projecten, eq(contentInzichten.projectId, projecten.id))
      .orderBy(desc(contentInzichten.aangemaaktOp));

    return NextResponse.json({ inzichten: rows });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const body = await req.json() as {
      titel: string;
      inhoud: string;
      categorie: InzichtCategorie;
      klantId?: number;
      projectId?: number;
    };

    if (!body.titel?.trim()) {
      return NextResponse.json({ fout: "Titel is verplicht." }, { status: 400 });
    }
    if (!body.inhoud?.trim()) {
      return NextResponse.json({ fout: "Inhoud is verplicht." }, { status: 400 });
    }
    if (!body.categorie) {
      return NextResponse.json({ fout: "Categorie is verplicht." }, { status: 400 });
    }

    const [nieuw] = await db
      .insert(contentInzichten)
      .values({
        titel: body.titel.trim(),
        inhoud: body.inhoud.trim(),
        categorie: body.categorie,
        klantId: body.klantId ?? null,
        projectId: body.projectId ?? null,
        aangemaaktDoor: gebruiker.id,
      })
      .returning();

    return NextResponse.json({ inzicht: nieuw }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
