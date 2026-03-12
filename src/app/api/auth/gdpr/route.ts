import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  klanten, projecten, facturen, factuurRegels, tijdregistraties,
  taken, notities, documenten, leads, verwerkingsregister,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

// GET: Export all data for a specific klant (GDPR data export)
export async function GET(req: NextRequest): Promise<NextResponse> {
  await requireAuth();

  const { searchParams } = new URL(req.url);
  const klantId = searchParams.get("klantId");
  const type = searchParams.get("type"); // "export" or "register"

  if (type === "register") {
    const register = await db.select().from(verwerkingsregister);
    return NextResponse.json({ register });
  }

  if (!klantId) {
    return NextResponse.json({ fout: "klantId is verplicht." }, { status: 400 });
  }

  const id = parseInt(klantId);

  // Gather all klant data
  const [klant] = await db.select().from(klanten).where(eq(klanten.id, id)).limit(1);
  if (!klant) {
    return NextResponse.json({ fout: "Klant niet gevonden." }, { status: 404 });
  }

  const klantProjecten = await db.select().from(projecten).where(eq(projecten.klantId, id));
  const projectIds = klantProjecten.map((p) => p.id);

  const klantFacturen = await db.select().from(facturen).where(eq(facturen.klantId, id));
  const factuurIds = klantFacturen.map((f) => f.id);

  let klantFactuurRegels: (typeof factuurRegels.$inferSelect)[] = [];
  for (const fId of factuurIds) {
    const regels = await db.select().from(factuurRegels).where(eq(factuurRegels.factuurId, fId));
    klantFactuurRegels = [...klantFactuurRegels, ...regels];
  }

  let klantTijdregistraties: (typeof tijdregistraties.$inferSelect)[] = [];
  for (const pId of projectIds) {
    const regs = await db.select().from(tijdregistraties).where(eq(tijdregistraties.projectId, pId));
    klantTijdregistraties = [...klantTijdregistraties, ...regs];
  }

  let klantTaken: (typeof taken.$inferSelect)[] = [];
  for (const pId of projectIds) {
    const t = await db.select().from(taken).where(eq(taken.projectId, pId));
    klantTaken = [...klantTaken, ...t];
  }

  const klantNotities = await db.select().from(notities).where(eq(notities.klantId, id));
  const klantDocumenten = await db.select().from(documenten).where(eq(documenten.klantId, id));
  const klantLeads = await db.select().from(leads).where(eq(leads.bedrijfsnaam, klant.bedrijfsnaam));

  const exportData = {
    exportDatum: new Date().toISOString(),
    klant,
    projecten: klantProjecten,
    facturen: klantFacturen,
    factuurRegels: klantFactuurRegels,
    tijdregistraties: klantTijdregistraties,
    taken: klantTaken,
    notities: klantNotities,
    documenten: klantDocumenten,
    leads: klantLeads,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gdpr-export-${klant.bedrijfsnaam.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

// POST: "Vergeet mij" - anonymize klant data
export async function POST(req: NextRequest): Promise<NextResponse> {
  await requireAuth();

  let body: { klantId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  if (!body.klantId) {
    return NextResponse.json({ fout: "klantId is verplicht." }, { status: 400 });
  }

  const id = body.klantId;

  // Anonymize klant data
  await db
    .update(klanten)
    .set({
      bedrijfsnaam: `[Geanonimiseerd ${id}]`,
      contactpersoon: null,
      email: null,
      telefoon: null,
      adres: null,
      notities: null,
      isActief: 0,
    })
    .where(eq(klanten.id, id));

  // Anonymize related notities
  await db
    .delete(notities)
    .where(eq(notities.klantId, id));

  return NextResponse.json({ succes: true });
}

// PUT: Manage verwerkingsregister
export async function PUT(req: NextRequest): Promise<NextResponse> {
  await requireAuth();

  let body: {
    verwerkingsdoel?: string;
    categorieGegevens?: string;
    bewaartermijn?: string;
    rechtsgrond?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  if (!body.verwerkingsdoel || !body.categorieGegevens) {
    return NextResponse.json({ fout: "Verwerkingsdoel en categorie zijn verplicht." }, { status: 400 });
  }

  const [nieuw] = await db
    .insert(verwerkingsregister)
    .values({
      verwerkingsdoel: body.verwerkingsdoel,
      categorieGegevens: body.categorieGegevens,
      bewaartermijn: body.bewaartermijn || null,
      rechtsgrond: body.rechtsgrond || null,
    })
    .returning();

  return NextResponse.json({ register: nieuw });
}
