import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { secondBrainItems } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const tag = searchParams.get("tag");
    const zoek = searchParams.get("zoek");
    const favoriet = searchParams.get("favoriet");
    const gearchiveerd = searchParams.get("gearchiveerd");
    const limiet = searchParams.get("limiet");

    const conditions = [
      eq(secondBrainItems.gebruikerId, gebruiker.id),
      eq(secondBrainItems.isGearchiveerd, gearchiveerd === "1" ? 1 : 0),
    ];

    if (type && type !== "alle") {
      conditions.push(
        eq(
          secondBrainItems.type,
          type as "tekst" | "url" | "afbeelding" | "pdf" | "code"
        )
      );
    }
    if (favoriet === "1") {
      conditions.push(eq(secondBrainItems.isFavoriet, 1));
    }
    if (zoek) {
      conditions.push(
        sql`(${secondBrainItems.titel} LIKE ${`%${zoek}%`} OR ${secondBrainItems.inhoud} LIKE ${`%${zoek}%`} OR ${secondBrainItems.aiSamenvatting} LIKE ${`%${zoek}%`})`
      );
    }

    const query = db
      .select()
      .from(secondBrainItems)
      .where(and(...conditions))
      .orderBy(desc(secondBrainItems.aangemaaktOp));

    const items = limiet
      ? await query.limit(Number(limiet)).all()
      : await query.all();

    // Filter by tag in application layer (JSON field)
    const gefilterd = tag
      ? items.filter((item) => {
          try {
            const tags: string[] = item.aiTags ? JSON.parse(item.aiTags) : [];
            return tags.includes(tag);
          } catch { return false; }
        })
      : items;

    // KPIs
    const alleItems = await db
      .select({ type: secondBrainItems.type, id: secondBrainItems.id })
      .from(secondBrainItems)
      .where(
        and(
          eq(secondBrainItems.gebruikerId, gebruiker.id),
          eq(secondBrainItems.isGearchiveerd, 0)
        )
      )
      .all();

    const eenWeekGeleden = new Date();
    eenWeekGeleden.setDate(eenWeekGeleden.getDate() - 7);
    const dezeWeek = await db
      .select({ id: secondBrainItems.id })
      .from(secondBrainItems)
      .where(
        and(
          eq(secondBrainItems.gebruikerId, gebruiker.id),
          eq(secondBrainItems.isGearchiveerd, 0),
          sql`${secondBrainItems.aangemaaktOp} >= ${eenWeekGeleden.toISOString()}`
        )
      )
      .all();

    const perType: Record<string, number> = {};
    for (const item of alleItems) {
      perType[item.type] = (perType[item.type] || 0) + 1;
    }

    return NextResponse.json({
      items: gefilterd,
      kpis: {
        totaal: alleItems.length,
        dezeWeek: dezeWeek.length,
        perType,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const body = await req.json();
    const { type, titel, inhoud, taal, bronUrl } = body;

    if (!type) {
      return NextResponse.json({ fout: "Type is verplicht" }, { status: 400 });
    }

    const [item] = await db
      .insert(secondBrainItems)
      .values({
        gebruikerId: gebruiker.id,
        type,
        titel: titel || null,
        inhoud: inhoud || null,
        taal: taal || null,
        bronUrl: bronUrl || null,
      })
      .returning();

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
