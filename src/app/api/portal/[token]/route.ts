import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  clientPortalTokens,
  klanten,
  projecten,
  taken,
  facturen,
  clientBerichten,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/portal/[token] — validate token, return klant overview
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find active token
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

    // Update last login
    await db
      .update(clientPortalTokens)
      .set({ laatstIngelogdOp: new Date().toISOString() })
      .where(eq(clientPortalTokens.id, portalToken.id));

    // Get klant
    const [klant] = await db
      .select({
        id: klanten.id,
        bedrijfsnaam: klanten.bedrijfsnaam,
        contactpersoon: klanten.contactpersoon,
        email: klanten.email,
      })
      .from(klanten)
      .where(eq(klanten.id, portalToken.klantId!));

    if (!klant) {
      return NextResponse.json({ fout: "Klant niet gevonden." }, { status: 404 });
    }

    // Active projects with task progress
    const projectenLijst = await db
      .select({
        id: projecten.id,
        naam: projecten.naam,
        status: projecten.status,
        voortgangPercentage: projecten.voortgangPercentage,
        deadline: projecten.deadline,
      })
      .from(projecten)
      .where(
        and(
          eq(projecten.klantId, klant.id),
          eq(projecten.isActief, 1)
        )
      );

    // Get task counts per project
    const projectenMetTaken = await Promise.all(
      projectenLijst.map(async (p) => {
        const [counts] = await db
          .select({
            totaal: sql<number>`count(*)`,
            afgerond: sql<number>`sum(case when ${taken.status} = 'afgerond' then 1 else 0 end)`,
          })
          .from(taken)
          .where(eq(taken.projectId, p.id));
        return {
          ...p,
          takenTotaal: counts?.totaal || 0,
          takenAfgerond: counts?.afgerond || 0,
        };
      })
    );

    // Recent facturen
    const recenteFacturen = await db
      .select({
        id: facturen.id,
        factuurnummer: facturen.factuurnummer,
        status: facturen.status,
        bedragInclBtw: facturen.bedragInclBtw,
        factuurdatum: facturen.factuurdatum,
        vervaldatum: facturen.vervaldatum,
      })
      .from(facturen)
      .where(
        and(
          eq(facturen.klantId, klant.id),
          eq(facturen.isActief, 1)
        )
      )
      .orderBy(sql`${facturen.factuurdatum} desc`)
      .limit(5);

    // Unread messages count
    const [berichtenCount] = await db
      .select({
        ongelezen: sql<number>`sum(case when ${clientBerichten.vanKlant} = 0 and ${clientBerichten.gelezen} = 0 then 1 else 0 end)`,
      })
      .from(clientBerichten)
      .where(eq(clientBerichten.klantId, klant.id));

    return NextResponse.json({
      klant,
      projecten: projectenMetTaken,
      facturen: recenteFacturen,
      ongelezenBerichten: berichtenCount?.ongelezen || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
