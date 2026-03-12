import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verlof, gebruikers } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

// GET /api/team/verlof — alle verlof entries met gebruikersnamen
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const jaar = searchParams.get("jaar");

    const rows = await db
      .select({
        id: verlof.id,
        gebruikerId: verlof.gebruikerId,
        gebruikerNaam: gebruikers.naam,
        startDatum: verlof.startDatum,
        eindDatum: verlof.eindDatum,
        type: verlof.type,
        status: verlof.status,
        notities: verlof.notities,
        beoordeeldDoor: verlof.beoordeeldDoor,
        aangemaaktOp: verlof.aangemaaktOp,
      })
      .from(verlof)
      .leftJoin(gebruikers, eq(verlof.gebruikerId, gebruikers.id))
      .orderBy(desc(verlof.startDatum));

    // Filter by year if specified
    const filtered = jaar
      ? rows.filter((r) => r.startDatum.startsWith(jaar))
      : rows;

    return NextResponse.json({ verlof: filtered });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// POST /api/team/verlof — verlof aanvraag voor huidige gebruiker
export async function POST(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const body = await req.json();
    const { startDatum, eindDatum, type, notities } = body;

    if (!startDatum || !eindDatum) {
      return NextResponse.json({ fout: "Start- en einddatum zijn verplicht." }, { status: 400 });
    }

    if (startDatum > eindDatum) {
      return NextResponse.json({ fout: "Startdatum moet voor einddatum liggen." }, { status: 400 });
    }

    const [nieuw] = await db
      .insert(verlof)
      .values({
        gebruikerId: gebruiker.id,
        startDatum,
        eindDatum,
        type: type || "vakantie",
        status: "aangevraagd",
        notities: notities?.trim() || null,
      })
      .returning();

    return NextResponse.json({ verlof: nieuw }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
