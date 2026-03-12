import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals, proposalRegels, klanten } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/proposal/[token] — Public route (no auth)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const [proposal] = await db
      .select({
        id: proposals.id,
        klantId: proposals.klantId,
        klantNaam: klanten.bedrijfsnaam,
        klantContactpersoon: klanten.contactpersoon,
        klantEmail: klanten.email,
        klantAdres: klanten.adres,
        titel: proposals.titel,
        status: proposals.status,
        secties: proposals.secties,
        totaalBedrag: proposals.totaalBedrag,
        geldigTot: proposals.geldigTot,
        token: proposals.token,
        ondertekendOp: proposals.ondertekendOp,
        ondertekendDoor: proposals.ondertekendDoor,
        ondertekening: proposals.ondertekening,
        aangemaaktOp: proposals.aangemaaktOp,
      })
      .from(proposals)
      .innerJoin(klanten, eq(proposals.klantId, klanten.id))
      .where(eq(proposals.token, token));

    if (!proposal) {
      return NextResponse.json({ fout: "Proposal niet gevonden." }, { status: 404 });
    }

    const regels = await db
      .select()
      .from(proposalRegels)
      .where(eq(proposalRegels.proposalId, proposal.id));

    // Update status to "bekeken" if currently "verzonden"
    if (proposal.status === "verzonden") {
      await db
        .update(proposals)
        .set({
          status: "bekeken",
          bijgewerktOp: new Date().toISOString(),
        })
        .where(eq(proposals.id, proposal.id));
      proposal.status = "bekeken";
    }

    return NextResponse.json({ proposal, regels });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
