import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { gewoontes, gewoonteLogboek } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

const STANDAARD_GEWOONTES = [
  { naam: "Sporten", icoon: "Dumbbell", streefwaarde: null },
  { naam: "Lezen", icoon: "BookOpen", streefwaarde: "30 min" },
  { naam: "Content posten", icoon: "Megaphone", streefwaarde: "LinkedIn" },
  { naam: "Netwerken", icoon: "Users", streefwaarde: "1 persoon bereiken" },
  { naam: "Sales", icoon: "Target", streefwaarde: "1 lead opvolgen" },
  { naam: "Leren", icoon: "GraduationCap", streefwaarde: "iets nieuws" },
];

export async function GET() {
  try {
    const gebruiker = await requireAuth();

    const items = db
      .select()
      .from(gewoontes)
      .where(
        and(
          eq(gewoontes.gebruikerId, gebruiker.id),
          eq(gewoontes.isActief, 1)
        )
      )
      .orderBy(gewoontes.volgorde)
      .all();

    // Get today's logs
    const vandaag = new Date().toISOString().slice(0, 10);
    const logs = db
      .select()
      .from(gewoonteLogboek)
      .where(
        and(
          eq(gewoonteLogboek.gebruikerId, gebruiker.id),
          eq(gewoonteLogboek.datum, vandaag)
        )
      )
      .all();

    const logMap = new Map(logs.map((l) => [l.gewoonteId, l]));

    const result = items.map((g) => ({
      ...g,
      voltooidVandaag: logMap.has(g.id) && logMap.get(g.id)!.voltooid === 1,
    }));

    return NextResponse.json({
      gewoontes: result,
      suggesties: items.length === 0 ? STANDAARD_GEWOONTES : [],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Onbekende fout";
    if (msg === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: msg }, { status: 401 });
    }
    return NextResponse.json({ fout: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const body = await req.json();

    const { naam, icoon, frequentie, streefwaarde } = body;
    if (!naam) {
      return NextResponse.json({ fout: "Naam is verplicht" }, { status: 400 });
    }

    // Get max volgorde
    const maxVolgorde = db
      .select({ volgorde: gewoontes.volgorde })
      .from(gewoontes)
      .where(eq(gewoontes.gebruikerId, gebruiker.id))
      .orderBy(gewoontes.volgorde)
      .all();
    const nextVolgorde = maxVolgorde.length > 0
      ? Math.max(...maxVolgorde.map((v) => v.volgorde ?? 0)) + 1
      : 0;

    const result = db
      .insert(gewoontes)
      .values({
        gebruikerId: gebruiker.id,
        naam,
        icoon: icoon || "Target",
        frequentie: frequentie || "dagelijks",
        streefwaarde: streefwaarde || null,
        volgorde: nextVolgorde,
      })
      .returning()
      .get();

    return NextResponse.json({ gewoonte: result }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Onbekende fout";
    if (msg === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: msg }, { status: 401 });
    }
    return NextResponse.json({ fout: msg }, { status: 500 });
  }
}
