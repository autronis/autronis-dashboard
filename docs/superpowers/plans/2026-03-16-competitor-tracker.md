# AI Competitor Tracker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/concurrenten` page that tracks competitor websites, job listings, and social media activity with AI-powered analysis.

**Architecture:** Monoliet + scan-per-concurrent. All scan logic, AI calls, and storage in Next.js API routes (same pattern as briefing/radar). Sequential scanning with per-competitor status tracking. Frontend polls for live progress.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM (SQLite), React Query, Anthropic SDK, Tailwind CSS with autronis-* tokens.

**Spec:** `docs/superpowers/specs/2026-03-16-competitor-tracker-design.md`

---

## Chunk 1: Database & CRUD API

### Task 1: Database Schema — 3 nieuwe tabellen

**Files:**
- Modify: `src/lib/db/schema.ts` (append at end)

- [ ] **Step 1: Add `concurrenten` table to schema**

Add at the end of `src/lib/db/schema.ts`:

```typescript
// ============ CONCURRENTEN ============

export const concurrenten = sqliteTable("concurrenten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  naam: text("naam").notNull(),
  websiteUrl: text("website_url").notNull(),
  linkedinUrl: text("linkedin_url"),
  instagramHandle: text("instagram_handle"),
  scanPaginas: text("scan_paginas").default('["diensten","over-ons","pricing","cases"]'),
  notities: text("notities"),
  isActief: integer("is_actief").default(1),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

export const concurrentSnapshots = sqliteTable("concurrent_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  concurrentId: integer("concurrent_id").references(() => concurrenten.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  contentHash: text("content_hash").notNull(),
  extractedText: text("extracted_text").notNull(),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_snapshots_concurrent_url").on(table.concurrentId, table.url),
]);

export const concurrentScans = sqliteTable("concurrent_scans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  concurrentId: integer("concurrent_id").references(() => concurrenten.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["bezig", "voltooid", "mislukt"] }).default("bezig"),
  scanDatum: text("scan_datum").notNull(),
  websiteChanges: text("website_changes"),
  vacatures: text("vacatures"),
  socialActivity: text("social_activity"),
  aiSamenvatting: text("ai_samenvatting"),
  aiHighlights: text("ai_highlights"),
  trendIndicator: text("trend_indicator", { enum: ["groeiend", "stabiel", "krimpend"] }),
  kansen: text("kansen"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_scans_concurrent").on(table.concurrentId),
]);
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

- [ ] **Step 3: Push schema to database**

Run: `npx drizzle-kit push`
Expected: 3 tables created (concurrenten, concurrent_snapshots, concurrent_scans)

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(concurrenten): add database schema — concurrenten, snapshots, scans tables"
```

---

### Task 2: CRUD API — GET (lijst) + POST (nieuw)

**Files:**
- Create: `src/app/api/concurrenten/route.ts`

- [ ] **Step 1: Create the CRUD API route**

Create `src/app/api/concurrenten/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { concurrenten, concurrentScans } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

// GET /api/concurrenten — lijst actieve concurrenten + laatste scan
export async function GET() {
  try {
    await requireAuth();

    const rows = db
      .select()
      .from(concurrenten)
      .where(eq(concurrenten.isActief, 1))
      .orderBy(concurrenten.naam)
      .all();

    // Haal laatste scan per concurrent op
    const metLaatsteScan = rows.map((c) => {
      const laatsteScan = db
        .select()
        .from(concurrentScans)
        .where(eq(concurrentScans.concurrentId, c.id))
        .orderBy(desc(concurrentScans.aangemaaktOp))
        .limit(1)
        .get();

      return { ...c, laatsteScan: laatsteScan ?? null };
    });

    const kpis = {
      totaal: rows.length,
      wijzigingenDezeWeek: 0, // Berekend in dashboard endpoint
      groeiend: metLaatsteScan.filter((c) => c.laatsteScan?.trendIndicator === "groeiend").length,
      laatsteScan: metLaatsteScan
        .map((c) => c.laatsteScan?.aangemaaktOp)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null,
    };

    return NextResponse.json({ concurrenten: metLaatsteScan, kpis });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// POST /api/concurrenten — nieuwe concurrent toevoegen
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    if (!body.naam?.trim()) {
      return NextResponse.json({ fout: "Naam is verplicht." }, { status: 400 });
    }
    if (!body.websiteUrl?.trim()) {
      return NextResponse.json({ fout: "Website URL is verplicht." }, { status: 400 });
    }

    const [nieuw] = await db
      .insert(concurrenten)
      .values({
        naam: body.naam.trim(),
        websiteUrl: body.websiteUrl.trim(),
        linkedinUrl: body.linkedinUrl?.trim() || null,
        instagramHandle: body.instagramHandle?.trim()?.replace(/^@/, "") || null,
        scanPaginas: body.scanPaginas ? JSON.stringify(body.scanPaginas) : undefined,
        notities: body.notities?.trim() || null,
      })
      .returning();

    return NextResponse.json({ concurrent: nieuw }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/concurrenten/route.ts
git commit -m "feat(concurrenten): add CRUD API — GET list + POST create"
```

---

### Task 3: CRUD API — [id] GET + PUT + DELETE

**Files:**
- Create: `src/app/api/concurrenten/[id]/route.ts`

- [ ] **Step 1: Create the [id] route**

Create `src/app/api/concurrenten/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { concurrenten, concurrentScans } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/concurrenten/[id] — detail + alle scans
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;
    const concurrentId = parseInt(id, 10);

    const concurrent = db
      .select()
      .from(concurrenten)
      .where(eq(concurrenten.id, concurrentId))
      .get();

    if (!concurrent) {
      return NextResponse.json({ fout: "Concurrent niet gevonden" }, { status: 404 });
    }

    const scans = db
      .select()
      .from(concurrentScans)
      .where(eq(concurrentScans.concurrentId, concurrentId))
      .orderBy(desc(concurrentScans.aangemaaktOp))
      .all();

    return NextResponse.json({ concurrent, scans });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// PUT /api/concurrenten/[id] — bijwerken
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;
    const concurrentId = parseInt(id, 10);
    const body = await req.json();

    const updated = db
      .update(concurrenten)
      .set({
        ...(body.naam !== undefined && { naam: body.naam.trim() }),
        ...(body.websiteUrl !== undefined && { websiteUrl: body.websiteUrl.trim() }),
        ...(body.linkedinUrl !== undefined && { linkedinUrl: body.linkedinUrl?.trim() || null }),
        ...(body.instagramHandle !== undefined && {
          instagramHandle: body.instagramHandle?.trim()?.replace(/^@/, "") || null,
        }),
        ...(body.scanPaginas !== undefined && { scanPaginas: JSON.stringify(body.scanPaginas) }),
        ...(body.notities !== undefined && { notities: body.notities?.trim() || null }),
        bijgewerktOp: new Date().toISOString(),
      })
      .where(eq(concurrenten.id, concurrentId))
      .returning()
      .get();

    if (!updated) {
      return NextResponse.json({ fout: "Concurrent niet gevonden" }, { status: 404 });
    }

    return NextResponse.json({ concurrent: updated });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

// DELETE /api/concurrenten/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;
    const concurrentId = parseInt(id, 10);

    db.update(concurrenten)
      .set({ isActief: 0, bijgewerktOp: new Date().toISOString() })
      .where(eq(concurrenten.id, concurrentId))
      .run();

    return NextResponse.json({ succes: true });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/concurrenten/[id]/route.ts
git commit -m "feat(concurrenten): add [id] API — GET detail, PUT update, DELETE soft-delete"
```

---

### Task 4: React Query Hook

**Files:**
- Create: `src/hooks/queries/use-concurrenten.ts`

- [ ] **Step 1: Create the query hook**

