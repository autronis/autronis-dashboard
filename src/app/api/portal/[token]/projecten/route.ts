import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  clientPortalTokens,
  klanten,
  projecten,
  taken,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// GET /api/portal/[token]/projecten — list klant's projects with tasks
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

    const projectenLijst = await db
      .select({
        id: projecten.id,
        naam: projecten.naam,
        omschrijving: projecten.omschrijving,
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
      )
      .orderBy(projecten.naam);

    // Get tasks per project (only non-sensitive info)
    const projectenMetTaken = await Promise.all(
      projectenLijst.map(async (p) => {
        const takenLijst = await db
          .select({
            id: taken.id,
            titel: taken.titel,
            status: taken.status,
            prioriteit: taken.prioriteit,
          })
          .from(taken)
          .where(eq(taken.projectId, p.id))
          .orderBy(
            sql`CASE ${taken.status} WHEN 'open' THEN 0 WHEN 'bezig' THEN 1 WHEN 'afgerond' THEN 2 END`
          );

        const totaal = takenLijst.length;
        const afgerond = takenLijst.filter((t) => t.status === "afgerond").length;

        return {
          ...p,
          taken: takenLijst,
          voortgang: totaal > 0 ? Math.round((afgerond / totaal) * 100) : 0,
        };
      })
    );

    return NextResponse.json({ projecten: projectenMetTaken });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
