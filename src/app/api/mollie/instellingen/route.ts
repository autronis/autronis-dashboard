import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mollieInstellingen } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

// GET: Get Mollie settings
export async function GET(): Promise<NextResponse> {
  await requireAuth();

  const [mollie] = await db.select().from(mollieInstellingen).limit(1);

  return NextResponse.json({
    instellingen: mollie
      ? {
          actief: !!mollie.actief,
          heeftApiKey: !!mollie.apiKey,
        }
      : { actief: false, heeftApiKey: false },
  });
}

// PUT: Update Mollie settings
export async function PUT(req: NextRequest): Promise<NextResponse> {
  await requireAuth();

  let body: { apiKey?: string; actief?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  const [bestaand] = await db.select().from(mollieInstellingen).limit(1);

  if (bestaand) {
    await db
      .update(mollieInstellingen)
      .set({
        ...(body.apiKey !== undefined && { apiKey: body.apiKey }),
        ...(body.actief !== undefined && { actief: body.actief ? 1 : 0 }),
        bijgewerktOp: new Date().toISOString(),
      })
      .where(eq(mollieInstellingen.id, bestaand.id));
  } else {
    await db.insert(mollieInstellingen).values({
      id: 1,
      apiKey: body.apiKey || null,
      actief: body.actief ? 1 : 0,
    });
  }

  return NextResponse.json({ succes: true });
}
