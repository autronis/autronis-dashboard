import crypto from "crypto";
import { db } from "@/lib/db";
import { webhookEndpoints, webhookLogs } from "@/lib/db/schema";

type WebhookEvent =
  | "factuur.aangemaakt"
  | "factuur.betaald"
  | "lead.gewonnen"
  | "project.afgerond"
  | "proposal.ondertekend"
  | "offerte.geaccepteerd";

export async function triggerWebhook(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  const endpoints = await db.select().from(webhookEndpoints);

  for (const endpoint of endpoints) {
    if (!endpoint.actief) continue;

    const events: string[] = JSON.parse(endpoint.events || "[]");
    if (events.length > 0 && !events.includes(event)) continue;

    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    const signature = crypto
      .createHmac("sha256", endpoint.secret)
      .update(body)
      .digest("hex");

    let statusCode = 0;
    let responseText = "";

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });
      statusCode = response.status;
      responseText = await response.text().catch(() => "");
    } catch (err) {
      statusCode = 0;
      responseText = err instanceof Error ? err.message : "Onbekende fout";
    }

    await db.insert(webhookLogs).values({
      endpointId: endpoint.id,
      event,
      payload: body,
      statusCode,
      response: responseText.slice(0, 1000),
    });
  }
}
