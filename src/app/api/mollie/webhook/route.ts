import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { facturen, notificaties, gebruikers } from "@/lib/db/schema";
import { triggerWebhook } from "@/lib/webhooks";

// POST: Receive Mollie payment webhook (public, no auth)
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  // TODO: When Mollie is fully integrated:
  // 1. Verify payment status with Mollie API using body.id
  // 2. Get payment metadata (factuurId)
  // 3. Mark factuur as paid
  // 4. Create notification
  // 5. Trigger webhook

  // Placeholder implementation for when Mollie API key is configured:
  // const mollieConfig = await db.select().from(mollieInstellingen).limit(1);
  // const paymentResponse = await fetch(`https://api.mollie.com/v2/payments/${body.id}`, {
  //   headers: { "Authorization": `Bearer ${mollieConfig[0].apiKey}` },
  // });
  // const payment = await paymentResponse.json();
  //
  // if (payment.status === "paid") {
  //   const factuurId = payment.metadata.factuurId;
  //   await db.update(facturen).set({
  //     status: "betaald",
  //     betaaldOp: new Date().toISOString(),
  //   }).where(eq(facturen.id, factuurId));
  //
  //   // Notify all users
  //   const alleGebruikers = await db.select().from(gebruikers);
  //   for (const g of alleGebruikers) {
  //     await db.insert(notificaties).values({
  //       gebruikerId: g.id,
  //       type: "factuur_betaald",
  //       titel: `Factuur ${factuur.factuurnummer} betaald via Mollie`,
  //       link: `/financien/${factuurId}`,
  //     });
  //   }
  //
  //   await triggerWebhook("factuur.betaald", { factuurId });
  // }

  return NextResponse.json({ succes: true });
}
