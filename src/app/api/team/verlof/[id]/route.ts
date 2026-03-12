import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verlof } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

// PUT /api/team/verlof/[id] — status bijwerken (goedkeuren/afwijzen)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gebruiker = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["goedgekeurd", "afgewezen"].includes(status)) {
      return NextResponse.json(
        { fout: "Status moet 'goedgekeurd' of 'afgewezen' zijn." },
        { status: 400 }
      );
    }

    // Check that the verlof entry exists
    const [bestaand] = await db
      .select()
      .from(verlof)
      .where(eq(verlof.id, Number(id)));

    if (!bestaand) {
      return NextResponse.json({ fout: "Verlof niet gevonden." }, { status: 404 });
    }

    // Only the OTHER user (compagnon) can approve/reject
    if (bestaand.gebruikerId === gebruiker.id) {
      return NextResponse.json(
        { fout: "Je kunt je eigen verlof niet goedkeuren of afwijzen." },
        { status: 403 }
      );
    }

    const [bijgewerkt] = await db
      .update(verlof)
      .set({
        status: status as "goedgekeurd" | "afgewezen",
        beoordeeldDoor: gebruiker.id,
      })
      .where(eq(verlof.id, Number(id)))
      .returning();

    return NextResponse.json({ verlof: bijgewerkt });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
