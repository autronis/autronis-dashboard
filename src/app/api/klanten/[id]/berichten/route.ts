import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientBerichten, gebruikers } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";

// GET /api/klanten/[id]/berichten — messages for klant (dashboard view)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const klantId = Number(id);

    // Mark all messages from klant as read
    await db
      .update(clientBerichten)
      .set({ gelezen: 1 })
      .where(
        and(
          eq(clientBerichten.klantId, klantId),
          eq(clientBerichten.vanKlant, 1),
          eq(clientBerichten.gelezen, 0)
        )
      );

    const berichten = await db
      .select({
        id: clientBerichten.id,
        bericht: clientBerichten.bericht,
        vanKlant: clientBerichten.vanKlant,
        gelezen: clientBerichten.gelezen,
        aangemaaktOp: clientBerichten.aangemaaktOp,
        gebruikerNaam: gebruikers.naam,
      })
      .from(clientBerichten)
      .leftJoin(gebruikers, eq(clientBerichten.gebruikerId, gebruikers.id))
      .where(eq(clientBerichten.klantId, klantId))
      .orderBy(sql`${clientBerichten.aangemaaktOp} asc`);

    return NextResponse.json({ berichten });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// POST /api/klanten/[id]/berichten — send message from Autronis
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gebruiker = await requireAuth();
    const { id } = await params;
    const klantId = Number(id);
    const body = await req.json();
    const { bericht } = body;

    if (!bericht?.trim()) {
      return NextResponse.json({ fout: "Bericht mag niet leeg zijn." }, { status: 400 });
    }

    const [nieuwBericht] = await db
      .insert(clientBerichten)
      .values({
        klantId,
        gebruikerId: gebruiker.id,
        bericht: bericht.trim(),
        vanKlant: 0,
        gelezen: 0,
      })
      .returning();

    return NextResponse.json({ bericht: nieuwBericht }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
