import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  clientPortalTokens,
  klanten,
  facturen,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/portal/[token]/facturen — list klant's facturen
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

    const [klant] = await db
      .select({ id: klanten.id })
      .from(klanten)
      .where(eq(klanten.id, portalToken.klantId!));

    if (!klant) {
      return NextResponse.json({ fout: "Klant niet gevonden." }, { status: 404 });
    }

    const facturenLijst = await db
      .select({
        id: facturen.id,
        factuurnummer: facturen.factuurnummer,
        status: facturen.status,
        bedragExclBtw: facturen.bedragExclBtw,
        btwBedrag: facturen.btwBedrag,
        bedragInclBtw: facturen.bedragInclBtw,
        factuurdatum: facturen.factuurdatum,
        vervaldatum: facturen.vervaldatum,
        betaaldOp: facturen.betaaldOp,
      })
      .from(facturen)
      .where(
        and(
          eq(facturen.klantId, klant.id),
          eq(facturen.isActief, 1)
        )
      )
      .orderBy(sql`${facturen.factuurdatum} desc`);

    // Only show sent/paid invoices (not drafts)
    const zichtbareFacturen = facturenLijst.filter(
      (f) => f.status !== "concept"
    );

    return NextResponse.json({ facturen: zichtbareFacturen });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
