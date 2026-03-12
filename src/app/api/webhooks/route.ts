import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookEndpoints, webhookLogs } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import crypto from "crypto";

// GET: List all webhook endpoints with recent logs
export async function GET(): Promise<NextResponse> {
  await requireAuth();

  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .orderBy(desc(webhookEndpoints.aangemaaktOp));

  const result = [];
  for (const ep of endpoints) {
    const recentLogs = await db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.endpointId, ep.id))
      .orderBy(desc(webhookLogs.aangemaaktOp))
      .limit(10);

    result.push({ ...ep, events: JSON.parse(ep.events || "[]"), recentLogs });
  }

  return NextResponse.json({ endpoints: result });
}

// POST: Create new webhook endpoint
export async function POST(req: NextRequest): Promise<NextResponse> {
  await requireAuth();

  let body: { url?: string; events?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  if (!body.url) {
    return NextResponse.json({ fout: "URL is verplicht." }, { status: 400 });
  }

  const secret = crypto.randomBytes(32).toString("hex");

  const [endpoint] = await db
    .insert(webhookEndpoints)
    .values({
      url: body.url,
      events: JSON.stringify(body.events || []),
      secret,
      actief: 1,
    })
    .returning();

  return NextResponse.json({ endpoint: { ...endpoint, secret } });
}

// PUT: Update webhook endpoint
export async function PUT(req: NextRequest): Promise<NextResponse> {
  await requireAuth();

  let body: { id?: number; url?: string; events?: string[]; actief?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ fout: "ID is verplicht." }, { status: 400 });
  }

  await db
    .update(webhookEndpoints)
    .set({
      ...(body.url !== undefined && { url: body.url }),
      ...(body.events !== undefined && { events: JSON.stringify(body.events) }),
      ...(body.actief !== undefined && { actief: body.actief ? 1 : 0 }),
    })
    .where(eq(webhookEndpoints.id, body.id));

  return NextResponse.json({ succes: true });
}

// DELETE: Delete webhook endpoint
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  await requireAuth();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ fout: "ID is verplicht." }, { status: 400 });
  }

  await db.delete(webhookLogs).where(eq(webhookLogs.endpointId, parseInt(id)));
  await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, parseInt(id)));

  return NextResponse.json({ succes: true });
}
