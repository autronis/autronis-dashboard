import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals, klanten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

// POST /api/proposals/[id]/verstuur
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { fout: "E-mail is niet geconfigureerd. Stel RESEND_API_KEY in." },
        { status: 500 }
      );
    }

    const [proposal] = await db
      .select({
        id: proposals.id,
        titel: proposals.titel,
        status: proposals.status,
        token: proposals.token,
        totaalBedrag: proposals.totaalBedrag,
        klantNaam: klanten.bedrijfsnaam,
        klantContactpersoon: klanten.contactpersoon,
        klantEmail: klanten.email,
      })
      .from(proposals)
      .innerJoin(klanten, eq(proposals.klantId, klanten.id))
      .where(eq(proposals.id, Number(id)));

    if (!proposal) {
      return NextResponse.json({ fout: "Proposal niet gevonden." }, { status: 404 });
    }

    if (!proposal.klantEmail) {
      return NextResponse.json(
        { fout: "Klant heeft geen e-mailadres." },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dashboard.autronis.com";
    const proposalUrl = `${baseUrl}/proposal/${proposal.token}`;

    const bedragFormatted = new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(proposal.totaalBedrag || 0);

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: "Autronis <noreply@autronis.com>",
      to: proposal.klantEmail,
      subject: `Voorstel: ${proposal.titel} — Autronis`,
      text: [
        `Beste ${proposal.klantContactpersoon || proposal.klantNaam},`,
        "",
        `Hierbij ontvangt u ons voorstel "${proposal.titel}" ter waarde van ${bedragFormatted}.`,
        "",
        `U kunt het voorstel bekijken en digitaal ondertekenen via de volgende link:`,
        proposalUrl,
        "",
        "Met vriendelijke groet,",
        "Autronis",
      ].join("\n"),
    });

    // Update status to verzonden
    await db
      .update(proposals)
      .set({
        status: "verzonden",
        bijgewerktOp: new Date().toISOString(),
      })
      .where(eq(proposals.id, Number(id)));

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Kon e-mail niet versturen" },
      { status: 500 }
    );
  }
}
