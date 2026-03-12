import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectTemplates } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

// GET /api/templates/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const [template] = await db
      .select()
      .from(projectTemplates)
      .where(eq(projectTemplates.id, Number(id)));

    if (!template) {
      return NextResponse.json({ fout: "Template niet gevonden." }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// PUT /api/templates/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { naam, beschrijving, categorie, taken, geschatteUren, uurtarief } = body;

    const [bestaand] = await db
      .select({ id: projectTemplates.id })
      .from(projectTemplates)
      .where(eq(projectTemplates.id, Number(id)));

    if (!bestaand) {
      return NextResponse.json({ fout: "Template niet gevonden." }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (naam !== undefined) updateData.naam = naam.trim();
    if (beschrijving !== undefined) updateData.beschrijving = beschrijving?.trim() || null;
    if (categorie !== undefined) updateData.categorie = categorie?.trim() || null;
    if (taken !== undefined) updateData.taken = JSON.stringify(taken);
    if (geschatteUren !== undefined) updateData.geschatteUren = geschatteUren;
    if (uurtarief !== undefined) updateData.uurtarief = uurtarief;

    const [updated] = await db
      .update(projectTemplates)
      .set(updateData)
      .where(eq(projectTemplates.id, Number(id)))
      .returning();

    return NextResponse.json({ template: updated });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// DELETE /api/templates/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const [bestaand] = await db
      .select({ id: projectTemplates.id })
      .from(projectTemplates)
      .where(eq(projectTemplates.id, Number(id)));

    if (!bestaand) {
      return NextResponse.json({ fout: "Template niet gevonden." }, { status: 404 });
    }

    await db.delete(projectTemplates).where(eq(projectTemplates.id, Number(id)));

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
