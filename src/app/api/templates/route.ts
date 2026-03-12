import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectTemplates } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { desc } from "drizzle-orm";

// GET /api/templates — list all templates
export async function GET() {
  try {
    await requireAuth();

    const rows = await db
      .select()
      .from(projectTemplates)
      .orderBy(desc(projectTemplates.aangemaaktOp));

    return NextResponse.json({ templates: rows });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// POST /api/templates — create template
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { naam, beschrijving, categorie, taken, geschatteUren, uurtarief } = body;

    if (!naam?.trim()) {
      return NextResponse.json({ fout: "Naam is verplicht." }, { status: 400 });
    }

    const [template] = await db
      .insert(projectTemplates)
      .values({
        naam: naam.trim(),
        beschrijving: beschrijving?.trim() || null,
        categorie: categorie?.trim() || null,
        taken: JSON.stringify(taken || []),
        geschatteUren: geschatteUren || null,
        uurtarief: uurtarief || null,
      })
      .returning();

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
