import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  clientPortalTokens,
  klanten,
  clientBerichten,
  gebruikers,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/portal/[token]/berichten — all messages for klant
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const [portalToken] = await db
      .select()
      .from(clientPortalTokens)
      .where(
        and(
          eq(clientPortalTokens.token, token),
          eq(clientPortalTokens.actief, 1)
        )
      );

    if (!portalToken) {
      return NextResponse.json({ fout: "Ongeldige of verlopen link." }, { status: 404 });
    }

    // Mark all messages from Autronis as read
    await db
      .update(clientBerichten)
      .set({ gelezen: 1 })
      .where(
        and(
          eq(clientBerichten.klantId, portalToken.klantId!),
          eq(clientBerichten.vanKlant, 0),
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
      .where(eq(clientBerichten.klantId, portalToken.klantId!))
      .orderBy(sql`${clientBerichten.aangemaaktOp} asc`);

    return NextResponse.json({ berichten });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}

// POST /api/portal/[token]/berichten — send message from klant
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { bericht } = body;

    if (!bericht?.trim()) {
      return NextResponse.json({ fout: "Bericht mag niet leeg zijn." }, { status: 400 });
    }

    const [portalToken] = await db
      .select()
      .from(clientPortalTokens)
      .where(
        and(
          eq(clientPortalTokens.token, token),
          eq(clientPortalTokens.actief, 1)
        )
      );

    if (!portalToken) {
      return NextResponse.json({ fout: "Ongeldige of verlopen link." }, { status: 404 });
    }

    const [nieuwBericht] = await db
      .insert(clientBerichten)
      .values({
        klantId: portalToken.klantId,
        bericht: bericht.trim(),
        vanKlant: 1,
        gelezen: 0,
      })
      .returning();

    return NextResponse.json({ bericht: nieuwBericht }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
