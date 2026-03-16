import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { db } from "@/lib/db";
import { ideeen } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

const BACKLOG_PATH = "c:/Users/semmi/OneDrive/Claude AI/Business-ideas/IDEAS_BACKLOG.md";

const STATUS_MAP: Record<string, "idee" | "uitgewerkt" | "actief" | "gebouwd"> = {
  "✅": "gebouwd",
  "🟢": "actief",
  "🟡": "uitgewerkt",
  "⚪": "idee",
};

const CATEGORIE_MAP: Record<string, "saas" | "productized_service" | "intern" | "dev_tools" | "video" | "design" | "website"> = {
  "SaaS & Producten": "saas",
  "Productized Services": "productized_service",
  "Interne Tools & Persoonlijk": "intern",
  "Claude Code & Dev Tools": "dev_tools",
  "Video & Visual Content": "video",
  "Image & Design Automation": "design",
  "Website & Branding": "website",
};

interface ParsedIdee {
  nummer: number;
  naam: string;
  status: "idee" | "uitgewerkt" | "actief" | "gebouwd";
  omschrijving: string;
  categorie: "saas" | "productized_service" | "intern" | "dev_tools" | "video" | "design" | "website";
}

function parseBacklog(content: string): ParsedIdee[] {
  const parsed: ParsedIdee[] = [];
  let currentCategorie: "saas" | "productized_service" | "intern" | "dev_tools" | "video" | "design" | "website" = "intern";

  const lines = content.split("\n");

  for (const line of lines) {
    // Detect section headers for category
    for (const [header, cat] of Object.entries(CATEGORIE_MAP)) {
      if (line.includes(header)) {
        currentCategorie = cat;
        break;
      }
    }

    // Parse table rows: | # | Naam | Status | Omschrijving |
    const tableMatch = line.match(/^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.*?)\s*\|/);
    if (tableMatch) {
      const nummer = parseInt(tableMatch[1], 10);
      const naam = tableMatch[2].trim();
      const statusCell = tableMatch[3].trim();
      const omschrijving = tableMatch[4]?.trim() || "";

      // Skip header rows
      if (isNaN(nummer) || naam === "Naam" || naam.startsWith("-")) continue;

      // Map status emoji
      let status: "idee" | "uitgewerkt" | "actief" | "gebouwd" = "idee";
      for (const [emoji, mapped] of Object.entries(STATUS_MAP)) {
        if (statusCell.includes(emoji)) {
          status = mapped;
          break;
        }
      }

      parsed.push({
        nummer,
        naam,
        status,
        omschrijving,
        categorie: currentCategorie,
      });
    }
  }

  return parsed;
}

// POST /api/ideeen/sync-backlog — sync vanuit IDEAS_BACKLOG.md
export async function POST() {
  try {
    const gebruiker = await requireAuth();

    let content: string;
    try {
      content = await readFile(BACKLOG_PATH, "utf-8");
    } catch {
      return NextResponse.json(
        { fout: `Backlog bestand niet gevonden: ${BACKLOG_PATH}` },
        { status: 404 }
      );
    }

    const parsed = parseBacklog(content);
    let nieuw = 0;
    let bijgewerkt = 0;

    for (const item of parsed) {
      const bestaand = db
        .select()
        .from(ideeen)
        .where(eq(ideeen.nummer, item.nummer))
        .get();

      if (bestaand) {
        db.update(ideeen)
          .set({
            status: item.status,
            omschrijving: item.omschrijving || bestaand.omschrijving,
            categorie: item.categorie,
            naam: item.naam,
            bijgewerktOp: new Date().toISOString(),
          })
          .where(eq(ideeen.id, bestaand.id))
          .run();
        bijgewerkt++;
      } else {
        db.insert(ideeen)
          .values({
            nummer: item.nummer,
            naam: item.naam,
            status: item.status,
            omschrijving: item.omschrijving || null,
            categorie: item.categorie,
            prioriteit: "normaal",
            aangemaaktDoor: gebruiker.id,
          })
          .run();
        nieuw++;
      }
    }

    return NextResponse.json({
      resultaat: {
        totaal: parsed.length,
        nieuw,
        bijgewerkt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
