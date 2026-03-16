import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { radarBronnen, radarItems } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, isNull, isNotNull, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

// ============ XML PARSE HELPERS ============

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
}

function extractLink(xml: string): string {
  const hrefMatch = xml.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (hrefMatch) return hrefMatch[1];
  const contentMatch = xml.match(/<link[^>]*>([^<]+)<\/link>/i);
  return contentMatch ? contentMatch[1].trim() : "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

interface ParsedFeedItem {
  titel: string;
  url: string;
  beschrijving: string;
  auteur: string;
  gepubliceerdOp: string;
}

function parseFeed(xml: string): ParsedFeedItem[] {
  const entries = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];

  return entries.map((entry) => {
    const titel = extractTag(entry, "title");
    const url = extractLink(entry) || extractTag(entry, "link");
    const beschrijving = stripHtml(
      extractTag(entry, "description") || extractTag(entry, "summary") || extractTag(entry, "content")
    );
    const auteur = extractTag(entry, "author") || extractTag(entry, "dc:creator");
    const rawDatum = extractTag(entry, "pubDate") || extractTag(entry, "published") || extractTag(entry, "updated");

    let gepubliceerdOp = "";
    if (rawDatum) {
      try {
        gepubliceerdOp = new Date(rawDatum).toISOString();
      } catch {
        gepubliceerdOp = rawDatum;
      }
    }

    return { titel, url, beschrijving, auteur, gepubliceerdOp };
  });
}

// ============ AI SCORING ============

interface AiScoreResult {
  index: number;
  score: number;
  categorie: "tools" | "api_updates" | "trends" | "kansen" | "must_reads";
  samenvatting: string;
}

async function scoreItemsMetAi(
  items: { id: number; titel: string; beschrijving: string | null }[]
): Promise<AiScoreResult[]> {
  const anthropic = new Anthropic();

  const prompt = `Je bent een AI/automation nieuws-curator voor Autronis, een AI- en automatiseringsbureau.
Score en categoriseer deze nieuwsitems op relevantie voor een klein AI/automation bedrijf.

Items:
${items.map((item, i) => `${i + 1}. "${item.titel}" - ${item.beschrijving?.substring(0, 200) || "geen beschrijving"}`).join("\n")}

Geef per item:
- score: 1-10 (10 = extreem relevant voor AI/automation bureau)
- categorie: tools | api_updates | trends | kansen | must_reads
- samenvatting: 1-2 zinnen waarom dit relevant is (of niet)

Antwoord als JSON array:
[{"index": 1, "score": 8, "categorie": "tools", "samenvatting": "..."}]
Alleen JSON.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") return [];

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  return JSON.parse(jsonMatch[0]) as AiScoreResult[];
}

// ============ MAIN PIPELINE ============

// POST /api/radar/fetch — RSS ophalen + AI scoren
export async function POST() {
  try {
    await requireAuth();

    // Step 1: Haal actieve bronnen op
    const bronnen = db
      .select()
      .from(radarBronnen)
      .where(eq(radarBronnen.actief, 1))
      .all();

    let nieuweItems = 0;
    const fouten: string[] = [];

    // Step 2: Fetch en parse elke bron
    for (const bron of bronnen) {
      try {
        const response = await fetch(bron.url, {
          headers: { "User-Agent": "Autronis-Radar/1.0" },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          fouten.push(`${bron.naam}: HTTP ${response.status}`);
          continue;
        }

        const xml = await response.text();
        const feedItems = parseFeed(xml);

        for (const feedItem of feedItems) {
          if (!feedItem.url || !feedItem.titel) continue;

          // Check duplicaat op URL
          const bestaand = db
            .select({ id: radarItems.id })
            .from(radarItems)
            .where(eq(radarItems.url, feedItem.url))
            .get();

          if (bestaand) continue;

          db.insert(radarItems)
            .values({
              bronId: bron.id,
              titel: feedItem.titel,
              url: feedItem.url,
              beschrijving: feedItem.beschrijving || null,
              auteur: feedItem.auteur || null,
              gepubliceerdOp: feedItem.gepubliceerdOp || null,
            })
            .run();

          nieuweItems++;
        }
      } catch (err) {
        fouten.push(`${bron.naam}: ${err instanceof Error ? err.message : "Onbekende fout"}`);
      }
    }

    // Step 3: AI scoring voor ongescoorde items (max 10)
    const ongescoord = db
      .select({
        id: radarItems.id,
        titel: radarItems.titel,
        beschrijving: radarItems.beschrijving,
      })
      .from(radarItems)
      .where(isNull(radarItems.score))
      .limit(10)
      .all();

    let gescoord = 0;

    if (ongescoord.length > 0) {
      try {
        const scores = await scoreItemsMetAi(ongescoord);

        for (const scoreResult of scores) {
          const item = ongescoord[scoreResult.index - 1];
          if (!item) continue;

          db.update(radarItems)
            .set({
              score: scoreResult.score,
              categorie: scoreResult.categorie,
              aiSamenvatting: scoreResult.samenvatting,
            })
            .where(eq(radarItems.id, item.id))
            .run();

          gescoord++;
        }
      } catch (err) {
        fouten.push(`AI scoring: ${err instanceof Error ? err.message : "Onbekende fout"}`);
      }
    }

    // Step 4: Top items ophalen
    const topItems = db
      .select({
        titel: radarItems.titel,
        score: radarItems.score,
      })
      .from(radarItems)
      .where(isNotNull(radarItems.score))
      .orderBy(desc(radarItems.score))
      .limit(5)
      .all()
      .reverse();

    return NextResponse.json({
      resultaat: {
        bronnenGescand: bronnen.length,
        nieuweItems,
        gescoord,
        topItems,
        ...(fouten.length > 0 ? { fouten } : {}),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
