import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uitgaven } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, sql, gte, lte, like } from "drizzle-orm";

// GET /api/uitgaven — List uitgaven with filters
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const categorie = searchParams.get("categorie");
    const maand = searchParams.get("maand");
    const jaar = searchParams.get("jaar") || new Date().getFullYear().toString();

    const conditions: ReturnType<typeof eq>[] = [];

    if (categorie && categorie !== "alle") {
      conditions.push(eq(uitgaven.categorie, categorie as typeof uitgaven.categorie.enumValues[number]));
    }

    if (maand) {
      const startDatum = `${jaar}-${maand.padStart(2, "0")}-01`;
      const endMonth = parseInt(maand);
      const endYear = parseInt(jaar);
      const nextMonth = endMonth === 12 ? 1 : endMonth + 1;
      const nextYear = endMonth === 12 ? endYear + 1 : endYear;
      const eindDatum = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
      conditions.push(gte(uitgaven.datum, startDatum));
      conditions.push(lte(uitgaven.datum, eindDatum));
    } else {
      conditions.push(gte(uitgaven.datum, `${jaar}-01-01`));
      conditions.push(lte(uitgaven.datum, `${jaar}-12-31`));
    }

    const lijst = await db
      .select()
      .from(uitgaven)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${uitgaven.datum} DESC`);

    // Calculate total deductible for the year
    const [aftrekbaarResult] = await db
      .select({
        totaal: sql<number>`coalesce(sum(${uitgaven.bedrag}), 0)`,
      })
      .from(uitgaven)
      .where(
        and(
          eq(uitgaven.fiscaalAftrekbaar, 1),
          gte(uitgaven.datum, `${jaar}-01-01`),
          lte(uitgaven.datum, `${jaar}-12-31`)
        )
      );

    // Total BTW paid this year
    const [btwResult] = await db
      .select({
        totaal: sql<number>`coalesce(sum(${uitgaven.btwBedrag}), 0)`,
      })
      .from(uitgaven)
      .where(
        and(
          gte(uitgaven.datum, `${jaar}-01-01`),
          lte(uitgaven.datum, `${jaar}-12-31`)
        )
      );

    const totaalUitgaven = lijst.reduce((sum, u) => sum + u.bedrag, 0);

    return NextResponse.json({
      uitgaven: lijst,
      totaalUitgaven,
      totaalAftrekbaar: aftrekbaarResult?.totaal ?? 0,
      totaalBtw: btwResult?.totaal ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// POST /api/uitgaven — Create uitgave
export async function POST(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const body = await req.json();

    const {
      omschrijving,
      bedrag,
      datum,
      categorie,
      leverancier,
      btwBedrag,
      btwPercentage,
      fiscaalAftrekbaar,
      bonnetjeUrl,
    } = body;

    if (!omschrijving?.trim() || !bedrag || !datum) {
      return NextResponse.json(
        { fout: "Omschrijving, bedrag en datum zijn verplicht." },
        { status: 400 }
      );
    }

    if (parseFloat(bedrag) <= 0) {
      return NextResponse.json({ fout: "Bedrag moet positief zijn." }, { status: 400 });
    }

    const [nieuw] = await db
      .insert(uitgaven)
      .values({
        omschrijving: omschrijving.trim(),
        bedrag: parseFloat(bedrag),
        datum,
        categorie: categorie || "overig",
        leverancier: leverancier?.trim() || null,
        btwBedrag: btwBedrag ? parseFloat(btwBedrag) : null,
        btwPercentage: btwPercentage ? parseFloat(btwPercentage) : 21,
        fiscaalAftrekbaar: fiscaalAftrekbaar === false ? 0 : 1,
        bonnetjeUrl: bonnetjeUrl?.trim() || null,
        aangemaaktDoor: gebruiker.id,
      })
      .returning();

    return NextResponse.json({ uitgave: nieuw }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
