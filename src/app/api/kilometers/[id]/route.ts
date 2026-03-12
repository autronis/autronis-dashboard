import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kilometerRegistraties } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

// PUT /api/kilometers/[id] — Update rit
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gebruiker = await requireAuth();
    const { id } = await params;
    const ritId = parseInt(id);
    const body = await req.json();

    const { datum, vanLocatie, naarLocatie, kilometers, zakelijkDoel, klantId, projectId, tariefPerKm } = body;

    if (!datum || !vanLocatie?.trim() || !naarLocatie?.trim() || !kilometers) {
      return NextResponse.json(
        { fout: "Datum, van, naar en kilometers zijn verplicht." },
        { status: 400 }
      );
    }

    const [bijgewerkt] = await db
      .update(kilometerRegistraties)
      .set({
        datum,
        vanLocatie: vanLocatie.trim(),
        naarLocatie: naarLocatie.trim(),
        kilometers: parseFloat(kilometers),
        zakelijkDoel: zakelijkDoel?.trim() || null,
        klantId: klantId || null,
        projectId: projectId || null,
        tariefPerKm: tariefPerKm ?? 0.23,
      })
      .where(
        and(
          eq(kilometerRegistraties.id, ritId),
          eq(kilometerRegistraties.gebruikerId, gebruiker.id)
        )
      )
      .returning();

    if (!bijgewerkt) {
      return NextResponse.json({ fout: "Rit niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ rit: bijgewerkt });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// DELETE /api/kilometers/[id] — Delete rit
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gebruiker = await requireAuth();
    const { id } = await params;
    const ritId = parseInt(id);

    const [verwijderd] = await db
      .delete(kilometerRegistraties)
      .where(
        and(
          eq(kilometerRegistraties.id, ritId),
          eq(kilometerRegistraties.gebruikerId, gebruiker.id)
        )
      )
      .returning();

    if (!verwijderd) {
      return NextResponse.json({ fout: "Rit niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