Create `src/hooks/queries/use-concurrenten.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============ TYPES ============

interface ConcurrentScan {
  id: number;
  concurrentId: number;
  status: string;
  scanDatum: string;
  websiteChanges: string | null;
  vacatures: string | null;
  socialActivity: string | null;
  aiSamenvatting: string | null;
  aiHighlights: string | null;
  trendIndicator: string | null;
  kansen: string | null;
  aangemaaktOp: string | null;
}

interface Concurrent {
  id: number;
  naam: string;
  websiteUrl: string;
  linkedinUrl: string | null;
  instagramHandle: string | null;
  scanPaginas: string | null;
  notities: string | null;
  isActief: number | null;
  aangemaaktOp: string | null;
  bijgewerktOp: string | null;
  laatsteScan: ConcurrentScan | null;
}

interface ConcurrentenData {
  concurrenten: Concurrent[];
  kpis: {
    totaal: number;
    wijzigingenDezeWeek: number;
    groeiend: number;
    laatsteScan: string | null;
  };
}

interface ConcurrentDetail {
  concurrent: Concurrent;
  scans: ConcurrentScan[];
}

interface ScanStatus {
  actief: boolean;
  concurrenten: Array<{
    id: number;
    naam: string;
    status: "wachtend" | "bezig" | "voltooid" | "mislukt";
    stap?: string;
    fout?: string;
  }>;
}

// ============ FETCH FUNCTIONS ============

async function fetchConcurrenten(): Promise<ConcurrentenData> {
  const res = await fetch("/api/concurrenten");
  if (!res.ok) throw new Error("Kon concurrenten niet laden");
  return res.json();
}

async function fetchConcurrentDetail(id: number): Promise<ConcurrentDetail> {
  const res = await fetch(`/api/concurrenten/${id}`);
  if (!res.ok) throw new Error("Kon concurrent niet laden");
  return res.json();
}

async function fetchScanStatus(): Promise<ScanStatus> {
  const res = await fetch("/api/concurrenten/scan/status");
  if (!res.ok) throw new Error("Kon scan status niet laden");
  return res.json();
}

// ============ HOOKS ============

export function useConcurrenten() {
  return useQuery({
    queryKey: ["concurrenten"],
    queryFn: fetchConcurrenten,
    staleTime: 30_000,
  });
}

export function useConcurrentDetail(id: number | null) {
  return useQuery({
    queryKey: ["concurrent", id],
    queryFn: () => fetchConcurrentDetail(id!),
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useScanStatus(enabled: boolean) {
  return useQuery({
    queryKey: ["scan-status"],
    queryFn: fetchScanStatus,
    enabled,
    refetchInterval: 2000, // Poll elke 2 seconden als scan actief
  });
}

export function useCreateConcurrent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      naam: string;
      websiteUrl: string;
      linkedinUrl?: string;
      instagramHandle?: string;
      scanPaginas?: string[];
      notities?: string;
    }) => {
      const res = await fetch("/api/concurrenten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.fout || "Fout bij aanmaken");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurrenten"] });
    },
  });
}

export function useUpdateConcurrent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: unknown }) => {
      const res = await fetch(`/api/concurrenten/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.fout || "Fout bij bijwerken");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurrenten"] });
    },
  });
}

export function useDeleteConcurrent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/concurrenten/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.fout || "Fout bij verwijderen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concurrenten"] });
    },
  });
}

export function useStartScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (concurrentId?: number) => {
      const url = concurrentId
        ? `/api/concurrenten/scan/${concurrentId}`
        : "/api/concurrenten/scan";
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.fout || "Fout bij starten scan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scan-status"] });
    },
  });
}

export type { Concurrent, ConcurrentScan, ConcurrentenData, ConcurrentDetail, ScanStatus };
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries/use-concurrenten.ts
git commit -m "feat(concurrenten): add React Query hooks — CRUD, scan status, polling"
```

---

## Chunk 2: Scan Pipeline & AI

### Task 5: Scan Engine — core scan logic

**Files:**
- Create: `src/lib/scan-concurrent.ts`

This file contains the core scanning logic, separate from the API route for testability. It exports one main function `scanConcurrent()` that runs all 3 scan steps + AI analysis.

- [ ] **Step 1: Create the scan engine**

Create `src/lib/scan-concurrent.ts`:

```typescript
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { concurrenten, concurrentSnapshots, concurrentScans } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

// ============ TYPES ============

interface WebsiteChange {
  url: string;
  veranderd: boolean;
  samenvatting?: string;
}

interface Vacature {
  titel: string;
  url: string;
  bron: string;
  nieuw: boolean;
}

interface SocialData {
  platform: string;
  beschikbaar: boolean;
  data?: Record<string, unknown>;
  fout?: string;
}

interface ScanResult {
  websiteChanges: WebsiteChange[] | null;
  vacatures: Vacature[] | null;
  socialActivity: SocialData[] | null;
  aiSamenvatting: string | null;
  aiHighlights: string[] | null;
  trendIndicator: "groeiend" | "stabiel" | "krimpend" | null;
  kansen: string[] | null;
}

type StapCallback = (stap: string) => void;

// ============ HELPERS ============

const FETCH_TIMEOUT = 10_000; // 10 seconden
const FETCH_DELAY = 2_000; // 2 seconden pauze tussen fetches

async function fetchWithTimeout(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
      },
    });

    clearTimeout(timeoutId);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============ STAP 1: WEBSITE CHANGES ============

async function scanWebsite(
  concurrent: { id: number; websiteUrl: string; scanPaginas: string | null }
): Promise<WebsiteChange[]> {
  const baseUrl = concurrent.websiteUrl.replace(/\/$/, "");
  const paginas: string[] = concurrent.scanPaginas
    ? JSON.parse(concurrent.scanPaginas)
    : ["diensten", "over-ons", "pricing", "cases"];

  const urls = [baseUrl, ...paginas.map((p) => `${baseUrl}/${p.replace(/^\//, "")}`)];
  const changes: WebsiteChange[] = [];

  for (const url of urls) {
    const html = await fetchWithTimeout(url);
    if (!html) {
      changes.push({ url, veranderd: false, samenvatting: "Niet bereikbaar" });
      await sleep(FETCH_DELAY);
      continue;
    }

    const text = stripHtml(html);
    const hash = hashText(text);

    // Haal vorige snapshot op
    const vorige = db
      .select()
      .from(concurrentSnapshots)
      .where(and(
        eq(concurrentSnapshots.concurrentId, concurrent.id),
        eq(concurrentSnapshots.url, url)
      ))
      .orderBy(desc(concurrentSnapshots.aangemaaktOp))
      .limit(1)
      .get();

    const veranderd = !vorige || vorige.contentHash !== hash;

    // Sla nieuwe snapshot op
    db.insert(concurrentSnapshots).values({
      concurrentId: concurrent.id,
      url,
      contentHash: hash,
      extractedText: text.substring(0, 50_000), // Max 50k chars
    }).run();

    // Cleanup: bewaar alleen laatste 2 snapshots per URL
    const alleSnapshots = db
      .select({ id: concurrentSnapshots.id })
      .from(concurrentSnapshots)
      .where(and(
        eq(concurrentSnapshots.concurrentId, concurrent.id),
        eq(concurrentSnapshots.url, url)
      ))
      .orderBy(desc(concurrentSnapshots.aangemaaktOp))
      .all();

    if (alleSnapshots.length > 2) {
      const teVerwijderen = alleSnapshots.slice(2).map((s) => s.id);
      for (const snapId of teVerwijderen) {
        db.delete(concurrentSnapshots)
          .where(eq(concurrentSnapshots.id, snapId))
          .run();
      }
    }

    changes.push({
      url,
      veranderd,
      samenvatting: veranderd
        ? vorige
          ? `Inhoud gewijzigd (${text.length} tekens)`
          : "Eerste scan — baseline vastgelegd"
        : "Geen wijzigingen",
    });

    await sleep(FETCH_DELAY);
  }

  return changes;
}

// ============ STAP 2: VACATURES (BEST-EFFORT) ============

