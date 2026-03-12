import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { facturen, uitgaven } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, gte, lt, sql } from "drizzle-orm";

function getMonthRange(monthsAgo: number): { start: string; end: string } {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const next = new Date(target.getFullYear(), target.getMonth() + 1, 1);
  return {
    start: target.toISOString().slice(0, 10),
    end: next.toISOString().slice(0, 10),
  };
}

// GET /api/analytics/runway
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const huidigSaldo = Number(searchParams.get("huidigSaldo") || 0);

    // Calculate average monthly costs over last 3 months
    let totaleKosten = 0;
    let totaleInkomsten = 0;
    const maandenMetData = 3;

    for (let i = 1; i <= maandenMetData; i++) {
      const { start, end } = getMonthRange(i);

      const [kostenResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${uitgaven.bedrag}), 0)` })
        .from(uitgaven)
        .where(and(gte(uitgaven.datum, start), lt(uitgaven.datum, end)));

      const [inkomstenResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${facturen.bedragExclBtw}), 0)` })
        .from(facturen)
        .where(
          and(
            eq(facturen.status, "betaald"),
            gte(facturen.betaaldOp, start),
            lt(facturen.betaaldOp, end)
          )
        );

      totaleKosten += kostenResult?.total ?? 0;
      totaleInkomsten += inkomstenResult?.total ?? 0;
    }

    const gemiddeldeKostenPerMaand = Math.round((totaleKosten / maandenMetData) * 100) / 100;
    const gemiddeldeInkomstenPerMaand = Math.round((totaleInkomsten / maandenMetData) * 100) / 100;
    const nettoPerMaand = Math.round((gemiddeldeInkomstenPerMaand - gemiddeldeKostenPerMaand) * 100) / 100;

    // Calculate runway
    let runwayMaanden: number | null = null;
    if (nettoPerMaand < 0) {
      runwayMaanden = Math.floor(huidigSaldo / Math.abs(nettoPerMaand));
    }
    // If netto >= 0, runway is effectively unlimited (null = onbeperkt)

    // 12-month cash projection
    const projectie: { maand: string; saldo: number; inkomsten: number; kosten: number }[] = [];
    let lopendSaldo = huidigSaldo;

    for (let i = 0; i < 12; i++) {
      const target = new Date(new Date().getFullYear(), new Date().getMonth() + i, 1);
      const maandLabel = target.toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
      lopendSaldo += nettoPerMaand;
      projectie.push({
        maand: maandLabel,
        saldo: Math.round(lopendSaldo * 100) / 100,
        inkomsten: gemiddeldeInkomstenPerMaand,
        kosten: gemiddeldeKostenPerMaand,
      });
    }

    return NextResponse.json({
      huidigSaldo,
      gemiddeldeKostenPerMaand,
      gemiddeldeInkomstenPerMaand,
      nettoPerMaand,
      runwayMaanden,
      projectie,
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
