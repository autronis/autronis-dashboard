import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { okrObjectives, okrKeyResults } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

// GET /api/doelen/[id] — single objective with key results
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const objectiveId = Number(id);

    const [objective] = await db
      .select()
      .from(okrObjectives)
      .where(eq(okrObjectives.id, objectiveId));

    if (!objective) {
      return NextResponse.json({ fout: "Doel niet gevonden" }, { status: 404 });
    }

    const keyResults = await db
      .select()
      .from(okrKeyResults)
      .where(eq(okrKeyResults.objectiveId, objectiveId));

    return NextResponse.json({ doel: { ...objective, keyResults } });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// PUT /api/doelen/[id] — update objective + key results
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const objectiveId = Number(id);
    const body = await req.json() as {
      titel?: string;
      omschrijving?: string;
      eigenaarId?: number;
      status?: string;
      keyResults?: {
        id?: number;
        titel: string;
        doelwaarde: number;
        huidigeWaarde?: number;
        eenheid?: string;
        autoKoppeling?: string;
      }[];
    };

    // Update objective
    const updateData: Record<string, unknown> = {};
    if (body.titel !== undefined) updateData.titel = body.titel.trim();
    if (body.omschrijving !== undefined) updateData.omschrijving = body.omschrijving?.trim() || null;
    if (body.eigenaarId !== undefined) updateData.eigenaarId = body.eigenaarId;
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(okrObjectives)
        .set(updateData)
        .where(eq(okrObjectives.id, objectiveId));
    }

    // Update key results if provided
    if (body.keyResults) {
      // Get existing KR ids
      const existingKrs = await db
        .select({ id: okrKeyResults.id })
        .from(okrKeyResults)
        .where(eq(okrKeyResults.objectiveId, objectiveId));
      const existingIds = new Set(existingKrs.map((kr) => kr.id));

      const newKrIds = new Set<number>();

      for (const kr of body.keyResults) {
        if (kr.id && existingIds.has(kr.id)) {
          // Update existing
          await db
            .update(okrKeyResults)
            .set({
              titel: kr.titel.trim(),
              doelwaarde: kr.doelwaarde,
              huidigeWaarde: kr.huidigeWaarde ?? 0,
              eenheid: kr.eenheid || null,
              autoKoppeling: (kr.autoKoppeling as "omzet" | "uren" | "taken" | "klanten" | "geen") || "geen",
            })
            .where(eq(okrKeyResults.id, kr.id));
          newKrIds.add(kr.id);
        } else {
          // Insert new
          const [inserted] = await db
            .insert(okrKeyResults)
            .values({
              objectiveId,
              titel: kr.titel.trim(),
              doelwaarde: kr.doelwaarde,
              huidigeWaarde: kr.huidigeWaarde ?? 0,
              eenheid: kr.eenheid || null,
              autoKoppeling: (kr.autoKoppeling as "omzet" | "uren" | "taken" | "klanten" | "geen") || "geen",
            })
            .returning();
          newKrIds.add(inserted.id);
        }
      }

      // Delete removed key results
      for (const existingId of existingIds) {
        if (!newKrIds.has(existingId)) {
          await db.delete(okrKeyResults).where(eq(okrKeyResults.id, existingId));
        }
      }
    }

    // Return updated objective
    const [updated] = await db
      .select()
      .from(okrObjectives)
      .where(eq(okrObjectives.id, objectiveId));

    const keyResults = await db
      .select()
      .from(okrKeyResults)
      .where(eq(okrKeyResults.objectiveId, objectiveId));

    return NextResponse.json({ doel: { ...updated, keyResults } });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// DELETE /api/doelen/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const objectiveId = Number(id);

    // Key results are cascade deleted due to schema
    await db.delete(okrKeyResults).where(eq(okrKeyResults.objectiveId, objectiveId));
    await db.delete(okrObjectives).where(eq(okrObjectives.id, objectiveId));

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
