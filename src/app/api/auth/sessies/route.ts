import { NextRequest, NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessies } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";

// GET: List active sessions for current user
export async function GET(): Promise<NextResponse> {
  const gebruiker = await requireAuth();

  const alleSessies = await db
    .select()
    .from(sessies)
    .where(eq(sessies.gebruikerId, gebruiker.id))
    .orderBy(sessies.laatsteActiviteit);

  return NextResponse.json({
    sessies: alleSessies.map((s) => ({
      id: s.id,
      apparaat: s.apparaat || "Onbekend",
      browser: s.browser || "Onbekend",
      ipAdres: s.ipAdres || "Onbekend",
      laatsteActiviteit: s.laatsteActiviteit,
      vertrouwdTot: s.vertrouwdTot,
      aangemaaktOp: s.aangemaaktOp,
    })),
  });
}

// DELETE: Terminate session(s)
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const gebruiker = await requireAuth();

  const { searchParams } = new URL(req.url);
  const sessieId = searchParams.get("id");
  const alleAndere = searchParams.get("alleAndere");
  const huidigeSessieToken = searchParams.get("huidig");

  if (sessieId) {
    // Delete specific session
    await db
      .delete(sessies)
      .where(
        and(
          eq(sessies.id, parseInt(sessieId)),
          eq(sessies.gebruikerId, gebruiker.id)
        )
      );
  } else if (alleAndere === "true" && huidigeSessieToken) {
    // Delete all other sessions
    await db
      .delete(sessies)
      .where(
        and(
          eq(sessies.gebruikerId, gebruiker.id),
          ne(sessies.sessionToken, huidigeSessieToken)
        )
      );
  }

  return NextResponse.json({ succes: true });
}