async function scanVacatures(
  concurrent: { naam: string }
): Promise<Vacature[] | null> {
  try {
    // Indeed.nl search
    const zoekterm = encodeURIComponent(concurrent.naam);
    const indeedUrl = `https://nl.indeed.com/vacatures?q=${zoekterm}&fromage=7`; // Laatste 7 dagen

    const html = await fetchWithTimeout(indeedUrl);
    if (!html) return null;

    // Extract vacature-titels uit Indeed HTML (best-effort parsing)
    const vacatures: Vacature[] = [];
    const titleRegex = /<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>.*?<a[^>]*href="([^"]*)"[^>]*>.*?<span[^>]*>([^<]+)<\/span>/gi;
    let match;
    while ((match = titleRegex.exec(html)) !== null) {
      vacatures.push({
        titel: match[2].trim(),
        url: match[1].startsWith("http") ? match[1] : `https://nl.indeed.com${match[1]}`,
        bron: "Indeed",
        nieuw: true, // Markeer als nieuw; vergelijking komt in AI stap
      });
    }

    return vacatures.length > 0 ? vacatures : [];
  } catch {
    return null;
  }
}

// ============ STAP 3: SOCIAL ACTIVITY (BEST-EFFORT) ============

async function scanSocial(
  concurrent: { instagramHandle: string | null; linkedinUrl: string | null }
): Promise<SocialData[]> {
  const results: SocialData[] = [];

  // Instagram (best-effort)
  if (concurrent.instagramHandle) {
    try {
      const html = await fetchWithTimeout(
        `https://www.instagram.com/${concurrent.instagramHandle}/`
      );
      if (html) {
        // Extract basic metadata uit HTML (very best-effort)
        const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*/i);
        results.push({
          platform: "instagram",
          beschikbaar: true,
          data: { bio: descMatch?.[1] || "Geen data beschikbaar" },
        });
      } else {
        results.push({ platform: "instagram", beschikbaar: false, fout: "Niet bereikbaar" });
      }
    } catch {
      results.push({ platform: "instagram", beschikbaar: false, fout: "Scraping mislukt" });
    }
  }

  // LinkedIn (best-effort)
  if (concurrent.linkedinUrl) {
    try {
      const html = await fetchWithTimeout(concurrent.linkedinUrl);
      if (html) {
        const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*/i);
        results.push({
          platform: "linkedin",
          beschikbaar: true,
          data: { omschrijving: descMatch?.[1] || "Geen data beschikbaar" },
        });
      } else {
        results.push({ platform: "linkedin", beschikbaar: false, fout: "Niet bereikbaar" });
      }
    } catch {
      results.push({ platform: "linkedin", beschikbaar: false, fout: "Scraping mislukt" });
    }
  }

  return results;
}

// ============ STAP 4: AI ANALYSE ============

export async function analyseMetAI(
  concurrent: { naam: string; websiteUrl: string },
  websiteChanges: WebsiteChange[] | null,
  vacatures: Vacature[] | null,
  socialActivity: SocialData[] | null,
  vorigeSamenvatting: string | null
): Promise<{
  aiSamenvatting: string;
  aiHighlights: string[];
  trendIndicator: "groeiend" | "stabiel" | "krimpend";
  kansen: string[];
}> {
  const anthropic = new Anthropic();

  const prompt = `Je bent een competitive intelligence analist voor Autronis (AI & automatiseringsbureau, 2-mans bedrijf).
Analyseer de volgende scan-data van concurrent "${concurrent.naam}" (${concurrent.websiteUrl}).

## Website changes
${websiteChanges ? JSON.stringify(websiteChanges, null, 2) : "Geen data (scan mislukt)"}

## Vacatures
${vacatures ? JSON.stringify(vacatures, null, 2) : "Geen data (scan mislukt)"}

## Social activity
${socialActivity ? JSON.stringify(socialActivity, null, 2) : "Geen data (scan mislukt)"}

## Vorige scan samenvatting
${vorigeSamenvatting || "Eerste scan — geen historie"}

Genereer een JSON response (ALLEEN valid JSON, geen markdown):
{
  "aiSamenvatting": "2-3 zinnen samenvatting in het Nederlands",
  "aiHighlights": ["opvallend punt 1", "opvallend punt 2"],
  "trendIndicator": "groeiend" | "stabiel" | "krimpend",
  "kansen": ["kans voor Autronis 1", "kans 2"]
}

Regels:
- Schrijf in het Nederlands
- Focus op wat relevant is voor een AI/automatiseringsbureau
- Als er weinig data is, geef een korte baseline samenvatting
- Highlights moeten actionable zijn
- Kansen moeten specifiek zijn voor Autronis`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    // Parse JSON response (strip mogelijke markdown code blocks)
    const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch {
    return {
      aiSamenvatting: "Analyse kon niet worden gegenereerd.",
      aiHighlights: [],
      trendIndicator: "stabiel",
      kansen: [],
    };
  }
}

// ============ MAIN SCAN FUNCTION ============

