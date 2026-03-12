import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kilometerRegistraties, klanten, projecten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, sql, gte, lte } from "drizzle-orm";

// GET /api/kilometers/export — Export CSV
export async function GET(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const { searchParams } = new URL(req.url);
    const maand = searchParams.get("maand");
    const jaar = searchParams.get("jaar");

    const conditions = [eq(kilometerRegistraties.gebruikerId, gebruiker.id)];

    if (maand && jaar) {
      const startDatum = `${jaar}-${maand.padStart(2, "0")}-01`;
      const endMonth = parseInt(maand);
      const endYear = parseInt(jaar);
      const nextMonth = endMonth === 12 ? 1 : endMonth + 1;
      const nextYear = endMonth === 12 ? endYear + 1 : endYear;
      const eindDatum = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
      conditions.push(gte(kilometerRegistraties.datum, startDatum));
      conditions.push(lte(kilometerRegistraties.datum, eindDatum));
    } else if (jaar) {
      conditions.push(gte(kilometerRegistraties.datum, `${jaar}-01-01`));
      conditions.push(lte(kilometerRegistraties.datum, `${jaar}-12-31`));
    }

    const lijst = await db
      .select({
        datum: kilometerRegistraties.datum,
        vanLocatie: kilometerRegistraties.vanLocatie,
        naarLocatie: kilometerRegistraties.naarLocatie,
        kilometers: kilometerRegistraties.kilometers,
        zakelijkDoel: kilometerRegistraties.zakelijkDoel,
        tariefPerKm: kilometerRegistraties.tariefPerKm,
        klantNaam: klanten.bedrijfsnaam,
        projectNaam: projecten.naam,
      })
      .from(kilometerRegistraties)
      .leftJoin(klanten, eq(kilometerRegistraties.klantId, klanten.id))
      .leftJoin(projecten, eq(kilometerRegistraties.projectId, projecten.id))
      .where(and(...conditions))
      .orderBy(sql`${kilometerRegistraties.datum} ASC`);

    const header = "Datum,Van,Naar,Kilometers,Doel,Klant,Project,Bedrag";
    const rows = lijst.map((r) => {
      const bedrag = (r.kilometers * (r.tariefPerKm ?? 0.23)).toFixed(2);
      return [
        r.datum,
        `"${(r.vanLocatie || "").replace(/"/g, '""')}"`,
        `"${(r.naarLocatie || "").replace(/"/g, '""')}"`,
        r.kilometers.toString(),
        `"${(r.zakelijkDoel || "").replace(/"/g, '""')}"`,
        `"${(r.klantNaam || "").replace(/"/g, '""')}"`,
        `"${(r.projectNaam || "").replace(/"/g, '""')}"`,
        bedrag,
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    const filename = maand && jaar
      ? `kilometers-${jaar}-${maand.padStart(2, "0")}.csv`
      : jaar
        ? `kilometers-${jaar}.csv`
        : "kilometers-export.csv";

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
