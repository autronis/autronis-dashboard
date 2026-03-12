import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { facturen, klanten, mollieInstellingen } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

// POST: Create Mollie payment link for a factuur
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ factuurId: string }> }
): Promise<NextResponse> {
  await requireAuth();
  const { factuurId } = await params;

  // Check Mollie config
  const [mollie] = await db.select().from(mollieInstellingen).limit(1);
  if (!mollie?.apiKey || !mollie.actief) {
    return NextResponse.json(
      { fout: "Mollie is niet geconfigureerd. Stel je API key in via Instellingen." },
      { status: 400 }
    );
  }

  // Get factuur
  const [factuur] = await db
    .select()
    .from(facturen)
    .where(eq(facturen.id, parseInt(factuurId)))
    .limit(1);

  if (!factuur) {
    return NextResponse.json({ fout: "Factuur niet gevonden." }, { status: 404 });
  }

  const [klant] = await db
    .select()
    .from(klanten)
    .where(eq(klanten.id, factuur.klantId!))
    .limit(1);

  // TODO: Actual Mollie API integration
  // For now, return placeholder structure showing what the integration would look like
  // When Mollie API key is configured, replace this with actual API call:
  //
  // const response = await fetch("https://api.mollie.com/v2/payments", {
  //   method: "POST",
  //   headers: {
  //     "Authorization": `Bearer ${mollie.apiKey}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     amount: { currency: "EUR", value: (factuur.bedragInclBtw || 0).toFixed(2) },
  //     description: `Factuur ${factuur.factuurnummer}`,
  //     redirectUrl: `${process.env.NEXT_PUBLIC_URL}/portal/betaling-voltooid`,
  //     webhookUrl: `${process.env.NEXT_PUBLIC_URL}/api/mollie/webhook`,
  //     metadata: { factuurId: factuur.id },
  //   }),
  // });

  return NextResponse.json({
    bericht: "Mollie integratie voorbereid. Configureer je Mollie API key om betaallinks te genereren.",
    factuur: {
      id: factuur.id,
      factuurnummer: factuur.factuurnummer,
      bedrag: factuur.bedragInclBtw,
      klant: klant?.bedrijfsnaam,
    },
  });
}
