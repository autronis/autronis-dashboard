import { db } from "@/lib/db";
import { screenTimeEntries, projecten, klanten } from "@/lib/db/schema";
import { eq, and, sql, asc } from "drizzle-orm";

const SKIP_APPS = new Set(["LockApp", "SearchHost", "ShellHost", "ShellExperienceHost", "Inactief"]);
const SLOT_MS = 30 * 60 * 1000; // 30 min

/**
 * Calculate active screen time hours for a date range using the same
 * 30-min slot merging logic as the Tijd page's sessies API.
 * Returns hours (not minutes or seconds).
 */
export async function berekenActieveUren(
  gebruikerId: number,
  vanDatum: string,
  totDatum: string
): Promise<number> {
  // Get all dates in range that have entries
  const dagenResult = await db
    .select({ dag: sql<string>`SUBSTR(${screenTimeEntries.startTijd}, 1, 10)` })
    .from(screenTimeEntries)
    .where(and(
      eq(screenTimeEntries.gebruikerId, gebruikerId),
      sql`SUBSTR(${screenTimeEntries.startTijd}, 1, 10) >= ${vanDatum}`,
      sql`SUBSTR(${screenTimeEntries.startTijd}, 1, 10) <= ${totDatum}`,
    ))
    .groupBy(sql`SUBSTR(${screenTimeEntries.startTijd}, 1, 10)`)
    .all();

  let totaalSeconden = 0;

  for (const { dag } of dagenResult) {
    const entries = await db
      .select({
        app: screenTimeEntries.app,
        categorie: screenTimeEntries.categorie,
        startTijd: screenTimeEntries.startTijd,
        eindTijd: screenTimeEntries.eindTijd,
        duurSeconden: screenTimeEntries.duurSeconden,
      })
      .from(screenTimeEntries)
      .where(and(
        eq(screenTimeEntries.gebruikerId, gebruikerId),
        sql`SUBSTR(${screenTimeEntries.startTijd}, 1, 10) = ${dag}`,
      ))
      .orderBy(asc(screenTimeEntries.startTijd))
      .all();

    // Filter same as sessies API
    const active = entries.filter(e => !SKIP_APPS.has(e.app) && e.categorie !== "inactief");
    if (active.length === 0) continue;

    // Group into 30-min slots
    const firstTime = new Date(active[0].startTijd).getTime();
    const lastTime = new Date(active[active.length - 1].eindTijd).getTime();
    const slotStart = Math.floor(firstTime / SLOT_MS) * SLOT_MS;

    let t = slotStart;
    while (t < lastTime) {
      const tEnd = t + SLOT_MS;
      const slotEntries = active.filter(e => {
        const eTime = new Date(e.startTijd).getTime();
        return eTime >= t && eTime < tEnd;
      });

      if (slotEntries.length > 0) {
        // Same as sessies API: use time span from first to last entry in slot
        const sessieStart = new Date(slotEntries[0].startTijd).getTime();
        const sessieEnd = new Date(slotEntries[slotEntries.length - 1].eindTijd).getTime();
        totaalSeconden += Math.max(0, (sessieEnd - sessieStart) / 1000);
      }

      t = tEnd;
    }
  }

  return Math.round((totaalSeconden / 3600) * 100) / 100;
}
