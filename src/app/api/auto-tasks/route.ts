import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { facturen, factuurRegels, ideeen } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, lte, sql } from "drizzle-orm";

export async function POST() {
  try {
    const gebruiker = await requireAuth();
    const nu = new Date().toISOString().split("T")[0];
    const results: Record<string, unknown> = {};

    // 1. Mark overdue invoices as te_laat
    const overdue = db
      .update(facturen)
      .set({ status: "te_laat", bijgewerktOp: new Date().toISOString() })
      .where(
        and(
          eq(facturen.status, "verzonden"),
          eq(facturen.isActief, 1),
          lte(facturen.vervaldatum, nu)
        )
      )
      .run();
    results.overdueMarked = overdue.changes;

    // 2. Generate periodic invoices (if any recurring paid invoices are due)
    const terugkerend = db
      .select()
      .from(facturen)
      .where(
        and(
          eq(facturen.isTerugkerend, 1),
          eq(facturen.status, "betaald"),
          eq(facturen.isActief, 1)
        )
      )
      .all();

    let periodiekeAangemaakt = 0;
    for (const f of terugkerend) {
      if (!f.betaaldOp) continue;
      const interval = f.terugkeerInterval === "wekelijks" ? 7 : 30;
      const daysSince = Math.floor(
        (Date.now() - new Date(f.betaaldOp).getTime()) / 86400000
      );
      if (daysSince < interval) continue;

      // Generate next factuurnummer
      const jaar = new Date().getFullYear();
      const maxNr = db
        .select({ max: sql<string>`MAX(factuurnummer)` })
        .from(facturen)
        .where(sql`factuurnummer LIKE ${"AUT-" + jaar + "-%"}`)
        .get();
      const lastNum = maxNr?.max ? parseInt(maxNr.max.split("-")[2]) : 0;
      const nextNummer = `AUT-${jaar}-${String(lastNum + 1).padStart(3, "0")}`;

      const vandaag = new Date().toISOString().split("T")[0];
      const verval = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .split("T")[0];

      const [nieuw] = db
        .insert(facturen)
        .values({
          klantId: f.klantId,
          projectId: f.projectId,
          factuurnummer: nextNummer,
          status: "concept",
          bedragExclBtw: f.bedragExclBtw,
          btwPercentage: f.btwPercentage,
          btwBedrag: f.btwBedrag,
          bedragInclBtw: f.bedragInclBtw,
          factuurdatum: vandaag,
          vervaldatum: verval,
          isTerugkerend: 1,
          terugkeerInterval: f.terugkeerInterval,
          notities: `Automatisch aangemaakt vanuit ${f.factuurnummer}`,
          isActief: 1,
          aangemaaktDoor: gebruiker.id,
        })
        .returning()
        .all();

      // Copy factuurregels
      if (nieuw) {
        const regels = db
          .select()
          .from(factuurRegels)
          .where(eq(factuurRegels.factuurId, f.id))
          .all();
        for (const r of regels) {
          db.insert(factuurRegels)
            .values({
              factuurId: nieuw.id,
              omschrijving: r.omschrijving,
              aantal: r.aantal,
              eenheidsprijs: r.eenheidsprijs,
              btwPercentage: r.btwPercentage,
              totaal: r.totaal,
            })
            .run();
        }
        periodiekeAangemaakt++;
      }
    }
    results.periodiekeAangemaakt = periodiekeAangemaakt;

    // 3. Count ideeën backlog
    const ideeenCount = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(ideeen)
      .get();
    results.ideeenTotaal = ideeenCount?.count ?? 0;

    return NextResponse.json({ succes: true, results });
  } catch (error) {
    return NextResponse.json(
      {
        fout:
          error instanceof Error ? error.message : "Onbekende fout",
      },
      {
        status:
          error instanceof Error &&
          error.message === "Niet geauthenticeerd"
            ? 401
            : 500,
      }
    );
  }
}
