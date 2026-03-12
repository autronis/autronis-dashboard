import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { gebruikers, backupCodes } from "@/lib/db/schema";
import { verifySync } from "otplib";

// POST: Verify 2FA code during login
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { gebruikerId?: number; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  const { gebruikerId, code } = body;
  if (!gebruikerId || !code) {
    return NextResponse.json({ fout: "Gebruiker ID en code zijn verplicht." }, { status: 400 });
  }

  const [gebruiker] = await db
    .select({ tweeFactorGeheim: gebruikers.tweeFactorGeheim })
    .from(gebruikers)
    .where(eq(gebruikers.id, gebruikerId))
    .limit(1);

  if (!gebruiker?.tweeFactorGeheim) {
    return NextResponse.json({ fout: "2FA is niet ingeschakeld." }, { status: 400 });
  }

  // Try TOTP code first
  const isValid = verifySync({ secret: gebruiker.tweeFactorGeheim, token: code });

  if (isValid) {
    return NextResponse.json({ succes: true });
  }

  // Try backup code
  const [backupCode] = await db
    .select()
    .from(backupCodes)
    .where(
      and(
        eq(backupCodes.gebruikerId, gebruikerId),
        eq(backupCodes.code, code.toUpperCase()),
        eq(backupCodes.gebruikt, 0)
      )
    )
    .limit(1);

  if (backupCode) {
    await db
      .update(backupCodes)
      .set({ gebruikt: 1 })
      .where(eq(backupCodes.id, backupCode.id));
    return NextResponse.json({ succes: true, backupCodeGebruikt: true });
  }

  return NextResponse.json({ fout: "Ongeldige code." }, { status: 400 });
}
