import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { onkostenDeclaraties, gebruikers } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

// GET /api/team/declaraties — alle declaraties met gebruikersnamen
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const gebruikerIdFilter = searchParams.get("gebruikerId");

    const rows = await db
      .select({
        id: onkostenDeclaraties.id,
        gebruikerId: onkostenDeclaraties.gebruikerId,
        gebruikerNaam: gebruikers.naam,
        datum: onkostenDeclaraties.datum,
        omschrijving: onkostenDeclaraties.omschrijving,
        bedrag: onkostenDeclaraties.bedrag,
        categorie: onkostenDeclaraties.categorie,
        bonnetjeUrl: onkostenDeclaraties.bonnetjeUrl,
        status: onkostenDeclaraties.status,
        beoordeeldDoor: onkostenDeclaraties.beoordeeldDoor,
        aangemaaktOp: onkostenDeclaraties.aangemaaktOp,
      })
      .from(onkostenDeclaraties)
      .leftJoin(gebruikers, eq(onkostenDeclaraties.gebruikerId, gebruikers.id))
      .orderBy(desc(onkostenDeclaraties.datum));

    let filtered = rows;

    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (gebruikerIdFilter) {
      filtered = filtered.filter((r) => r.gebruikerId === Number(gebruikerIdFilter));
    }

    // Calculate totaal uitstaand (ingediend + goedgekeurd)
    const totaalUitstaand = rows
      .filter((r) => r.status === "ingediend" || r.status === "goedgekeurd")
      .reduce((sum, r) => sum + (r.bedrag || 0), 0);

    return NextResponse.json({ declaraties: filtered, totaalUitstaand });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// POST /api/team/declaraties — nieuwe declaratie
export async function POST(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const body = await req.json();
    const { datum, omschrijving, bedrag, categorie, bonnetjeUrl } = body;

    if (!datum || !omschrijving?.trim() || !bedrag) {
      return NextResponse.json(
        { fout: "Datum, omschrijving en bedrag zijn verplicht." },
        { status: 400 }
      );
    }

    if (Number(bedrag) <= 0) {
      return NextResponse.json({ fout: "Bedrag moet positief zijn." }, { status: 400 });
    }

    const [nieuw] = await db
      .insert(onkostenDeclaraties)
      .values({
        gebruikerId: gebruiker.id,
        datum,
        omschrijving: omschrijving.trim(),
        bedrag: Number(bedrag),
        categorie: categorie || "overig",
        bonnetjeUrl: bonnetjeUrl?.trim() || null,
        status: "ingediend",
      })
      .returning();

    return NextResponse.json({ declaratie: nieuw }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
