import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectTemplates, taken, projecten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface TemplateTaak {
  titel: string;
  beschrijving: string;
  geschatteUren: number;
  prioriteit: "laag" | "normaal" | "hoog";
  volgorde: number;
}

// POST /api/templates/[id]/toepassen — apply template to project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gebruiker = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ fout: "Project ID is verplicht." }, { status: 400 });
    }

    // Verify template exists
    const [template] = await db
      .select()
      .from(projectTemplates)
      .where(eq(projectTemplates.id, Number(id)));

    if (!template) {
      return NextResponse.json({ fout: "Template niet gevonden." }, { status: 404 });
    }

    // Verify project exists
    const [project] = await db
      .select({ id: projecten.id })
      .from(projecten)
      .where(eq(projecten.id, Number(projectId)));

    if (!project) {
      return NextResponse.json({ fout: "Project niet gevonden." }, { status: 404 });
    }

    // Parse template tasks
    const templateTaken: TemplateTaak[] = JSON.parse(template.taken || "[]");

    // Create tasks from template
    const aangemaakteTaken = [];
    for (const tt of templateTaken) {
      const [nieuweTaak] = await db
        .insert(taken)
        .values({
          projectId: Number(projectId),
          aangemaaktDoor: gebruiker.id,
          toegewezenAan: gebruiker.id,
          titel: tt.titel,
          omschrijving: tt.beschrijving || null,
          status: "open",
          prioriteit: tt.prioriteit || "normaal",
        })
        .returning();
      aangemaakteTaken.push(nieuweTaak);
    }

    return NextResponse.json({
      succes: true,
      taken: aangemaakteTaken,
      aantal: aangemaakteTaken.length,
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
