import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenTimeEntries, screenTimeRegels, projecten } from "@/lib/db/schema";
import { requireApiKey } from "@/lib/auth";
import { eq } from "drizzle-orm";

function detectProjectFromTitle(
  app: string,
  title: string,
  projects: Array<{ id: number; naam: string; klantId: number | null }>
): { projectId: number; klantId: number | null } | null {
  let extracted: string | null = null;

  // VS Code / Cursor: "file.tsx — project-name — Visual Studio Code"
  if (app.toLowerCase().includes("code") || app.toLowerCase().includes("cursor")) {
    const parts = title.split(" — ");
    if (parts.length >= 2) {
      extracted = parts[parts.length - 2]?.trim() || null;
    }
  }
  // Terminal: extract last directory
  else if (app.toLowerCase().includes("terminal") || app.toLowerCase().includes("cmd") || app.toLowerCase().includes("powershell")) {
    const match = title.match(/[/\\]([^/\\]+)\s*$/);
    if (match) extracted = match[1];
  }

  if (!extracted) return null;

  // Find matching project (case-insensitive)
  const match = projects.filter(p =>
    p.naam.toLowerCase().includes(extracted!.toLowerCase()) ||
    extracted!.toLowerCase().includes(p.naam.toLowerCase())
  );

  if (match.length === 1) {
    return { projectId: match[0].id, klantId: match[0].klantId };
  }

  return null;
}

export async function POST(req: NextRequest) {
  let gebruikerId: number;
  try {
    gebruikerId = await requireApiKey(req);
  } catch {
    return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { entries } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ fout: "Geen entries meegegeven" }, { status: 400 });
    }

    const regels = db
      .select()
      .from(screenTimeRegels)
      .where(eq(screenTimeRegels.isActief, 1))
      .orderBy(screenTimeRegels.prioriteit)
      .all();

    // Cache projects for title matching
    const projectCache = db
      .select({ id: projecten.id, naam: projecten.naam, klantId: projecten.klantId })
      .from(projecten)
      .where(eq(projecten.isActief, 1))
      .all();

    let verwerkt = 0;
    let overgeslagen = 0;
    const categorieen: Array<{ clientId: string; categorie: string; projectId: number | null }> = [];

    for (const entry of entries) {
      if (!entry.clientId || !entry.app || !entry.startTijd || !entry.eindTijd || !entry.duurSeconden) {
        overgeslagen++;
        continue;
      }

      const bestaand = db
        .select({ id: screenTimeEntries.id })
        .from(screenTimeEntries)
        .where(eq(screenTimeEntries.clientId, entry.clientId))
        .get();

      if (bestaand) {
        overgeslagen++;
        continue;
      }

      let categorie: "development" | "communicatie" | "design" | "administratie" | "afleiding" | "overig" | "inactief" = "overig";
      let projectId: number | null = null;
      let klantId: number | null = null;

      for (const regel of regels) {
        const matchTarget =
          regel.type === "app" ? entry.app :
          regel.type === "url" ? (entry.url || "") :
          (entry.venstertitel || "");

        try {
          if (new RegExp(regel.patroon, "i").test(matchTarget)) {
            categorie = regel.categorie;
            projectId = regel.projectId;
            klantId = regel.klantId;
            break;
          }
        } catch {
          // Invalid regex, skip rule
        }
      }

      // Project detection from window title (if no project assigned by rules)
      if (!projectId && entry.venstertitel) {
        const detected = detectProjectFromTitle(entry.app, entry.venstertitel, projectCache);
        if (detected) {
          projectId = detected.projectId;
          klantId = detected.klantId;
        }
      }

      db.insert(screenTimeEntries).values({
        clientId: entry.clientId,
        gebruikerId,
        app: entry.app,
        vensterTitel: entry.venstertitel || null,
        url: entry.url || null,
        categorie,
        projectId,
        klantId,
        startTijd: entry.startTijd,
        eindTijd: entry.eindTijd,
        duurSeconden: entry.duurSeconden,
        bron: "agent",
      }).run();

      categorieen.push({ clientId: entry.clientId, categorie, projectId });
      verwerkt++;
    }

    return NextResponse.json({ verwerkt, overgeslagen, categorieen });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: 500 }
    );
  }
}
