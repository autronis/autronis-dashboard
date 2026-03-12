import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals, notificaties, gebruikers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/proposal/[token]/sign — Public route (no auth)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();

    const { naam, type, data } = body;

    if (!naam?.trim()) {
      return NextResponse.json({ fout: "Naam is verplicht." }, { status: 400 });
    }
    if (!type || !["tekening", "getypt"].includes(type)) {
      return NextResponse.json({ fout: "Ongeldig ondertekeningstype." }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ fout: "Ondertekeningsdata is verplicht." }, { status: 400 });
    }

    const [proposal] = await db
      .select({
        id: proposals.id,
        status: proposals.status,
        titel: proposals.titel,
      })
      .from(proposals)
      .where(eq(proposals.token, token));

    if (!proposal) {
      return NextResponse.json({ fout: "Proposal niet gevonden." }, { status: 404 });
    }

    if (proposal.status === "ondertekend") {
      return NextResponse.json(
        { fout: "Dit voorstel is al ondertekend." },
        { status: 400 }
      );
    }

    if (proposal.status === "afgewezen") {
      return NextResponse.json(
        { fout: "Dit voorstel is afgewezen." },
        { status: 400 }
      );
    }

    const nu = new Date().toISOString();

    // Save signature
    await db
      .update(proposals)
      .set({
        status: "ondertekend",
        ondertekendOp: nu,
        ondertekendDoor: naam.trim(),
        ondertekening: JSON.stringify({ type, data, naam: naam.trim() }),
        bijgewerktOp: nu,
      })
      .where(eq(proposals.id, proposal.id));

    // Create notification for all Autronis users
    const alleGebruikers = await db
      .select({ id: gebruikers.id })
      .from(gebruikers);

    for (const g of alleGebruikers) {
      await db.insert(notificaties).values({
        gebruikerId: g.id,
        type: "proposal_ondertekend",
        titel: "Proposal ondertekend",
        omschrijving: `"${proposal.titel}" is ondertekend door ${naam.trim()}.`,
        link: `/proposals/${proposal.id}`,
      });
    }

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
