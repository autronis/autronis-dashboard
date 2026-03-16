import { NextResponse } from "next/server";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { gewoontes, gewoonteLogboek } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getMonthStart(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function GET() {
  try {
    const gebruiker = await requireAuth();

    const actieveGewoontes = db
      .select()
      .from(gewoontes)
      .where(
        and(eq(gewoontes.gebruikerId, gebruiker.id), eq(gewoontes.isActief, 1))
      )
      .all();

    if (actieveGewoontes.length === 0) {
      return NextResponse.json({
        statistieken: [],
        weekCompletionRate: 0,
        maandCompletionRate: 0,
      });
    }

    const nu = new Date();
    const weekStart = getWeekStart(nu);
    const maandStart = getMonthStart(nu);

    // Get all logs for the past year (for heatmap + streaks)
    const jaarGeleden = new Date(nu);
    jaarGeleden.setFullYear(jaarGeleden.getFullYear() - 1);
    const vanDatum = jaarGeleden.toISOString().slice(0, 10);
    const totDatum = nu.toISOString().slice(0, 10);

    const alleLogs = db
      .select()
      .from(gewoonteLogboek)
      .where(
        and(
          eq(gewoonteLogboek.gebruikerId, gebruiker.id),
          gte(gewoonteLogboek.datum, vanDatum),
          lte(gewoonteLogboek.datum, totDatum),
          eq(gewoonteLogboek.voltooid, 1)
        )
      )
      .all();

    // Calculate per-habit statistics
    const statistieken = actieveGewoontes.map((gewoonte) => {
      const habitLogs = alleLogs
        .filter((l) => l.gewoonteId === gewoonte.id)
        .map((l) => l.datum)
        .sort();

      // Current streak
      let huidigeStreak = 0;
      const vandaag = nu.toISOString().slice(0, 10);
      let checkDatum = new Date(vandaag);

      while (true) {
        const datumStr = checkDatum.toISOString().slice(0, 10);
        if (habitLogs.includes(datumStr)) {
          huidigeStreak++;
          checkDatum.setDate(checkDatum.getDate() - 1);
        } else if (datumStr === vandaag) {
          // Today not yet done is ok, check yesterday
          checkDatum.setDate(checkDatum.getDate() - 1);
        } else {
          break;
        }
      }

      // Longest streak
      let langsteStreak = 0;
      let currentRun = 0;
      const sortedDates = [...new Set(habitLogs)].sort();
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          currentRun = 1;
        } else {
          const prev = new Date(sortedDates[i - 1]);
          const curr = new Date(sortedDates[i]);
          const diffDays = Math.round(
            (curr.getTime() - prev.getTime()) / 86400000
          );
          if (diffDays === 1) {
            currentRun++;
          } else {
            currentRun = 1;
          }
        }
        langsteStreak = Math.max(langsteStreak, currentRun);
      }

      // Week completion
      const weekLogs = habitLogs.filter((d) => d >= weekStart);

      // Month completion
      const maandLogs = habitLogs.filter((d) => d >= maandStart);

      // Heatmap data (last 365 days)
      const heatmap: Record<string, number> = {};
      for (const datum of habitLogs) {
        heatmap[datum] = (heatmap[datum] || 0) + 1;
      }

      // Best day of week
      const dagTelling: Record<number, number> = {};
      for (const datum of habitLogs) {
        const dag = new Date(datum).getDay();
        dagTelling[dag] = (dagTelling[dag] || 0) + 1;
      }
      const dagNamen = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
      let besteDag = "-";
      let maxDagCount = 0;
      for (const [dag, count] of Object.entries(dagTelling)) {
        if (count > maxDagCount) {
          maxDagCount = count;
          besteDag = dagNamen[Number(dag)];
        }
      }

      // Worst day (for AI tips)
      let slechteDag = "-";
      let minDagCount = Infinity;
      for (let d = 0; d < 7; d++) {
        const count = dagTelling[d] || 0;
        if (count < minDagCount) {
          minDagCount = count;
          slechteDag = dagNamen[d];
        }
      }

      // Days since creation
      const aantalDagen = Math.max(
        1,
        Math.ceil(
          (nu.getTime() - new Date(gewoonte.aangemaaktOp || vanDatum).getTime()) / 86400000
        )
      );
      const completionRate = Math.round((sortedDates.length / aantalDagen) * 100);

      return {
        id: gewoonte.id,
        naam: gewoonte.naam,
        icoon: gewoonte.icoon,
        huidigeStreak,
        langsteStreak,
        weekVoltooid: weekLogs.length,
        maandVoltooid: maandLogs.length,
        totaalVoltooid: sortedDates.length,
        completionRate,
        besteDag,
        slechteDag,
        heatmap,
      };
    });

    // Overall rates
    const vandaagStr = nu.toISOString().slice(0, 10);
    const dagenInWeek = Math.max(
      1,
      Math.min(
        7,
        Math.ceil((nu.getTime() - new Date(weekStart).getTime()) / 86400000) + 1
      )
    );
    const dagenInMaand = Math.max(
      1,
      Math.min(
        31,
        Math.ceil((nu.getTime() - new Date(maandStart).getTime()) / 86400000) + 1
      )
    );

    const weekTotaal = statistieken.reduce((s, h) => s + h.weekVoltooid, 0);
    const maandTotaal = statistieken.reduce((s, h) => s + h.maandVoltooid, 0);

    const weekCompletionRate = Math.round(
      (weekTotaal / (actieveGewoontes.length * dagenInWeek)) * 100
    );
    const maandCompletionRate = Math.round(
      (maandTotaal / (actieveGewoontes.length * dagenInMaand)) * 100
    );

    return NextResponse.json({
      statistieken,
      weekCompletionRate,
      maandCompletionRate,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Onbekende fout";
    if (msg === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: msg }, { status: 401 });
    }
    return NextResponse.json({ fout: msg }, { status: 500 });
  }
}
