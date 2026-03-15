import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenTimeRegels } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

// PUT /api/screen-time/regels/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();

    // Validate regex if patroon is provided
    if (body.patroon) {
      try {
        new RegExp(body.patroon.trim());
      } catch {
        return NextResponse.json({ fout: "Ongeldig regex patroon." }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};

    if (body.type !== undefined) updateData.type = body.type.trim();
    if (body.patroon !== undefined) updateData.patroon = body.patroon.trim();
    if (body.categorie !== undefined) updateData.categorie = body.categorie.trim();
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.klantId !== undefined) updateData.klantId = body.klantId;
    if (body.prioriteit !== undefined) updateData.prioriteit = body.prioriteit;

    db.update(screenTimeRegels)
      .set(updateData)
      .where(eq(screenTimeRegels.id, Number(id)))
      .run();

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// DELETE /api/screen-time/regels/[id] — soft delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    db.update(screenTimeRegels)
      .set({ isActief: 0 })
      .where(eq(screenTimeRegels.id, Number(id)))
      .run();

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
