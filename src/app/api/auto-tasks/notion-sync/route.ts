import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { Client } from "@notionhq/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  klanten,
  projecten,
  facturen,
  ideeen,
  taken,
  meetings,
  radarItems,
  leads,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// --- Notion block helpers ---

type NotionBlock =
  | ReturnType<typeof heading2>
  | ReturnType<typeof paragraph>
  | ReturnType<typeof bullet>
  | ReturnType<typeof toDo>
  | ReturnType<typeof divider>;

function heading2(text: string) {
  return {
    object: "block" as const,
    type: "heading_2" as const,
    heading_2: {
      rich_text: [{ type: "text" as const, text: { content: text } }],
    },
  };
}

function paragraph(text: string) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: {
      rich_text: [{ type: "text" as const, text: { content: text } }],
    },
  };
}

function bullet(text: string) {
  return {
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: {
      rich_text: [{ type: "text" as const, text: { content: text } }],
    },
  };
}

function toDo(text: string, checked = true) {
  return {
    object: "block" as const,
    type: "to_do" as const,
    to_do: {
      rich_text: [{ type: "text" as const, text: { content: text } }],
      checked,
    },
  };
}

function divider() {
  return {
    object: "block" as const,
    type: "divider" as const,
    divider: {},
  };
}

// --- Dashboard modules list ---

const MODULES = [
  { naam: "Dashboard", beschrijving: "homepage, briefing, KPIs" },
  { naam: "Tijdregistratie", beschrijving: "timer, weekoverzicht" },
  { naam: "Schermtijd", beschrijving: "tracking, sessies, AI samenvatting" },
  { naam: "Klanten", beschrijving: "CRUD, detail, projecten" },
  { naam: "Financien", beschrijving: "facturen, inkomsten, uitgaven" },
  { naam: "Offertes", beschrijving: "aanmaken, verzenden, status" },
  { naam: "CRM / Leads", beschrijving: "pipeline, activiteiten" },
  { naam: "Analytics", beschrijving: "omzet, uren, trends" },
  { naam: "Agenda", beschrijving: "afspraken, deadlines, herinneringen" },
  { naam: "Taken", beschrijving: "board, toewijzing, prioriteit" },
  { naam: "Doelen", beschrijving: "OKR, maanddoelen" },
  { naam: "Belasting", beschrijving: "BTW, deadlines, urencriterium" },
  { naam: "Kilometers", beschrijving: "registratie, zakelijke ritten" },
  { naam: "Team", beschrijving: "verlof, beschikbaarheid, onkosten" },
  { naam: "Proposals", beschrijving: "aanmaken, ondertekenen, portal" },
  { naam: "Wiki", beschrijving: "kennisbank, processen, SOPs" },
  { naam: "Ideeen", beschrijving: "backlog, AI scoring, promotie" },
  { naam: "AI Assistent", beschrijving: "chat, context-aware" },
  { naam: "Meetings", beschrijving: "transcript, samenvatting, actiepunten" },
  { naam: "Learning Radar", beschrijving: "RSS, scoring, must-reads" },
  { naam: "Content Engine", beschrijving: "posts, banners, video scripts" },
  { naam: "Instellingen", beschrijving: "bedrijfsgegevens, gebruikers" },
  { naam: "Case Studies", beschrijving: "portfolio, klantcases" },
  { naam: "Documenten", beschrijving: "bestanden, contracten, links" },
];

// --- Stats collection ---

interface DashboardStats {
  aantalKlanten: number;
  aantalProjecten: number;
  aantalFacturen: number;
  aantalIdeeen: number;
  aantalIdeeenGebouwd: number;
  aantalIdeeenActief: number;
  aantalTaken: number;
  aantalMeetings: number;
  aantalRadarItems: number;
  aantalLeads: number;
  aantalModules: number;
  aantalApiEndpoints: number;
  aantalDbTabellen: number;
}

function collectStats(): DashboardStats {
  const count = (result: { count: number } | undefined) => result?.count ?? 0;

  const aantalKlanten = count(
    db.select({ count: sql<number>`COUNT(*)` }).from(klanten).where(eq(klanten.isActief, 1)).get()
  );
  const aantalProjecten = count(
    db.select({ count: sql<number>`COUNT(*)` }).from(projecten).where(eq(projecten.isActief, 1)).get()
  );
  const aantalFacturen = count(
    db.select({ count: sql<number>`COUNT(*)` }).from(facturen).where(eq(facturen.isActief, 1)).get()
  );
  const aantalIdeeen = count(
    db.select({ count: sql<number>`COUNT(*)` }).from(ideeen).get()
  );
  const aantalIdeeenGebouwd = count(
    db.select({ count: sql<number>`COUNT(*)` }).from(ideeen).where(eq(ideeen.status, "gebouwd")).get()
  );
  const aantalIdeeenActief = count(
    db.select({ count: sql<number>`COUNT(*)` }).from(ideeen).where(eq(ideeen.status, "actief")).get()
  );
  const aantalTaken = count(
    db.select({ count: sql<number>`COUNT(*)` }).from(taken).get()
  );
  const aantalMeetings = count(
    db.select({ count: sql<number>`COUNT(*)` }).from(meetings).get()
  );
  const aantalRadarItems = count(
    db.select({ count: sql<number>`COUNT(*)` }).from(radarItems).get()
  );
  const aantalLeads = count(
    db.select({ count: sql<number>`COUNT(*)` }).from(leads).where(eq(leads.isActief, 1)).get()
  );

  return {
    aantalKlanten,
    aantalProjecten,
    aantalFacturen,
    aantalIdeeen,
    aantalIdeeenGebouwd,
    aantalIdeeenActief,
    aantalTaken,
    aantalMeetings,
    aantalRadarItems,
    aantalLeads,
    aantalModules: MODULES.length,
    aantalApiEndpoints: 45, // approximate count of API route directories
    aantalDbTabellen: 48, // count of schema tables
  };
}

