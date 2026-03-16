import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { focusSessies, projecten } from "@/lib/db/schema";
import { eq, and, between, inArray } from "drizzle-orm";

function getWeekRange(offset = 0): { van: string; tot: string } {
  const now = new Date();
  const dag = now.getDay();
  const maandag = new Date(now);
  maandag.setDate(now.getDate() - (dag === 0 ? 6 : dag - 1) + offset * 7);
  maandag.setHours(0, 0, 0, 0);
  const zondag = new Date(maandag);
  zondag.setDate(maandag.getDate() + 6);
  zondag.setHours(23, 59, 59, 999);
  return { van: maandag.toISOString(), tot: zondag.toISOString() };
}

function getVandaagRange(): { van: string; tot: string } {
  const now = new Date();
  const van = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  return { van, tot };
}

export async function GET() {
  try {
    const gebruiker = await requireAuth();

    // Vandaag
    const vandaagRange = getVandaagRange();
    const vandaagSessies = await db
      .select({
        werkelijkeDuurMinuten: focusSessies.werkelijkeDuurMinuten,
      })
      .from(focusSessies)
      .where(
        and(
          eq(focusSessies.gebruikerId, gebruiker.id),
          inArray(focusSessies.status, ["voltooid", "afgebroken"]),
          between(focusSessies.aangemaaktOp, vandaagRange.van, vandaagRange.tot)
        )
      );

    const vandaag = {
      sessies: vandaagSessies.length,
      totaleDuurMinuten: vandaagSessies.reduce((sum, s) => sum + (s.werkelijkeDuurMinuten || 0), 0),
    };

    // Deze week per dag
    const weekRange = getWeekRange(0);
    const weekSessies = await db
      .select({
        werkelijkeDuurMinuten: focusSessies.werkelijkeDuurMinuten,
        aangemaaktOp: focusSessies.aangemaaktOp,
      })
      .from(focusSessies)
      .where(
        and(
          eq(focusSessies.gebruikerId, gebruiker.id),
          inArray(focusSessies.status, ["voltooid", "afgebroken"]),
          between(focusSessies.aangemaaktOp, weekRange.van, weekRange.tot)
        )
      );

    const weekMap = new Map<string, number>();
    for (const s of weekSessies) {
      if (!s.aangemaaktOp) continue;
      const dag = s.aangemaaktOp.substring(0, 10);
      weekMap.set(dag, (weekMap.get(dag) || 0) + (s.werkelijkeDuurMinuten || 0));
    }

    // Generate all 7 days
    const week: Array<{ dag: string; duurMinuten: number }> = [];
    const maandag = new Date(weekRange.van);
    for (let i = 0; i < 7; i++) {
      const d = new Date(maandag);
      d.setDate(maandag.getDate() + i);
      const dagStr = d.toISOString().substring(0, 10);
      week.push({ dag: dagStr, duurMinuten: weekMap.get(dagStr) || 0 });
    }

    // Vorige week totaal
    const vorigeWeekRange = getWeekRange(-1);
    const vorigeWeekSessies = await db
      .select({
        werkelijkeDuurMinuten: focusSessies.werkelijkeDuurMinuten,
      })
      .from(focusSessies)
      .where(
        and(
          eq(focusSessies.gebruikerId, gebruiker.id),
          inArray(focusSessies.status, ["voltooid", "afgebroken"]),
          between(focusSessies.aangemaaktOp, vorigeWeekRange.van, vorigeWeekRange.tot)
        )
      );

    const vorigeWeek = {
      totaleDuurMinuten: vorigeWeekSessies.reduce((sum, s) => sum + (s.werkelijkeDuurMinuten || 0), 0),
    };

    // Streak — count consecutive days with at least 1 session (max 365 days lookback)
    const streakLookback = new Date();
    streakLookback.setDate(streakLookback.getDate() - 365);
    const alleSessies = await db
      .select({ aangemaaktOp: focusSessies.aangemaaktOp })
      .from(focusSessies)
      .where(
        and(
          eq(focusSessies.gebruikerId, gebruiker.id),
          inArray(focusSessies.status, ["voltooid", "afgebroken"]),
          between(focusSessies.aangemaaktOp, streakLookback.toISOString(), new Date().toISOString())
        )
      );

    const dagenMetSessie = new Set(
      alleSessies.map((s) => s.aangemaaktOp?.substring(0, 10)).filter(Boolean)
    );

    let streak = 0;
    const vandaagStr = new Date().toISOString().substring(0, 10);
    const checkDag = new Date(vandaagStr);
    while (dagenMetSessie.has(checkDag.toISOString().substring(0, 10))) {
      streak++;
      checkDag.setDate(checkDag.getDate() - 1);
    }

    // Per project
    const perProjectSessies = await db
      .select({
        projectId: focusSessies.projectId,
        projectNaam: projecten.naam,
        werkelijkeDuurMinuten: focusSessies.werkelijkeDuurMinuten,
      })
      .from(focusSessies)
      .leftJoin(projecten, eq(focusSessies.projectId, projecten.id))
      .where(
        and(
          eq(focusSessies.gebruikerId, gebruiker.id),
          inArray(focusSessies.status, ["voltooid", "afgebroken"]),
          between(focusSessies.aangemaaktOp, weekRange.van, weekRange.tot)
        )
      );

    const projectMap = new Map<number, { projectNaam: string; duurMinuten: number; sessies: number }>();
    for (const s of perProjectSessies) {
      if (!s.projectId) continue;
      const bestaand = projectMap.get(s.projectId);
      if (bestaand) {
        bestaand.duurMinuten += s.werkelijkeDuurMinuten || 0;
        bestaand.sessies++;
      } else {
        projectMap.set(s.projectId, {
          projectNaam: s.projectNaam || "Onbekend",
          duurMinuten: s.werkelijkeDuurMinuten || 0,
          sessies: 1,
        });
      }
    }

    const perProject = Array.from(projectMap.entries()).map(([projectId, data]) => ({
      projectId,
      ...data,
    }));

    return NextResponse.json({ vandaag, week, vorigeWeek, streak, perProject });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
