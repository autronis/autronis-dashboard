import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

// GET: List all API keys (only show prefix, not full key)
export async function GET(): Promise<NextResponse> {
  await requireAuth();

  const keys = await db
    .select({
      id: apiKeys.id,
      naam: apiKeys.naam,
      keyPrefix: apiKeys.keyPrefix,
      permissions: apiKeys.permissions,
      laatstGebruiktOp: apiKeys.laatstGebruiktOp,
      aangemaaktOp: apiKeys.aangemaaktOp,
    })
    .from(apiKeys)
    .orderBy(desc(apiKeys.aangemaaktOp));

  return NextResponse.json({
    keys: keys.map((k) => ({
      ...k,
      permissions: JSON.parse(k.permissions || "[]"),
    })),
  });
}

// POST: Create new API key
export async function POST(req: NextRequest): Promise<NextResponse> {
  const gebruiker = await requireAuth();

  let body: { naam?: string; permissions?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  if (!body.naam) {
    return NextResponse.json({ fout: "Naam is verplicht." }, { status: 400 });
  }

  // Generate API key
  const rawKey = `aut_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12) + "...";

  const [key] = await db
    .insert(apiKeys)
    .values({
      naam: body.naam,
      keyHash,
      keyPrefix,
      permissions: JSON.stringify(body.permissions || []),
      aangemaaktDoor: gebruiker.id,
    })
    .returning();

  // Return full key only once (on creation)
  return NextResponse.json({
    key: {
      ...key,
      volledigeKey: rawKey,
      permissions: JSON.parse(key.permissions || "[]"),
    },
  });
}

// DELETE: Revoke API key
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  await requireAuth();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ fout: "ID is verplicht." }, { status: 400 });
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, parseInt(id)));

  return NextResponse.json({ succes: true });
}