// --- Git log ---

function getRecentCommits(): string[] {
  try {
    const output = execSync(
      'git log --oneline -20 --format="%s" --since="7 days ago"',
      { cwd: process.cwd(), encoding: "utf-8" }
    );
    return output
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

// --- Generate Notion blocks ---

function generateBlocks(
  stats: DashboardStats,
  recentCommits: string[]
): NotionBlock[] {
  const nu = new Date().toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const blocks: NotionBlock[] = [];

  // Header
  blocks.push(heading2("Dashboard Status"));
  blocks.push(paragraph(`Laatste update: ${nu}`));
  blocks.push(divider());

  // Modules
  blocks.push(heading2(`Modules (${stats.aantalModules} actief)`));
  for (const mod of MODULES) {
    blocks.push(toDo(`${mod.naam} (${mod.beschrijving})`, true));
  }
  blocks.push(divider());

  // Statistieken
  blocks.push(heading2("Statistieken"));
  blocks.push(bullet(`${stats.aantalKlanten} klanten`));
  blocks.push(bullet(`${stats.aantalProjecten} projecten`));
  blocks.push(bullet(`${stats.aantalFacturen} facturen`));
  blocks.push(
    bullet(
      `${stats.aantalIdeeen} ideeen (${stats.aantalIdeeenGebouwd} gebouwd, ${stats.aantalIdeeenActief} actief)`
    )
  );
  blocks.push(bullet(`${stats.aantalTaken} taken`));
  blocks.push(bullet(`${stats.aantalLeads} leads`));
  blocks.push(bullet(`${stats.aantalMeetings} meetings verwerkt`));
  blocks.push(bullet(`${stats.aantalRadarItems} Learning Radar items`));
  blocks.push(bullet(`${stats.aantalModules} dashboard modules`));
  blocks.push(bullet(`~${stats.aantalApiEndpoints} API endpoints`));
  blocks.push(bullet(`${stats.aantalDbTabellen} database tabellen`));
  blocks.push(divider());

  // Recente ontwikkelingen
  if (recentCommits.length > 0) {
    blocks.push(heading2("Recente Ontwikkelingen (laatste 7 dagen)"));
    for (const commit of recentCommits) {
      blocks.push(bullet(commit));
    }
    blocks.push(divider());
  }

  // Tech stack
  blocks.push(heading2("Tech Stack"));
  blocks.push(
    paragraph(
      "Next.js 16, React 19, SQLite, Drizzle ORM, Tailwind CSS, Framer Motion, Anthropic SDK, Tauri"
    )
  );

  return blocks;
}

// --- Notion sync logic ---

async function syncToNotion(
  stats: DashboardStats,
  recentCommits: string[]
): Promise<string> {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DB_PLANNEN;

  if (!apiKey || !dbId) {
    return "overgeslagen (NOTION_API_KEY of NOTION_DB_PLANNEN niet ingesteld)";
  }

  const notion = new Client({ auth: apiKey });
  const allBlocks = generateBlocks(stats, recentCommits);

  // Search for existing page
  const existing = await notion.databases.query({
    database_id: dbId,
    filter: {
      property: "Titel",
      title: { contains: "Autronis Dashboard" },
    },
  });

  if (existing.results.length > 0) {
    const pageId = existing.results[0].id;

    // Delete existing blocks
    const currentBlocks = await notion.blocks.children.list({
      block_id: pageId,
    });
    for (const block of currentBlocks.results) {
      await notion.blocks.delete({ block_id: block.id });
    }

    // Append new blocks in batches of 100
    for (let i = 0; i < allBlocks.length; i += 100) {
      const batch = allBlocks.slice(i, i + 100);
      await notion.blocks.children.append({
        block_id: pageId,
        children: batch,
      });
    }

    return `bijgewerkt (page ${pageId})`;
  } else {
    // Create new page
    const firstBatch = allBlocks.slice(0, 100);
    const page = await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        Titel: {
          title: [
            {
              text: {
                content: "Autronis Dashboard — Project Status",
              },
            },
          ],
        },
        Status: { select: { name: "Actief" } },
        "Aangemaakt door": {
          rich_text: [{ text: { content: "Auto-sync" } }],
        },
        "Aangemaakt op": {
          date: { start: new Date().toISOString().split("T")[0] },
        },
        "Document type": {
          rich_text: [{ text: { content: "plan" } }],
        },
        Samenvatting: {
          rich_text: [
            { text: { content: "Automatisch bijgewerkt project overzicht" } },
          ],
        },
      },
      children: firstBatch,
    });

    // Append remaining blocks in batches
    for (let i = 100; i < allBlocks.length; i += 100) {
      const batch = allBlocks.slice(i, i + 100);
      await notion.blocks.children.append({
        block_id: page.id,
        children: batch,
      });
    }

    return `aangemaakt (page ${page.id})`;
  }
}

// --- Route handler ---

export async function POST() {
  try {
    await requireAuth();

    const stats = collectStats();
    const recentCommits = getRecentCommits();
    const result = await syncToNotion(stats, recentCommits);

    return NextResponse.json({ succes: true, notionSync: result });
  } catch (error) {
    return NextResponse.json(
      {
        fout:
          error instanceof Error ? error.message : "Onbekende fout",
      },
      {
        status:
          error instanceof Error &&
          error.message === "Niet geauthenticeerd"
            ? 401
            : 500,
      }
    );
  }
}
