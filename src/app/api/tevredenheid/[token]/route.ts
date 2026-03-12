import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { klanttevredenheid, klanten, projecten } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/tevredenheid/[token] — Public route (no auth)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const [survey] = await db
      .select({
        id: klanttevredenheid.id,
        klantNaam: klanten.bedrijfsnaam,
        projectNaam: projecten.naam,
        score: klanttevredenheid.score,
        ingevuldOp: klanttevredenheid.ingevuldOp,
      })
      .from(klanttevredenheid)
      .innerJoin(klanten, eq(klanttevredenheid.klantId, klanten.id))
      .leftJoin(projecten, eq(klanttevredenheid.projectId, projecten.id))
      .where(eq(klanttevredenheid.token, token));

    if (!survey) {
      return NextResponse.json({ fout: "Enquête niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ survey });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}

// POST /api/tevredenheid/[token] — Public route (no auth)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();

    const { score, opmerking } = body;

    if (!score || score < 1 || score > 5) {
      return NextResponse.json(
        { fout: "Score moet tussen 1 en 5 zijn." },
        { status: 400 }
      );
    }

    const [survey] = await db
      .select({
        id: klanttevredenheid.id,
        ingevuldOp: klanttevredenheid.ingevuldOp,
      })
      .from(klanttevredenheid)
      .where(eq(klanttevredenheid.token, token));

    if (!survey) {
      return NextResponse.json({ fout: "Enquête niet gevonden." }, { status: 404 });
    }

    if (survey.ingevuldOp) {
      return NextResponse.json(
        { fout: "Deze enquête is al ingevuld." },
        { status: 400 }
      );
    }

    await db
      .update(klanttevredenheid)
      .set({
        score,
        opmerking: opmerking?.trim() || null,
        ingevuldOp: new Date().toISOString(),
      })
      .where(eq(klanttevredenheid.id, survey.id));

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
