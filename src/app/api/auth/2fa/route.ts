"use strict";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { gebruikers, backupCodes } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

// GET: Get 2FA status + setup QR if not enabled
export async function GET(): Promise<NextResponse> {
  const sessie = await requireAuth();

  const [gebruiker] = await db
    .select({ tweeFactorGeheim: gebruikers.tweeFactorGeheim })
    .from(gebruikers)
    .where(eq(gebruikers.id, sessie.id))
    .limit(1);

  if (gebruiker?.tweeFactorGeheim) {
    return NextResponse.json({ ingeschakeld: true });
  }

  // Generate new secret for setup
  const secret = generateSecret();
  const otpauthUrl = generateURI({ strategy: "totp", issuer: "Autronis Dashboard", label: sessie.email, secret });
  const qrCode = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({
    ingeschakeld: false,
    secret,
    qrCode,
    otpauthUrl,
  });
}

// POST: Enable 2FA (verify code first)
export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessie = await requireAuth();

  let body: { secret?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  const { secret, code } = body;
  if (!secret || !code) {
    return NextResponse.json({ fout: "Secret en code zijn verplicht." }, { status: 400 });
  }

  const isValid = verifySync({ secret, token: code });
  if (!isValid) {
    return NextResponse.json({ fout: "Ongeldige code. Probeer opnieuw." }, { status: 400 });
  }

  // Save secret to user
  await db
    .update(gebruikers)
    .set({ tweeFactorGeheim: secret })
    .where(eq(gebruikers.id, sessie.id));

  // Generate 8 backup codes
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const backupCode = Math.random().toString(36).substring(2, 8).toUpperCase() +
      "-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    codes.push(backupCode);
    await db.insert(backupCodes).values({
      gebruikerId: sessie.id,
      code: backupCode,
      gebruikt: 0,
    });
  }

  return NextResponse.json({ succes: true, backupCodes: codes });
}

// DELETE: Disable 2FA
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const sessie = await requireAuth();

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  const { code } = body;
  if (!code) {
    return NextResponse.json({ fout: "Code is verplicht om 2FA uit te schakelen." }, { status: 400 });
  }

  const [gebruiker] = await db
    .select({ tweeFactorGeheim: gebruikers.tweeFactorGeheim })
    .from(gebruikers)
    .where(eq(gebruikers.id, sessie.id))
    .limit(1);

  if (!gebruiker?.tweeFactorGeheim) {
    return NextResponse.json({ fout: "2FA is niet ingeschakeld." }, { status: 400 });
  }

  const isValid = verifySync({ secret: gebruiker.tweeFactorGeheim, token: code });
  if (!isValid) {
    return NextResponse.json({ fout: "Ongeldige code." }, { status: 400 });
  }

  await db
    .update(gebruikers)
    .set({ tweeFactorGeheim: null })
    .where(eq(gebruikers.id, sessie.id));

  // Remove backup codes
  await db
    .delete(backupCodes)
    .where(eq(backupCodes.gebruikerId, sessie.id));

  return NextResponse.json({ succes: true });
}
