import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { klanttevredenheid, klanten, projecten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc, avg } from "drizzle-orm";
import crypto from "crypto";
import { Resend } from "resend";

// GET /api/tevredenheid?klantId=1
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const klantId = searchParams.get("klantId");

    const conditions = [];
    if (klantId) {
      conditions.push(eq(klanttevredenheid.klantId, Number(klantId)));
    }

    const lijst = await db
      .select({
        id: klanttevredenheid.id,
        klantId: klanttevredenheid.klantId,
        klantNaam: klanten.bedrijfsnaam,
        projectId: klanttevredenheid.projectId,
        projectNaam: projecten.naam,
        score: klanttevredenheid.score,
        opmerking: klanttevredenheid.opmerking,
        token: klanttevredenheid.token,
        ingevuldOp: klanttevredenheid.ingevuldOp,
        aangemaaktOp: klanttevredenheid.aangemaaktOp,
      })
      .from(klanttevredenheid)
      .innerJoin(klanten, eq(klanttevredenheid.klantId, klanten.id))
      .leftJoin(projecten, eq(klanttevredenheid.projectId, projecten.id))
      .where(conditions.length > 0 ? eq(klanttevredenheid.klantId, Number(klantId)) : undefined)
      .orderBy(desc(klanttevredenheid.aangemaaktOp));

    // Calculate average
    const [gemiddeld] = await db
      .select({ gemiddeld: avg(klanttevredenheid.score) })
      .from(klanttevredenheid)
      .where(klantId ? eq(klanttevredenheid.klantId, Number(klantId)) : undefined);

    const ingevuld = lijst.filter((t) => t.ingevuldOp !== null);
    const openstaand = lijst.filter((t) => t.ingevuldOp === null);

    return NextResponse.json({
      tevredenheid: lijst,
      gemiddeldeScore: gemiddeld?.gemiddeld ? Number(gemiddeld.gemiddeld) : null,
      ingevuld: ingevuld.length,
      openstaand: openstaand.length,
      totaal: lijst.length,
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// POST /api/tevredenheid
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    const { klantId, projectId, verstuurEmail } = body;

    if (!klantId) {
      return NextResponse.json({ fout: "Klant is verplicht." }, { status: 400 });
    }

    const token = crypto.randomUUID();

    const [nieuw] = await db
      .insert(klanttevredenheid)
      .values({
        klantId,
        projectId: projectId || null,
        score: 0,
        token,
      })
      .returning();

    // Optionally send email
    if (verstuurEmail) {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const [klant] = await db
          .select({ email: klanten.email, bedrijfsnaam: klanten.bedrijfsnaam, contactpersoon: klanten.contactpersoon })
          .from(klanten)
          .where(eq(klanten.id, klantId));

        if (klant?.email) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dashboard.autronis.com";
          const feedbackUrl = `${baseUrl}/feedback/${token}`;

          const resend = new Resend(apiKey);
          await resend.emails.send({
            from: "Autronis <noreply@autronis.com>",
            to: klant.email,
            subject: "Hoe tevreden bent u? — Autronis",
            text: [
              `Beste ${klant.contactpersoon || klant.bedrijfsnaam},`,
              "",
              "Wij vinden het belangrijk om onze dienstverlening continu te verbeteren. Daarom horen we graag van u hoe tevreden u bent met onze samenwerking.",
              "",
              "Het invullen duurt slechts een minuut:",
              feedbackUrl,
              "",
              "Alvast bedankt!",
              "",
              "Met vriendelijke groet,",
              "Autronis",
            ].join("\n"),
          });
        }
      }
    }

    return NextResponse.json({ tevredenheid: nieuw, token }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
