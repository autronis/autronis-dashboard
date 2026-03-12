import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feestdagen } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

const FEESTDAGEN_PER_JAAR: Record<number, { naam: string; datum: string }[]> = {
  2025: [
    { naam: "Nieuwjaarsdag", datum: "2025-01-01" },
    { naam: "Goede Vrijdag", datum: "2025-04-18" },
    { naam: "Paasmaandag", datum: "2025-04-21" },
    { naam: "Koningsdag", datum: "2025-04-27" },
    { naam: "Bevrijdingsdag", datum: "2025-05-05" },
    { naam: "Hemelvaartsdag", datum: "2025-05-29" },
    { naam: "Pinkstermaandag", datum: "2025-06-09" },
    { naam: "Kerst", datum: "2025-12-25" },
    { naam: "Tweede Kerstdag", datum: "2025-12-26" },
  ],
  2026: [
    { naam: "Nieuwjaarsdag", datum: "2026-01-01" },
    { naam: "Goede Vrijdag", datum: "2026-04-03" },
    { naam: "Paasmaandag", datum: "2026-04-06" },
    { naam: "Koningsdag", datum: "2026-04-27" },
    { naam: "Bevrijdingsdag", datum: "2026-05-05" },
    { naam: "Hemelvaartsdag", datum: "2026-05-14" },
    { naam: "Pinkstermaandag", datum: "2026-05-25" },
    { naam: "Kerst", datum: "2026-12-25" },
    { naam: "Tweede Kerstdag", datum: "2026-12-26" },
  ],
};

// GET /api/team/feestdagen — feestdagen voor een jaar
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const jaar = searchParams.get("jaar") || new Date().getFullYear().toString();

    const rows = await db
      .select()
      .from(feestdagen)
      .where(eq(feestdagen.jaar, Number(jaar)));

    return NextResponse.json({ feestdagen: rows });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// POST /api/team/feestdagen — seed feestdagen voor een jaar
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const jaar = Number(body.jaar);

    if (!jaar || jaar < 2024 || jaar > 2030) {
      return NextResponse.json({ fout: "Ongeldig jaar." }, { status: 400 });
    }

    // Check if already seeded
    const bestaand = await db
      .select()
      .from(feestdagen)
      .where(eq(feestdagen.jaar, jaar));

    if (bestaand.length > 0) {
      return NextResponse.json({ fout: "Feestdagen voor dit jaar bestaan al." }, { status: 400 });
    }

    const dagen = FEESTDAGEN_PER_JAAR[jaar];
    if (!dagen) {
      return NextResponse.json(
        { fout: `Geen feestdagen beschikbaar voor ${jaar}.` },
        { status: 400 }
      );
    }

    const inserted = await db
      .insert(feestdagen)
      .values(dagen.map((d) => ({ naam: d.naam, datum: d.datum, jaar })))
      .returning();

    return NextResponse.json({ feestdagen: inserted }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
