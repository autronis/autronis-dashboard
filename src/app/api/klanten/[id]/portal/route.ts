import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientPortalTokens, klanten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

// POST /api/klanten/[id]/portal — activate portal, generate token
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const klantId = Number(id);

    // Verify klant exists
    const [klant] = await db
      .select({ id: klanten.id, bedrijfsnaam: klanten.bedrijfsnaam })
      .from(klanten)
      .where(eq(klanten.id, klantId));

    if (!klant) {
      return NextResponse.json({ fout: "Klant niet gevonden." }, { status: 404 });
    }

    // Check if active token already exists
    const [bestaand] = await db
      .select()
      .from(clientPortalTokens)
      .where(
        and(
          eq(clientPortalTokens.klantId, klantId),
          eq(clientPortalTokens.actief, 1)
        )
      );

    if (bestaand) {
      const baseUrl = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const link = `${protocol}://${baseUrl}/portal/${bestaand.token}`;
      return NextResponse.json({
        token: bestaand.token,
        link,
        laatstIngelogdOp: bestaand.laatstIngelogdOp,
      });
    }

    // Generate unique token
    const token = randomBytes(32).toString("hex");

    const [nieuw] = await db
      .insert(clientPortalTokens)
      .values({
        klantId,
        token,
        actief: 1,
      })
      .returning();

    const baseUrl = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const link = `${protocol}://${baseUrl}/portal/${nieuw.token}`;

    return NextResponse.json({ token: nieuw.token, link }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// DELETE /api/klanten/[id]/portal — deactivate portal
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const klantId = Number(id);

    await db
      .update(clientPortalTokens)
      .set({ actief: 0 })
      .where(
        and(
          eq(clientPortalTokens.klantId, klantId),
          eq(clientPortalTokens.actief, 1)
        )
      );

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
