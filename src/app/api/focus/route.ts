import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { focusSessies, projecten, taken } from "@/lib/db/schema";
import { eq, and, between, desc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const { searchParams } = new URL(req.url);
    const van = searchParams.get("van");
    const tot = searchParams.get("tot");

    const conditions: SQL[] = [eq(focusSessies.gebruikerId, gebruiker.id)];
    if (van && tot) {
      conditions.push(between(focusSessies.aangemaaktOp, van, tot));
    }

    const sessies = await db
      .select({
        id: focusSessies.id,
        gebruikerId: focusSessies.gebruikerId,
        projectId: focusSessies.projectId,
        taakId: focusSessies.taakId,
        geplandeDuurMinuten: focusSessies.geplandeDuurMinuten,
        werkelijkeDuurMinuten: focusSessies.werkelijkeDuurMinuten,
        reflectie: focusSessies.reflectie,
        tijdregistratieId: focusSessies.tijdregistratieId,
        status: focusSessies.status,
        aangemaaktOp: focusSessies.aangemaaktOp,
        projectNaam: projecten.naam,
        taakTitel: taken.titel,
      })
      .from(focusSessies)
      .leftJoin(projecten, eq(focusSessies.projectId, projecten.id))
      .leftJoin(taken, eq(focusSessies.taakId, taken.id))
      .where(and(...conditions))
      .orderBy(desc(focusSessies.aangemaaktOp));

    return NextResponse.json({ sessies });
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
    const { projectId, taakId, geplandeDuurMinuten, tijdregistratieId } = body;

    if (!projectId || !geplandeDuurMinuten || !tijdregistratieId) {
      return NextResponse.json(
        { fout: "Project, duur en tijdregistratie zijn verplicht." },
        { status: 400 }
      );
    }

    // Check for existing active session
    const [actief] = await db
      .select({ id: focusSessies.id })
      .from(focusSessies)
      .where(
        and(
          eq(focusSessies.gebruikerId, gebruiker.id),
          eq(focusSessies.status, "actief")
        )
      );

    if (actief) {
      return NextResponse.json(
        { fout: "Er is al een actieve focus sessie." },
        { status: 409 }
      );
    }

    const [sessie] = await db
      .insert(focusSessies)
      .values({
        gebruikerId: gebruiker.id,
        projectId,
        taakId: taakId || null,
        geplandeDuurMinuten,
        tijdregistratieId,
        status: "actief",
      })
      .returning();

    return NextResponse.json({ sessie }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
