import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, gebruikers } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

// GET: List audit log entries with filters
export async function GET(req: NextRequest): Promise<NextResponse> {
  await requireAuth();

  const { searchParams } = new URL(req.url);
  const gebruikerId = searchParams.get("gebruikerId");
  const actie = searchParams.get("actie");
  const entiteitType = searchParams.get("entiteitType");
  const vanDatum = searchParams.get("van");
  const totDatum = searchParams.get("tot");
  const limiet = parseInt(searchParams.get("limiet") || "100");
  const offset = parseInt(searchParams.get("offset") || "0");

  const conditions = [];
  if (gebruikerId) conditions.push(eq(auditLog.gebruikerId, parseInt(gebruikerId)));
  if (actie) conditions.push(eq(auditLog.actie, actie as "aangemaakt" | "bijgewerkt" | "verwijderd" | "ingelogd" | "uitgelogd" | "wachtwoord_gewijzigd" | "2fa_ingeschakeld" | "2fa_uitgeschakeld" | "verzonden" | "betaald" | "geaccepteerd"));
  if (entiteitType) conditions.push(eq(auditLog.entiteitType, entiteitType));
  if (vanDatum) conditions.push(gte(auditLog.aangemaaktOp, vanDatum));
  if (totDatum) conditions.push(lte(auditLog.aangemaaktOp, totDatum));

  const query = db
    .select({
      id: auditLog.id,
      gebruikerId: auditLog.gebruikerId,
      gebruikerNaam: gebruikers.naam,
      actie: auditLog.actie,
      entiteitType: auditLog.entiteitType,
      entiteitId: auditLog.entiteitId,
      oudeWaarde: auditLog.oudeWaarde,
      nieuweWaarde: auditLog.nieuweWaarde,
      ipAdres: auditLog.ipAdres,
      aangemaaktOp: auditLog.aangemaaktOp,
    })
    .from(auditLog)
    .leftJoin(gebruikers, eq(auditLog.gebruikerId, gebruikers.id))
    .orderBy(desc(auditLog.aangemaaktOp))
    .limit(limiet)
    .offset(offset);

  if (conditions.length > 0) {
    const logs = await query.where(and(...conditions));
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(and(...conditions));
    return NextResponse.json({ logs, totaal: countResult?.count || 0 });
  }

  const logs = await query;
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLog);

  return NextResponse.json({ logs, totaal: countResult?.count || 0 });
}

// POST: Create audit log entry (internal use + CSV export)
export async function POST(req: NextRequest): Promise<NextResponse> {
  await requireAuth();

  const { searchParams } = new URL(req.url);
  if (searchParams.get("export") === "csv") {
    // Export as CSV
    const logs = await db
      .select({
        id: auditLog.id,
        gebruikerNaam: gebruikers.naam,
        actie: auditLog.actie,
        entiteitType: auditLog.entiteitType,
        entiteitId: auditLog.entiteitId,
        ipAdres: auditLog.ipAdres,
        aangemaaktOp: auditLog.aangemaaktOp,
      })
      .from(auditLog)
      .leftJoin(gebruikers, eq(auditLog.gebruikerId, gebruikers.id))
      .orderBy(desc(auditLog.aangemaaktOp))
      .limit(10000);

    const header = "ID,Gebruiker,Actie,Entiteit Type,Entiteit ID,IP Adres,Datum\n";
    const rows = logs
      .map(
        (l) =>
          `${l.id},"${l.gebruikerNaam || ""}","${l.actie}","${l.entiteitType}",${l.entiteitId || ""},"${l.ipAdres || ""}","${l.aangemaaktOp || ""}"`
      )
      .join("\n");

    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ fout: "Gebruik ?export=csv voor export." }, { status: 400 });
}
