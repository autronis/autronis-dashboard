import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { focusSessies, tijdregistraties } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gebruiker = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { werkelijkeDuurMinuten, reflectie, status } = body;

    const [bestaand] = await db
      .select()
      .from(focusSessies)
      .where(
        and(
          eq(focusSessies.id, Number(id)),
          eq(focusSessies.gebruikerId, gebruiker.id)
        )
      );

    if (!bestaand) {
      return NextResponse.json({ fout: "Sessie niet gevonden." }, { status: 404 });
    }

    const updateData: Partial<typeof focusSessies.$inferInsert> = {};
    if (werkelijkeDuurMinuten !== undefined) updateData.werkelijkeDuurMinuten = werkelijkeDuurMinuten;
    if (reflectie !== undefined) updateData.reflectie = reflectie;
    if (status !== undefined) updateData.status = status;

    const [bijgewerkt] = await db
      .update(focusSessies)
      .set(updateData)
      .where(eq(focusSessies.id, Number(id)))
      .returning();

    return NextResponse.json({ sessie: bijgewerkt });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gebruiker = await requireAuth();
    const { id } = await params;

    const [bestaand] = await db
      .select()
      .from(focusSessies)
      .where(
        and(
          eq(focusSessies.id, Number(id)),
          eq(focusSessies.gebruikerId, gebruiker.id)
        )
      );

    if (!bestaand) {
      return NextResponse.json({ fout: "Sessie niet gevonden." }, { status: 404 });
    }

    // Delete focus session first (has FK to tijdregistratie)
    await db.delete(focusSessies).where(eq(focusSessies.id, Number(id)));

    // Also delete linked tijdregistratie
    if (bestaand.tijdregistratieId) {
      await db.delete(tijdregistraties).where(eq(tijdregistraties.id, bestaand.tijdregistratieId));
    }

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
