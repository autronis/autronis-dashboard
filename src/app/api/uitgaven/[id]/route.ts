import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uitgaven } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

// PUT /api/uitgaven/[id] — Update uitgave
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const uitgaveId = parseInt(id);
    const body = await req.json();

    const {
      omschrijving,
      bedrag,
      datum,
      categorie,
      leverancier,
      btwBedrag,
      btwPercentage,
      fiscaalAftrekbaar,
      bonnetjeUrl,
    } = body;

    if (!omschrijving?.trim() || !bedrag || !datum) {
      return NextResponse.json(
        { fout: "Omschrijving, bedrag en datum zijn verplicht." },
        { status: 400 }
      );
    }

    const [bijgewerkt] = await db
      .update(uitgaven)
      .set({
        omschrijving: omschrijving.trim(),
        bedrag: parseFloat(bedrag),
        datum,
        categorie: categorie || "overig",
        leverancier: leverancier?.trim() || null,
        btwBedrag: btwBedrag ? parseFloat(btwBedrag) : null,
        btwPercentage: btwPercentage ? parseFloat(btwPercentage) : 21,
        fiscaalAftrekbaar: fiscaalAftrekbaar === false ? 0 : 1,
        bonnetjeUrl: bonnetjeUrl?.trim() || null,
        bijgewerktOp: new Date().toISOString(),
      })
      .where(eq(uitgaven.id, uitgaveId))
      .returning();

    if (!bijgewerkt) {
      return NextResponse.json({ fout: "Uitgave niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ uitgave: bijgewerkt });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// DELETE /api/uitgaven/[id] — Delete uitgave
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const uitgaveId = parseInt(id);

    const [verwijderd] = await db
      .delete(uitgaven)
      .where(eq(uitgaven.id, uitgaveId))
      .returning();

    if (!verwijderd) {
      return NextResponse.json({ fout: "Uitgave niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
