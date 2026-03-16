import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentProfiel } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

const defaults = [
  { onderwerp: "over_ons", inhoud: "Autronis is een AI- en automatiseringsbureau..." },
  { onderwerp: "diensten", inhoud: "Workflow automatisering, AI integraties, systeem integraties, data & dashboards" },
  { onderwerp: "usps", inhoud: "" },
  { onderwerp: "tone_of_voice", inhoud: "Professioneel maar toegankelijk, concreet, Nederlands, geen jargon" },
];

export async function GET() {
  try {
    const gebruiker = await requireAuth();

    let entries = await db.select().from(contentProfiel).orderBy(contentProfiel.id);

    if (entries.length === 0) {
      await db.insert(contentProfiel).values(
        defaults.map((d) => ({ ...d, bijgewerktDoor: gebruiker.id }))
      );
      entries = await db.select().from(contentProfiel).orderBy(contentProfiel.id);
    }

    return NextResponse.json({ profiel: entries });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const body = await req.json() as { id?: number; onderwerp: string; inhoud: string };

    if (!body.onderwerp?.trim()) {
      return NextResponse.json({ fout: "Onderwerp is verplicht." }, { status: 400 });
    }

    if (body.id !== undefined) {
      await db
        .update(contentProfiel)
        .set({
          inhoud: body.inhoud,
          bijgewerktDoor: gebruiker.id,
          bijgewerktOp: new Date().toISOString(),
        })
        .where(eq(contentProfiel.id, body.id));
    } else {
      const existing = await db
        .select()
        .from(contentProfiel)
        .where(eq(contentProfiel.onderwerp, body.onderwerp))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(contentProfiel)
          .set({
            inhoud: body.inhoud,
            bijgewerktDoor: gebruiker.id,
            bijgewerktOp: new Date().toISOString(),
          })
          .where(eq(contentProfiel.onderwerp, body.onderwerp));
      } else {
        await db.insert(contentProfiel).values({
          onderwerp: body.onderwerp,
          inhoud: body.inhoud,
          bijgewerktDoor: gebruiker.id,
        });
      }
    }

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
