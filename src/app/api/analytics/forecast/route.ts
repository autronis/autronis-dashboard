import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { facturen, projecten, gebruikers } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, gte, lt, sql } from "drizzle-orm";

// GET /api/analytics/forecast
export async function GET() {
  try {
    await requireAuth();

    const now = new Date();
    const currentYear = now.getFullYear();

    // "Zeker" revenue: active projects with geschatteUren * average uurtarief
    const actieveProjectenRows = await db
      .select({
        geschatteUren: projecten.geschatteUren,
        werkelijkeUren: projecten.werkelijkeUren,
        klantUurtarief: sql<number>`COALESCE(${projecten.geschatteUren}, 0)`,
      })
      .from(projecten)
      .where(and(eq(projecten.status, "actief"), eq(projecten.isActief, 1)));

    // Average uurtarief from all gebruikers
    const [uurtariefResult] = await db
      .select({ avg: sql<number>`COALESCE(AVG(${gebruikers.uurtariefStandaard}), 85)` })
      .from(gebruikers)
      .where(sql`${gebruikers.uurtariefStandaard} > 0`);
    const avgUurtarief = uurtariefResult?.avg ?? 85;

    // Sum remaining hours across active projects
    const restUren = actieveProjectenRows.reduce((sum, p) => {
      const geschat = p.geschatteUren ?? 0;
      const werkelijk = p.werkelijkeUren ?? 0;
      return sum + Math.max(geschat - werkelijk, 0);
    }, 0);
    const zekereOmzet = restUren * avgUurtarief;

    // Historical average monthly revenue (last 6 months)
    let totaleHistorischeOmzet = 0;
    const aantalMaanden = 6;
    for (let i = 1; i <= aantalMaanden; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const [result] = await db
        .select({ total: sql<number>`COALESCE(SUM(${facturen.bedragExclBtw}), 0)` })
        .from(facturen)
        .where(
          and(
            eq(facturen.status, "betaald"),
            gte(facturen.betaaldOp, start.toISOString().slice(0, 10)),
            lt(facturen.betaaldOp, end.toISOString().slice(0, 10))
          )
        );
      totaleHistorischeOmzet += result?.total ?? 0;
    }
    const verwachteOmzetPerMaand = totaleHistorischeOmzet / aantalMaanden;

    // Omzet dit jaar tot nu toe
    const [omzetDitJaar] = await db
      .select({ total: sql<number>`COALESCE(SUM(${facturen.bedragExclBtw}), 0)` })
      .from(facturen)
      .where(
        and(
          eq(facturen.status, "betaald"),
          gte(facturen.betaaldOp, `${currentYear}-01-01`),
          lt(facturen.betaaldOp, `${currentYear + 1}-01-01`)
        )
      );
    const omzetTotNu = omzetDitJaar?.total ?? 0;

    // Annual target: verwachte * 12 (or use a configurable target)
    const jaardoel = verwachteOmzetPerMaand * 12;
    const resterendeMaanden = 12 - now.getMonth();
    const benodigdPerMaand = resterendeMaanden > 0
      ? (jaardoel - omzetTotNu) / resterendeMaanden
      : 0;
    const opKoers = benodigdPerMaand <= verwachteOmzetPerMaand * 1.1;

    // 3-month forecast with scenarios
    const zekerePerMaand = zekereOmzet / 3; // Spread secure revenue over 3 months
    const maanden: {
      maand: string;
      label: string;
      bestCase: number;
      verwacht: number;
      worstCase: number;
    }[] = [];

    for (let i = 1; i <= 3; i++) {
      const target = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = target.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
      const maandStr = target.toISOString().slice(0, 7);

      maanden.push({
        maand: maandStr,
        label,
        bestCase: Math.round((zekerePerMaand + verwachteOmzetPerMaand * 1.2) * 100) / 100,
        verwacht: Math.round((zekerePerMaand + verwachteOmzetPerMaand * 0.8) * 100) / 100,
        worstCase: Math.round(zekerePerMaand * 0.6 * 100) / 100,
      });
    }

    return NextResponse.json({
      zekereOmzet: Math.round(zekereOmzet * 100) / 100,
      verwachteOmzetPerMaand: Math.round(verwachteOmzetPerMaand * 100) / 100,
      gemiddeldUurtarief: Math.round(avgUurtarief * 100) / 100,
      restUren: Math.round(restUren * 10) / 10,
      omzetTotNu: Math.round(omzetTotNu * 100) / 100,
      jaardoel: Math.round(jaardoel * 100) / 100,
      benodigdPerMaand: Math.round(benodigdPerMaand * 100) / 100,
      opKoers,
      maanden,
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