export async function scanConcurrent(
  concurrentId: number,
  onStap?: StapCallback
): Promise<ScanResult> {
  const concurrent = db
    .select()
    .from(concurrenten)
    .where(eq(concurrenten.id, concurrentId))
    .get();

  if (!concurrent) throw new Error("Concurrent niet gevonden");

  // Haal vorige scan op voor context
  const vorigeScan = db
    .select()
    .from(concurrentScans)
    .where(and(
      eq(concurrentScans.concurrentId, concurrentId),
      eq(concurrentScans.status, "voltooid")
    ))
    .orderBy(desc(concurrentScans.aangemaaktOp))
    .limit(1)
    .get();

  // Stap 1: Website changes
  onStap?.("website");
  let websiteChanges: WebsiteChange[] | null = null;
  try {
    websiteChanges = await scanWebsite(concurrent);
  } catch {
    websiteChanges = null;
  }

  // Stap 2: Vacatures
  onStap?.("vacatures");
  let vacatures: Vacature[] | null = null;
  try {
    vacatures = await scanVacatures(concurrent);
  } catch {
    vacatures = null;
  }

  // Stap 3: Social
  onStap?.("social");
  let socialActivity: SocialData[] | null = null;
  try {
    socialActivity = await scanSocial(concurrent);
  } catch {
    socialActivity = null;
  }

  // Stap 4: AI analyse
  onStap?.("ai");
  let aiResult = {
    aiSamenvatting: null as string | null,
    aiHighlights: null as string[] | null,
    trendIndicator: null as "groeiend" | "stabiel" | "krimpend" | null,
    kansen: null as string[] | null,
  };

  try {
    const result = await analyseMetAI(
      concurrent,
      websiteChanges,
      vacatures,
      socialActivity,
      vorigeScan?.aiSamenvatting ?? null
    );
    aiResult = result;
  } catch {
    // AI analyse mislukt — ga door zonder
  }

  return {
    websiteChanges,
    vacatures,
    socialActivity,
    ...aiResult,
  };
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/scan-concurrent.ts
git commit -m "feat(concurrenten): add scan engine — website diff, vacatures, social, AI analysis"
```

---

### Task 6: Scan API Routes — start scan + status polling

**Files:**
- Create: `src/app/api/concurrenten/scan/route.ts`
- Create: `src/app/api/concurrenten/scan/[id]/route.ts`
- Create: `src/app/api/concurrenten/scan/status/route.ts`

- [ ] **Step 1: Create in-memory scan state + scan-all route**

Create `src/app/api/concurrenten/scan/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { concurrenten, concurrentScans } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { scanConcurrent } from "@/lib/scan-concurrent";

// In-memory scan state (process-level singleton)
export interface ScanState {
  actief: boolean;
  concurrenten: Array<{
    id: number;
    naam: string;
    status: "wachtend" | "bezig" | "voltooid" | "mislukt";
    stap?: string;
    fout?: string;
  }>;
}

// Globale state — wordt gereset bij nieuwe scan
declare global {
  // eslint-disable-next-line no-var
  var scanState: ScanState | undefined;
}

export function getScanState(): ScanState {
  return globalThis.scanState ?? { actief: false, concurrenten: [] };
}

// POST /api/concurrenten/scan — start scan voor alle actieve concurrenten
export async function POST() {
  try {
    await requireAuth();

    // Guard: check of er al een scan loopt
    if (globalThis.scanState?.actief) {
      return NextResponse.json({ fout: "Scan is al bezig" }, { status: 409 });
    }

    const actieveConcurrenten = db
      .select()
      .from(concurrenten)
      .where(eq(concurrenten.isActief, 1))
      .all();

    if (actieveConcurrenten.length === 0) {
      return NextResponse.json({ fout: "Geen actieve concurrenten" }, { status: 400 });
    }

    // Initialiseer scan state
    globalThis.scanState = {
      actief: true,
      concurrenten: actieveConcurrenten.map((c) => ({
        id: c.id,
        naam: c.naam,
        status: "wachtend" as const,
      })),
    };

    // Start scan async (fire-and-forget, state wordt gepolled)
    runScanAll(actieveConcurrenten).catch(() => {
      if (globalThis.scanState) globalThis.scanState.actief = false;
    });

    return NextResponse.json({ gestart: true, aantal: actieveConcurrenten.length });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

async function runScanAll(
  lijst: Array<{ id: number; naam: string; websiteUrl: string }>
) {
  const state = globalThis.scanState!;

  for (const concurrent of lijst) {
    const stateItem = state.concurrenten.find((c) => c.id === concurrent.id);
    if (!stateItem) continue;

    stateItem.status = "bezig";

    // Maak scan record aan
    const [scanRecord] = await db
      .insert(concurrentScans)
      .values({
        concurrentId: concurrent.id,
        status: "bezig",
        scanDatum: new Date().toISOString(),
      })
      .returning();

    try {
      const result = await scanConcurrent(concurrent.id, (stap) => {
        stateItem.stap = stap;
      });

      // Update scan record met resultaten
      db.update(concurrentScans)
        .set({
          status: "voltooid",
          websiteChanges: result.websiteChanges ? JSON.stringify(result.websiteChanges) : null,
          vacatures: result.vacatures ? JSON.stringify(result.vacatures) : null,
          socialActivity: result.socialActivity ? JSON.stringify(result.socialActivity) : null,
          aiSamenvatting: result.aiSamenvatting,
          aiHighlights: result.aiHighlights ? JSON.stringify(result.aiHighlights) : null,
          trendIndicator: result.trendIndicator,
          kansen: result.kansen ? JSON.stringify(result.kansen) : null,
        })
        .where(eq(concurrentScans.id, scanRecord.id))
        .run();

      stateItem.status = "voltooid";
      stateItem.stap = undefined;
    } catch (error) {
      db.update(concurrentScans)
        .set({ status: "mislukt" })
        .where(eq(concurrentScans.id, scanRecord.id))
        .run();

      stateItem.status = "mislukt";
      stateItem.fout = error instanceof Error ? error.message : "Onbekende fout";
      stateItem.stap = undefined;
    }
  }

  state.actief = false;
}
```

- [ ] **Step 2: Create scan-one route**

Create `src/app/api/concurrenten/scan/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { concurrenten, concurrentScans } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { scanConcurrent } from "@/lib/scan-concurrent";
import { getScanState } from "../route";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/concurrenten/scan/[id] — scan één concurrent
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;
    const concurrentId = parseInt(id, 10);

    // Guard: check of deze concurrent al gescand wordt
    const state = getScanState();
    if (state.actief) {
      const item = state.concurrenten.find((c) => c.id === concurrentId);
      if (item?.status === "bezig") {
        return NextResponse.json({ fout: "Deze concurrent wordt al gescand" }, { status: 409 });
      }
    }

    const concurrent = db
      .select()
      .from(concurrenten)
      .where(eq(concurrenten.id, concurrentId))
      .get();

    if (!concurrent) {
      return NextResponse.json({ fout: "Concurrent niet gevonden" }, { status: 404 });
    }

    // Maak scan record
    const [scanRecord] = await db
      .insert(concurrentScans)
      .values({
        concurrentId,
        status: "bezig",
        scanDatum: new Date().toISOString(),
      })
      .returning();

    // Run scan (blocking voor single concurrent — duurt ~30s max)
    try {
      const result = await scanConcurrent(concurrentId);

      db.update(concurrentScans)
        .set({
          status: "voltooid",
          websiteChanges: result.websiteChanges ? JSON.stringify(result.websiteChanges) : null,
          vacatures: result.vacatures ? JSON.stringify(result.vacatures) : null,
          socialActivity: result.socialActivity ? JSON.stringify(result.socialActivity) : null,
          aiSamenvatting: result.aiSamenvatting,
          aiHighlights: result.aiHighlights ? JSON.stringify(result.aiHighlights) : null,
          trendIndicator: result.trendIndicator,
          kansen: result.kansen ? JSON.stringify(result.kansen) : null,
        })
        .where(eq(concurrentScans.id, scanRecord.id))
        .run();

      return NextResponse.json({ scan: { ...scanRecord, ...result, status: "voltooid" } });
    } catch (error) {
      db.update(concurrentScans)
        .set({ status: "mislukt" })
        .where(eq(concurrentScans.id, scanRecord.id))
        .run();

      return NextResponse.json(
        { fout: error instanceof Error ? error.message : "Scan mislukt" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
```

- [ ] **Step 3: Create status polling route**

Create `src/app/api/concurrenten/scan/status/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getScanState } from "../route";

// GET /api/concurrenten/scan/status — polling endpoint
export async function GET() {
  try {
    await requireAuth();
    return NextResponse.json(getScanState());
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
```

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/concurrenten/scan/
git commit -m "feat(concurrenten): add scan API — start all, start one, status polling"
```

---

### Task 7: Webhook Route

**Files:**
- Create: `src/app/api/concurrenten/webhook/route.ts`

- [ ] **Step 1: Create webhook route**

Create `src/app/api/concurrenten/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { concurrenten, concurrentScans } from "@/lib/db/schema";
import { requireApiKey } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { scanConcurrent, analyseMetAI } from "@/lib/scan-concurrent";

// Helper: run scan for one concurrent with persistent scan record
async function runScanForConcurrent(concurrentId: number) {
  const [scanRecord] = await db.insert(concurrentScans).values({
    concurrentId,
    status: "bezig",
    scanDatum: new Date().toISOString(),
  }).returning();

  try {
    const result = await scanConcurrent(concurrentId);
    db.update(concurrentScans).set({
      status: "voltooid",
      websiteChanges: result.websiteChanges ? JSON.stringify(result.websiteChanges) : null,
      vacatures: result.vacatures ? JSON.stringify(result.vacatures) : null,
      socialActivity: result.socialActivity ? JSON.stringify(result.socialActivity) : null,
      aiSamenvatting: result.aiSamenvatting,
      aiHighlights: result.aiHighlights ? JSON.stringify(result.aiHighlights) : null,
      trendIndicator: result.trendIndicator,
      kansen: result.kansen ? JSON.stringify(result.kansen) : null,
    }).where(eq(concurrentScans.id, scanRecord.id)).run();
    return { ...scanRecord, ...result, status: "voltooid" };
  } catch (error) {
    db.update(concurrentScans).set({ status: "mislukt" })
      .where(eq(concurrentScans.id, scanRecord.id)).run();
    return { ...scanRecord, status: "mislukt", fout: error instanceof Error ? error.message : "Onbekende fout" };
  }
}

// POST /api/concurrenten/webhook — n8n trigger of data mode
export async function POST(req: NextRequest) {
  try {
    await requireApiKey(req);
    const body = await req.json();

    if (!body.action) {
      return NextResponse.json({ fout: "action is verplicht (scan of data)" }, { status: 400 });
    }

    // TRIGGER MODE: start scan (same pipeline as in-app, with persistent records)
    if (body.action === "scan") {
      if (body.concurrentId) {
        const scan = await runScanForConcurrent(body.concurrentId);
        return NextResponse.json({ scan });
      }

      // Scan all
      const actieve = db.select().from(concurrenten).where(eq(concurrenten.isActief, 1)).all();
      const results = [];
      for (const c of actieve) {
        const scan = await runScanForConcurrent(c.id);
        results.push(scan);
      }
      return NextResponse.json({ scans: results });
    }

    // DATA MODE: ontvang data van n8n, genereer AI samenvatting
    if (body.action === "data") {
      if (!body.concurrentId) {
        return NextResponse.json({ fout: "concurrentId is verplicht" }, { status: 400 });
      }

      const concurrent = db.select().from(concurrenten)
        .where(eq(concurrenten.id, body.concurrentId)).get();
      if (!concurrent) {
        return NextResponse.json({ fout: "Concurrent niet gevonden" }, { status: 404 });
      }

      // Reuse the shared AI analysis function
      let aiResult = {
        aiSamenvatting: null as string | null,
        aiHighlights: null as string[] | null,
        trendIndicator: "stabiel" as "groeiend" | "stabiel" | "krimpend",
        kansen: null as string[] | null,
      };
      try {
        aiResult = await analyseMetAI(
          concurrent,
          body.websiteChanges || null,
          body.vacatures || null,
          body.socialActivity || null,
          null
        );
      } catch {
        // AI mislukt — ga door zonder
      }

      const [scan] = await db.insert(concurrentScans).values({
        concurrentId: body.concurrentId,
        status: "voltooid",
        scanDatum: new Date().toISOString(),
        websiteChanges: body.websiteChanges ? JSON.stringify(body.websiteChanges) : null,
        vacatures: body.vacatures ? JSON.stringify(body.vacatures) : null,
        socialActivity: body.socialActivity ? JSON.stringify(body.socialActivity) : null,
        aiSamenvatting: aiResult.aiSamenvatting,
        aiHighlights: aiResult.aiHighlights ? JSON.stringify(aiResult.aiHighlights) : null,
        trendIndicator: aiResult.trendIndicator,
        kansen: aiResult.kansen ? JSON.stringify(aiResult.kansen) : null,
      }).returning();

      return NextResponse.json({ scan });
    }

    return NextResponse.json({ fout: "Ongeldige action — gebruik 'scan' of 'data'" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "API key vereist" ? 401 : 500 }
    );
  }
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/concurrenten/webhook/route.ts
git commit -m "feat(concurrenten): add webhook — trigger mode + data mode for n8n"
```

---

## Chunk 3: Frontend — Overview Page

### Task 8: Sidebar Navigation Item

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add import and nav item**

In `src/components/layout/sidebar.tsx`:

1. Add `Eye` to the lucide-react import (line 8-35):

```typescript
import {
  // ... existing imports ...
  Eye,
} from "lucide-react";
```

2. Add the nav item in the "Groei" section (after line 60, the `Ideeën` item):

```typescript
  { label: "Concurrenten", icon: Eye, href: "/concurrenten" },
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(concurrenten): add sidebar navigation item in Groei section"
```

---

### Task 9: Overview Page — /concurrenten

**Files:**
- Create: `src/app/(dashboard)/concurrenten/page.tsx`

- [ ] **Step 1: Create the overview page**

Create `src/app/(dashboard)/concurrenten/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  Eye,
  TrendingUp,
  Minus,
  TrendingDown,
  ExternalLink,
  Trash2,
  Edit2,
  X,
  Loader2,
} from "lucide-react";
import { cn, formatDatum } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageTransition } from "@/components/ui/page-transition";
import {
  useConcurrenten,
  useCreateConcurrent,
  useUpdateConcurrent,
  useDeleteConcurrent,
  useStartScan,
  useScanStatus,
  type Concurrent,
} from "@/hooks/queries/use-concurrenten";

// ============ TREND BADGE ============

function TrendBadge({ trend }: { trend: string | null }) {
  if (!trend) return null;
  const config = {
    groeiend: { icon: TrendingUp, label: "Groeiend", cls: "bg-green-500/15 text-green-400" },
    stabiel: { icon: Minus, label: "Stabiel", cls: "bg-yellow-500/15 text-yellow-400" },
    krimpend: { icon: TrendingDown, label: "Krimpend", cls: "bg-red-500/15 text-red-400" },
  }[trend];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", config.cls)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ============ SCAN PROGRESS ============

function ScanProgress() {
  const { data: status } = useScanStatus(true);
  if (!status?.actief) return null;

  return (
    <div className="rounded-2xl border border-autronis-border bg-autronis-card p-5">
      <h3 className="mb-3 text-sm font-semibold">Scan bezig...</h3>
      <div className="space-y-2">
        {status.concurrenten.map((c) => (
          <div key={c.id} className="flex items-center gap-3 text-sm">
            {c.status === "voltooid" && <span className="text-green-400">✓</span>}
            {c.status === "bezig" && <Loader2 className="h-3.5 w-3.5 animate-spin text-autronis-accent" />}
            {c.status === "wachtend" && <span className="text-autronis-text-secondary">○</span>}
            {c.status === "mislukt" && <span className="text-red-400">✗</span>}
            <span className={cn(
              c.status === "bezig" && "text-autronis-accent",
              c.status === "mislukt" && "text-red-400",
              c.status === "wachtend" && "text-autronis-text-secondary",
            )}>
              {c.naam}
              {c.stap && <span className="ml-1 text-autronis-text-secondary">— {c.stap}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ CONCURRENT FORM MODAL ============

function ConcurrentFormModal({
  open,
  onClose,
  concurrent,
}: {
  open: boolean;
  onClose: () => void;
  concurrent?: Concurrent;
}) {
  const { addToast } = useToast();
  const createMutation = useCreateConcurrent();
  const updateMutation = useUpdateConcurrent();

  const [naam, setNaam] = useState(concurrent?.naam ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(concurrent?.websiteUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(concurrent?.linkedinUrl ?? "");
  const [instagramHandle, setInstagramHandle] = useState(concurrent?.instagramHandle ?? "");
  const [notities, setNotities] = useState(concurrent?.notities ?? "");

  if (!open) return null;

  const isEdit = !!concurrent;
  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: concurrent!.id,
          naam,
          websiteUrl,
          linkedinUrl: linkedinUrl || undefined,
          instagramHandle: instagramHandle || undefined,
          notities: notities || undefined,
        });
        addToast("Concurrent bijgewerkt", "succes");
      } else {
        await createMutation.mutateAsync({
          naam,
          websiteUrl,
          linkedinUrl: linkedinUrl || undefined,
          instagramHandle: instagramHandle || undefined,
          notities: notities || undefined,
        });
        addToast("Concurrent toegevoegd", "succes");
      }
      onClose();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Fout bij opslaan", "fout");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-autronis-border bg-autronis-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Concurrent bewerken" : "Concurrent toevoegen"}
          </h2>
          <button onClick={onClose} className="text-autronis-text-secondary hover:text-autronis-text-primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-autronis-text-secondary">Naam *</label>
            <input
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              required
              className="w-full rounded-lg border border-autronis-border bg-autronis-bg px-3 py-2 text-sm"
              placeholder="Bedrijfsnaam"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-autronis-text-secondary">Website URL *</label>
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              required
              className="w-full rounded-lg border border-autronis-border bg-autronis-bg px-3 py-2 text-sm"
              placeholder="https://example.nl"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-autronis-text-secondary">LinkedIn URL</label>
            <input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="w-full rounded-lg border border-autronis-border bg-autronis-bg px-3 py-2 text-sm"
              placeholder="https://linkedin.com/company/..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-autronis-text-secondary">Instagram handle</label>
            <input
              value={instagramHandle}
              onChange={(e) => setInstagramHandle(e.target.value)}
              className="w-full rounded-lg border border-autronis-border bg-autronis-bg px-3 py-2 text-sm"
              placeholder="@handle"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-autronis-text-secondary">Notities</label>
            <textarea
              value={notities}
              onChange={(e) => setNotities(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-autronis-border bg-autronis-bg px-3 py-2 text-sm"
              placeholder="Optionele context over deze concurrent..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg bg-autronis-border px-4 py-2 text-sm">
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-autronis-accent px-4 py-2 text-sm font-semibold text-autronis-bg disabled:opacity-50"
            >
              {isPending ? "Opslaan..." : isEdit ? "Bijwerken" : "Toevoegen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ CONCURRENT CARD ============

function ConcurrentCard({
  concurrent,
  onEdit,
  onDelete,
  onScan,
}: {
  concurrent: Concurrent;
  onEdit: () => void;
  onDelete: () => void;
  onScan: () => void;
}) {
  const scan = concurrent.laatsteScan;
  const highlights: string[] = scan?.aiHighlights ? JSON.parse(scan.aiHighlights) : [];

  return (
    <div className="card-glow rounded-2xl border border-autronis-border bg-autronis-card p-6 transition-colors">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{concurrent.naam}</h3>
          <a
            href={concurrent.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-autronis-text-secondary hover:text-autronis-accent transition-colors"
          >
            {concurrent.websiteUrl.replace(/^https?:\/\//, "")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <TrendBadge trend={scan?.trendIndicator ?? null} />
      </div>

      {/* AI samenvatting */}
      {scan?.aiSamenvatting && (
        <p className="mb-4 text-sm leading-relaxed text-autronis-text-secondary">
          {scan.aiSamenvatting}
        </p>
      )}

      {/* Scan categorie badges */}
      {scan && (
        <div className="mb-4 flex flex-wrap gap-2">
          {scan.websiteChanges && (() => {
            const changes: Array<{ veranderd: boolean }> = JSON.parse(scan.websiteChanges);
            const count = changes.filter((c) => c.veranderd).length;
            return (
              <span className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                count > 0 ? "bg-autronis-accent/15 text-autronis-accent" : "bg-autronis-border/50 text-autronis-text-secondary/60"
              )}>
                🌐 {count > 0 ? `${count} wijzigingen` : "Geen wijzigingen"}
              </span>
            );
          })()}
          {scan.vacatures && (() => {
            const vacs: Array<{ titel: string }> = JSON.parse(scan.vacatures);
            return (
              <span className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium",
                vacs.length > 0 ? "bg-autronis-accent/15 text-autronis-accent" : "bg-autronis-border/50 text-autronis-text-secondary/60"
              )}>
                💼 {vacs.length > 0 ? `${vacs.length} vacatures` : "0 vacatures"}
              </span>
            );
          })()}
          {scan.socialActivity && (
            <span className="rounded-md bg-autronis-border/50 px-2.5 py-1 text-xs font-medium text-autronis-text-secondary/60">
              📱 Social data
            </span>
          )}
        </div>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <div className="mb-4 space-y-2">
          {highlights.slice(0, 2).map((h, i) => (
            <div key={i} className="rounded-lg border-l-2 border-autronis-accent bg-autronis-bg px-3 py-2 text-xs leading-relaxed">
              ⚡ {h}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-autronis-text-secondary/60">
          {scan ? `Gescand: ${formatDatum(scan.aangemaaktOp ?? "")}` : "Nog niet gescand"}
        </span>
        <div className="flex gap-1.5">
          <Link
            href={`/concurrenten/${concurrent.id}`}
            className="rounded-lg bg-autronis-border/50 px-3 py-1.5 text-xs text-autronis-text-secondary hover:bg-white/5 transition-colors"
          >
            Details →
          </Link>
          <button
            onClick={onScan}
            className="rounded-lg bg-autronis-border/50 px-3 py-1.5 text-xs text-autronis-text-secondary hover:bg-white/5 transition-colors"
          >
            ⟳ Scan
          </button>
          <button
            onClick={onEdit}
            className="rounded-lg bg-autronis-border/50 px-2 py-1.5 text-xs text-autronis-text-secondary hover:bg-white/5 transition-colors"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg bg-autronis-border/50 px-2 py-1.5 text-xs text-red-400/60 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============

export default function ConcurrentenPage() {
  const { data, isLoading } = useConcurrenten();
  const [scanActive, setScanActive] = useState(false);
  const { data: scanStatus } = useScanStatus(scanActive);
  const startScan = useStartScan();
  const deleteMutation = useDeleteConcurrent();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editConcurrent, setEditConcurrent] = useState<Concurrent | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // Stop polling when scan completes
  if (scanActive && scanStatus && !scanStatus.actief) {
    setScanActive(false);
  }

  function handleScanAll() {
    startScan.mutate(undefined, {
      onSuccess: () => { addToast("Scan gestart", "succes"); setScanActive(true); },
      onError: (err) => addToast(err.message, "fout"),
    });
  }

  function handleScanOne(id: number) {
    startScan.mutate(id, {
      onSuccess: () => addToast("Scan gestart", "succes"),
      onError: (err) => addToast(err.message, "fout"),
    });
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        addToast("Concurrent verwijderd", "succes");
        setConfirmDelete(null);
      },
      onError: (err) => addToast(err.message, "fout"),
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-autronis-border border-t-autronis-accent" />
      </div>
    );
  }

  const kpis = data?.kpis;
  const concurrenten = data?.concurrenten ?? [];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Concurrenten</h1>
            <p className="text-sm text-autronis-text-secondary">AI-gestuurde competitor monitoring</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleScanAll}
              disabled={startScan.isPending || scanStatus?.actief}
              className="flex items-center gap-2 rounded-xl border border-autronis-accent/30 bg-autronis-accent/10 px-4 py-2.5 text-sm font-semibold text-autronis-accent hover:bg-autronis-accent/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", scanStatus?.actief && "animate-spin")} />
              Scan alles
            </button>
            <button
              onClick={() => { setEditConcurrent(undefined); setModalOpen(true); }}
              className="flex items-center gap-2 rounded-xl bg-autronis-accent px-4 py-2.5 text-sm font-semibold text-autronis-bg hover:bg-autronis-accent-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
              Concurrent
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-autronis-border bg-autronis-card p-5">
            <p className="text-xs text-autronis-text-secondary">Actieve concurrenten</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{kpis?.totaal ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-autronis-border bg-autronis-card p-5">
            <p className="text-xs text-autronis-text-secondary">Wijzigingen deze week</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-autronis-accent">{kpis?.wijzigingenDezeWeek ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-autronis-border bg-autronis-card p-5">
            <p className="text-xs text-autronis-text-secondary">Groeiend</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-green-400">{kpis?.groeiend ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-autronis-border bg-autronis-card p-5">
            <p className="text-xs text-autronis-text-secondary">Laatste scan</p>
            <p className="mt-1 text-base font-bold tabular-nums">
              {kpis?.laatsteScan ? formatDatum(kpis.laatsteScan) : "—"}
            </p>
          </div>
        </div>

        {/* Scan Progress */}
        {scanStatus?.actief && <ScanProgress />}

        {/* Cards Grid */}
        {concurrenten.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-autronis-border bg-autronis-card/50 py-16">
            <Eye className="mb-4 h-12 w-12 text-autronis-text-secondary/30" />
            <p className="text-autronis-text-secondary">Nog geen concurrenten toegevoegd</p>
            <button
              onClick={() => { setEditConcurrent(undefined); setModalOpen(true); }}
              className="mt-4 rounded-lg bg-autronis-accent px-4 py-2 text-sm font-semibold text-autronis-bg"
            >
              Eerste concurrent toevoegen
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {concurrenten.map((c) => (
              <ConcurrentCard
                key={c.id}
                concurrent={c}
                onEdit={() => { setEditConcurrent(c); setModalOpen(true); }}
                onDelete={() => setConfirmDelete(c.id)}
                onScan={() => handleScanOne(c.id)}
              />
            ))}
          </div>
        )}

        {/* Modal — key forces remount on open/edit to reset form state */}
        {modalOpen && (
          <ConcurrentFormModal
            key={editConcurrent?.id ?? "new"}
            open={modalOpen}
            onClose={() => { setModalOpen(false); setEditConcurrent(undefined); }}
            concurrent={editConcurrent}
          />
        )}

        {/* Confirm Delete */}
        <ConfirmDialog
          open={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
          titel="Concurrent verwijderen?"
          bericht="Deze concurrent wordt gedeactiveerd. Scan-historie blijft bewaard."
        />
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run dev server and visually verify**

Run: `npm run dev`
Navigate to: `http://localhost:3000/concurrenten`
Expected: page loads with empty state, "Eerste concurrent toevoegen" button visible

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/concurrenten/page.tsx
git commit -m "feat(concurrenten): add overview page — cards, KPIs, scan progress, CRUD modal"
```

---

## Chunk 4: Frontend — Detail Page & Dashboard Widget

### Task 10: Detail Page — /concurrenten/[id]

**Files:**
- Create: `src/app/(dashboard)/concurrenten/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

Create `src/app/(dashboard)/concurrenten/[id]/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Edit2,
  Calendar,
} from "lucide-react";
import { cn, formatDatum } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";
import {
  useConcurrentDetail,
  useStartScan,
  type ConcurrentScan,
} from "@/hooks/queries/use-concurrenten";

// ============ TABS ============

const tabs = [
  { key: "historie", label: "Scan historie" },
  { key: "website", label: "Website changes" },
  { key: "vacatures", label: "Vacatures" },
  { key: "social", label: "Social" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

// ============ TIMELINE ============

function ScanTimeline({ scans }: { scans: ConcurrentScan[] }) {
  if (scans.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-autronis-text-secondary">
        Nog geen scans uitgevoerd
      </p>
    );
  }

  return (
    <div className="relative space-y-6 pl-6">
      <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-autronis-border" />
      {scans.map((scan, i) => {
        const highlights: string[] = scan.aiHighlights ? JSON.parse(scan.aiHighlights) : [];
        return (
          <div key={scan.id} className="relative">
            <div
              className={cn(
                "absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-autronis-bg",
                i === 0 ? "bg-autronis-accent" : "bg-autronis-border"
              )}
            />
            <div className="flex items-center gap-2 text-xs text-autronis-text-secondary/60">
              <Calendar className="h-3 w-3" />
              {formatDatum(scan.scanDatum)}
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                scan.status === "voltooid" && "bg-green-500/15 text-green-400",
                scan.status === "mislukt" && "bg-red-500/15 text-red-400",
                scan.status === "bezig" && "bg-yellow-500/15 text-yellow-400",
              )}>
                {scan.status}
              </span>
            </div>
            {scan.aiSamenvatting && (
              <p className="mt-2 text-sm leading-relaxed text-autronis-text-secondary">
                {scan.aiSamenvatting}
              </p>
            )}
            {highlights.length > 0 && (
              <div className="mt-2 space-y-1">
                {highlights.map((h, j) => (
                  <div key={j} className="rounded-lg border-l-2 border-autronis-accent bg-autronis-bg px-3 py-1.5 text-xs">
                    ⚡ {h}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============ WEBSITE CHANGES TAB ============

function WebsiteChangesTab({ scans }: { scans: ConcurrentScan[] }) {
  const latestWithData = scans.find((s) => s.websiteChanges);
  if (!latestWithData?.websiteChanges) {
    return <p className="py-8 text-center text-sm text-autronis-text-secondary">Geen website data beschikbaar</p>;
  }

  const changes: Array<{ url: string; veranderd: boolean; samenvatting?: string }> =
    JSON.parse(latestWithData.websiteChanges);

  return (
    <div className="space-y-3">
      <p className="text-xs text-autronis-text-secondary">Laatste scan: {formatDatum(latestWithData.scanDatum)}</p>
      {changes.map((c, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-autronis-border bg-autronis-bg p-4">
          <div>
            <a href={c.url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-sm font-medium hover:text-autronis-accent transition-colors">
              {c.url.replace(/^https?:\/\/[^/]+/, "")} <ExternalLink className="h-3 w-3" />
            </a>
            <p className="mt-1 text-xs text-autronis-text-secondary">{c.samenvatting}</p>
          </div>
          <span className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            c.veranderd ? "bg-autronis-accent/15 text-autronis-accent" : "bg-autronis-border/50 text-autronis-text-secondary/60"
          )}>
            {c.veranderd ? "Gewijzigd" : "Ongewijzigd"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============ VACATURES TAB ============

function VacaturesTab({ scans }: { scans: ConcurrentScan[] }) {
  const latestWithData = scans.find((s) => s.vacatures);
  if (!latestWithData?.vacatures) {
    return <p className="py-8 text-center text-sm text-autronis-text-secondary">Geen vacature data beschikbaar</p>;
  }

  const vacatures: Array<{ titel: string; url: string; bron: string }> =
    JSON.parse(latestWithData.vacatures);

  if (vacatures.length === 0) {
    return <p className="py-8 text-center text-sm text-autronis-text-secondary">Geen vacatures gevonden</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-autronis-text-secondary">Laatste scan: {formatDatum(latestWithData.scanDatum)}</p>
      {vacatures.map((v, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-autronis-border bg-autronis-bg p-4">
          <div>
            <a href={v.url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-sm font-medium hover:text-autronis-accent transition-colors">
              {v.titel} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <span className="rounded-full bg-autronis-border/50 px-2.5 py-0.5 text-xs text-autronis-text-secondary">
            {v.bron}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============ SOCIAL TAB ============

function SocialTab({ scans }: { scans: ConcurrentScan[] }) {
  const latestWithData = scans.find((s) => s.socialActivity);
  if (!latestWithData?.socialActivity) {
    return <p className="py-8 text-center text-sm text-autronis-text-secondary">Geen social data beschikbaar</p>;
  }

  const social: Array<{ platform: string; beschikbaar: boolean; data?: Record<string, unknown>; fout?: string }> =
    JSON.parse(latestWithData.socialActivity);

  return (
    <div className="space-y-3">
      <p className="text-xs text-autronis-text-secondary">Laatste scan: {formatDatum(latestWithData.scanDatum)}</p>
      {social.map((s, i) => (
        <div key={i} className="rounded-xl border border-autronis-border bg-autronis-bg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium capitalize">{s.platform}</span>
            <span className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              s.beschikbaar ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
            )}>
              {s.beschikbaar ? "Beschikbaar" : "Niet beschikbaar"}
            </span>
          </div>
          {s.fout && <p className="mt-1 text-xs text-red-400">{s.fout}</p>}
          {s.data && (
            <pre className="mt-2 rounded-lg bg-autronis-bg p-2 text-xs text-autronis-text-secondary overflow-x-auto">
              {JSON.stringify(s.data, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ MAIN PAGE ============

export default function ConcurrentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { data, isLoading } = useConcurrentDetail(id ? parseInt(id, 10) : null);
  const startScan = useStartScan();

  const [activeTab, setActiveTab] = useState<TabKey>("historie");

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-autronis-border border-t-autronis-accent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-autronis-text-secondary">Concurrent niet gevonden</p>
        <Link href="/concurrenten" className="text-sm text-autronis-accent hover:underline">
          ← Terug naar overzicht
        </Link>
      </div>
    );
  }

  const { concurrent, scans } = data;

  function handleScan() {
    startScan.mutate(concurrent.id, {
      onSuccess: () => addToast("Scan gestart", "succes"),
      onError: (err) => addToast(err.message, "fout"),
    });
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/concurrenten"
              className="mb-2 inline-flex items-center gap-1 text-sm text-autronis-text-secondary hover:text-autronis-accent transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Terug
            </Link>
            <h1 className="text-2xl font-bold">{concurrent.naam}</h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-autronis-text-secondary">
              <a href={concurrent.websiteUrl} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1 hover:text-autronis-accent transition-colors">
                {concurrent.websiteUrl.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
              </a>
              {concurrent.linkedinUrl && (
                <a href={concurrent.linkedinUrl} target="_blank" rel="noopener noreferrer"
                   className="hover:text-autronis-accent transition-colors">LinkedIn</a>
              )}
              {concurrent.instagramHandle && (
                <a href={`https://instagram.com/${concurrent.instagramHandle}`} target="_blank" rel="noopener noreferrer"
                   className="hover:text-autronis-accent transition-colors">@{concurrent.instagramHandle}</a>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleScan}
              disabled={startScan.isPending}
              className="flex items-center gap-2 rounded-xl border border-autronis-accent/30 bg-autronis-accent/10 px-4 py-2.5 text-sm font-semibold text-autronis-accent hover:bg-autronis-accent/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", startScan.isPending && "animate-spin")} />
              Scan nu
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-autronis-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "border-b-2 px-5 py-3 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-autronis-accent text-autronis-accent"
                  : "border-transparent text-autronis-text-secondary hover:text-autronis-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl border border-autronis-border bg-autronis-card p-6">
          {activeTab === "historie" && <ScanTimeline scans={scans} />}
          {activeTab === "website" && <WebsiteChangesTab scans={scans} />}
          {activeTab === "vacatures" && <VacaturesTab scans={scans} />}
          {activeTab === "social" && <SocialTab scans={scans} />}
        </div>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/concurrenten/[id]/page.tsx
git commit -m "feat(concurrenten): add detail page — scan timeline, website/vacatures/social tabs"
```

---

### Task 11: Dashboard Widget + API

**Files:**
- Create: `src/app/api/dashboard/concurrenten/route.ts`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create dashboard API route**

Create `src/app/api/dashboard/concurrenten/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { concurrentScans, concurrenten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, gte, desc } from "drizzle-orm";

// GET /api/dashboard/concurrenten — widget data
export async function GET() {
  try {
    await requireAuth();

    // Scans van de afgelopen 7 dagen
    const weekGeleden = new Date();
    weekGeleden.setDate(weekGeleden.getDate() - 7);
    const weekGeledenStr = weekGeleden.toISOString();

    const recenteScans = db
      .select()
      .from(concurrentScans)
      .where(and(
        eq(concurrentScans.status, "voltooid"),
        gte(concurrentScans.aangemaaktOp, weekGeledenStr)
      ))
      .orderBy(desc(concurrentScans.aangemaaktOp))
      .all();

    // Tel wijzigingen
    let wijzigingenDezeWeek = 0;
    const highlights: Array<{ concurrentNaam: string; tekst: string; type: "waarschuwing" | "kans" }> = [];

    for (const scan of recenteScans) {
      // Tel website changes
      if (scan.websiteChanges) {
        const changes: Array<{ veranderd: boolean }> = JSON.parse(scan.websiteChanges);
        wijzigingenDezeWeek += changes.filter((c) => c.veranderd).length;
      }

      // Haal concurrent naam op
      const concurrent = db.select({ naam: concurrenten.naam })
        .from(concurrenten)
        .where(eq(concurrenten.id, scan.concurrentId!))
        .get();

      // Voeg highlights toe
      if (scan.aiHighlights) {
        const scanHighlights: string[] = JSON.parse(scan.aiHighlights);
        for (const h of scanHighlights.slice(0, 2)) {
          highlights.push({
            concurrentNaam: concurrent?.naam ?? "Onbekend",
            tekst: h,
            type: "waarschuwing",
          });
        }
      }

      // Voeg kansen toe
      if (scan.kansen) {
        const kansen: string[] = JSON.parse(scan.kansen);
        for (const k of kansen.slice(0, 1)) {
          highlights.push({
            concurrentNaam: concurrent?.naam ?? "Onbekend",
            tekst: k,
            type: "kans",
          });
        }
      }
    }

    const laatsteScan = recenteScans[0]?.aangemaaktOp ?? null;

    return NextResponse.json({
      wijzigingenDezeWeek,
      highlights: highlights.slice(0, 4), // Max 4 items
      laatsteScan,
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
```

- [ ] **Step 2: Add widget to dashboard homepage**

Modify `src/app/(dashboard)/page.tsx`. Read the file first to find exact insertion points. The dashboard is large (~56KB), so identify the pattern used for existing widgets (briefing, radar, ideas).

Changes needed:

1. **Import** — add `Eye` to the lucide-react import and `Link` if not present
2. **State** — add `concurrentData` state variable alongside existing state:
```typescript
const [concurrentData, setConcurrentData] = useState<{
  wijzigingenDezeWeek: number;
  highlights: Array<{ concurrentNaam: string; tekst: string; type: string }>;
  laatsteScan: string | null;
} | null>(null);
```
3. **Fetch** — add to the existing `useEffect` or `useCallback` that loads dashboard data:
```typescript
fetch("/api/dashboard/concurrenten")
  .then((r) => r.json())
  .then(setConcurrentData)
  .catch(() => {});
```
4. **Render** — add the widget section near other widget sections (briefing/radar). Look for existing `<section>` blocks and add adjacent:
```tsx
{concurrentData && concurrentData.highlights.length > 0 && (
  <section className="rounded-2xl border border-autronis-border bg-autronis-card p-6">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="flex items-center gap-2 font-semibold">
        <Eye className="h-4 w-4 text-autronis-accent" />
        Concurrent updates
      </h3>
      <span className="rounded-full bg-autronis-accent/15 px-2.5 py-0.5 text-xs font-semibold text-autronis-accent">
        {concurrentData.wijzigingenDezeWeek} nieuw
      </span>
    </div>
    <div className="space-y-3">
      {concurrentData.highlights.map((h, i) => (
        <div key={i} className="flex items-start gap-2.5 text-sm">
          <span className={cn(
            "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
            h.type === "kans" ? "bg-green-400" : "bg-autronis-accent"
          )} />
          <span className="text-autronis-text-secondary">
            <strong className="text-autronis-text-primary">{h.concurrentNaam}</strong>{" "}
            {h.tekst}
          </span>
        </div>
      ))}
    </div>
    <Link href="/concurrenten" className="mt-4 block text-xs text-autronis-accent hover:underline">
      Bekijk alle concurrenten →
    </Link>
  </section>
)}
```

**Note:** The dashboard page is ~56KB. Read it to find exact insertion points. Follow the pattern of existing widgets.

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/concurrenten/route.ts src/app/(dashboard)/page.tsx
git commit -m "feat(concurrenten): add dashboard widget — highlights + wijzigingen count"
```

---

## Chunk 5: Integrations & Final Verification

### Task 12: Briefing + Radar Integration

**Files:**
- Modify: `src/app/api/briefing/route.ts`

**Note:** The briefing route structure must be read first during implementation. The following describes the *logic* to add — the implementer must read `src/app/api/briefing/route.ts` to find exact insertion points.

- [ ] **Step 1: Read the briefing route and add competitor context**

Read `src/app/api/briefing/route.ts` to understand its current structure. Then make these changes:

1. Add imports at the top:
```typescript
import { concurrentScans, concurrenten as concurrentenTabel } from "@/lib/db/schema";
import { gte } from "drizzle-orm";
```

2. In the data-gathering section (before the AI prompt is built), add:
```typescript
const weekGeleden = new Date();
weekGeleden.setDate(weekGeleden.getDate() - 7);
const concurrentUpdates = db
  .select({
    naam: concurrentenTabel.naam,
    samenvatting: concurrentScans.aiSamenvatting,
    highlights: concurrentScans.aiHighlights,
    kansen: concurrentScans.kansen,
  })
  .from(concurrentScans)
  .innerJoin(concurrentenTabel, eq(concurrentScans.concurrentId, concurrentenTabel.id))
  .where(and(
    eq(concurrentScans.status, "voltooid"),
    gte(concurrentScans.aangemaaktOp, weekGeleden.toISOString())
  ))
  .all();
```

3. In the AI prompt string, add a conditional section:
```typescript
const concurrentSectie = concurrentUpdates.length > 0
  ? `\n## Concurrent updates deze week\n${concurrentUpdates.map((u) =>
      `- ${u.naam}: ${u.samenvatting || "Geen samenvatting"}`
    ).join("\n")}\nNeem de belangrijkste concurrent-update op in je briefing als die relevant is.`
  : "";
// Append concurrentSectie to the prompt
```

**Learning Radar integration:** The Learning Radar koppeling happens naturally through the AI prompt — when competitor scan data mentions tools that also appear in radar items, Claude will detect the overlap. No separate code is needed; the briefing prompt already has access to both data sources. If you want to make this more explicit, include radar item names in the competitor scan prompt context.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/briefing/route.ts
git commit -m "feat(concurrenten): integrate competitor updates into daily briefing"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS — zero errors

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: PASS — successful build

- [ ] **Step 3: Manual verification checklist**

Run `npm run dev` and verify:

1. `/concurrenten` — page loads, empty state visible
2. Add a competitor — form modal works, toast shown
3. Edit/delete competitor — works correctly
4. Start scan — progress indicator shows, status updates
5. After scan — AI samenvatting, highlights, trend badge visible
6. `/concurrenten/[id]` — detail page loads with tabs
7. Dashboard widget — shows highlights if scans exist
8. Sidebar — "Concurrenten" item visible under "Groei"

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(concurrenten): polish and fixes from manual verification"
```
