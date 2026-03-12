import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { onkostenDeclaraties } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

// PUT /api/team/declaraties/[id] — status bijwerken
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gebruiker = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["goedgekeurd", "afgewezen", "uitbetaald"].includes(status)) {
      return NextResponse.json(
        { fout: "Status moet 'goedgekeurd', 'afgewezen' of 'uitbetaald' zijn." },
        { status: 400 }
      );
    }

    const [bestaand] = await db
      .select()
      .from(onkostenDeclaraties)
      .where(eq(onkostenDeclaraties.id, Number(id)));

    if (!bestaand) {
      return NextResponse.json({ fout: "Declaratie niet gevonden." }, { status: 404 });
    }

    // Only the OTHER user can approve/reject
    if (bestaand.gebruikerId === gebruiker.id && status !== "uitbetaald") {
      return NextResponse.json(
        { fout: "Je kunt je eigen declaratie niet goedkeuren of afwijzen." },
        { status: 403 }
      );
    }

    const [bijgewerkt] = await db
      .update(onkostenDeclaraties)
      .set({
        status: status as "goedgekeurd" | "afgewezen" | "uitbetaald",
        beoordeeldDoor: gebruiker.id,
      })
      .where(eq(onkostenDeclaraties.id, Number(id)))
      .returning();

    return NextResponse.json({ declaratie: bijgewerkt });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
