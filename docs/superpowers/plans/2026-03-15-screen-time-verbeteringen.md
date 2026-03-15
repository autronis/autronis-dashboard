# Screen Time Verbeteringen — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the screen time tracker to Rize-level detail: session grouping, AI daily summaries, idle tracking, project detection from window titles, and an improved timeline UI.

**Architecture:** Extend existing screen time API with a sessions endpoint (computed on-the-fly from entries), add a summaries table + AI generation endpoint, modify the Tauri agent to log idle periods, add project detection in the sync endpoint, and rebuild the Overzicht tab with session cards + timeline.

**Tech Stack:** Next.js 16, Drizzle ORM + SQLite, Anthropic SDK, Tauri 2.0 (Rust), React 19, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-03-15-screen-time-verbeteringen-design.md`

---

## File Structure

### New Files
- `src/app/api/screen-time/sessies/route.ts` — Sessions endpoint (groups entries into sessions)
- `src/app/api/screen-time/samenvatting/route.ts` — AI daily summary GET + POST

### Modified Files
- `src/lib/db/schema.ts` — Add "inactief" to categorie enum, add `screen_time_samenvattingen` table
- `src/app/api/screen-time/sync/route.ts` — Add project detection from window titles
- `src/app/api/screen-time/route.ts` — Filter out "inactief" from totals
- `src/hooks/queries/use-screen-time.ts` — Add hooks for sessions + summaries
- `src/app/(dashboard)/schermtijd/page.tsx` — Rebuild Overzicht tab with sessions, timeline, summaries
- `src/types/index.ts` — Add session + summary types
- `desktop-agent/src-tauri/src/lib.rs` — Log idle periods instead of skipping
- `desktop-agent/src-tauri/src/storage.rs` — Support idle entries

---

## Chunk 1: Schema + Backend API

### Task 1: Add "inactief" categorie + samenvattingen table

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Add "inactief" to screenTimeEntries categorie enum**

In `src/lib/db/schema.ts`, find the `screenTimeEntries` table (around line 615). Change the categorie enum from:
```typescript
enum: ["development", "communicatie", "design", "administratie", "afleiding", "overig"],
```
to:
```typescript
enum: ["development", "communicatie", "design", "administratie", "afleiding", "overig", "inactief"],
```

- [ ] **Step 2: Add screenTimeSamenvattingen table**

Add after the `screenTimeSuggesties` table:

```typescript
export const screenTimeSamenvattingen = sqliteTable("screen_time_samenvattingen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  datum: text("datum").notNull(),
  samenvattingKort: text("samenvatting_kort"),
  samenvattingDetail: text("samenvatting_detail"),
  totaalSeconden: integer("totaal_seconden"),
  productiefPercentage: integer("productief_percentage"),
  topProject: text("top_project"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
}, (table) => ({
  uniekGebruikerDatum: uniqueIndex("uniek_gebruiker_datum").on(table.gebruikerId, table.datum),
}));
```

- [ ] **Step 3: Create the table in the actual database**

Run a quick script to add the table and update the enum:
```bash
node -e "
const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'data', 'autronis.db'));
db.exec(\`
  CREATE TABLE IF NOT EXISTS screen_time_samenvattingen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gebruiker_id INTEGER REFERENCES gebruikers(id),
    datum TEXT NOT NULL,
    samenvatting_kort TEXT,
    samenvatting_detail TEXT,
    totaal_seconden INTEGER,
    productief_percentage INTEGER,
    top_project TEXT,
    aangemaakt_op TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS uniek_gebruiker_datum ON screen_time_samenvattingen(gebruiker_id, datum);
\`);
console.log('Done');
db.close();
"
```

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat: add inactief categorie and samenvattingen table"
```

---

### Task 2: Add types for sessions and summaries

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add types**

Add to the end of the types file:

```typescript
export interface ScreenTimeSessie {
  app: string;
  categorie: ScreenTimeCategorie;
  projectId: number | null;
  projectNaam: string | null;
  klantNaam: string | null;
  startTijd: string;
  eindTijd: string;
  duurSeconden: number;
  venstertitels: string[];
  isIdle: boolean;
}

export interface ScreenTimeSamenvatting {
  id: number;
  gebruikerId: number;
  datum: string;
  samenvattingKort: string | null;
  samenvattingDetail: string | null;
  totaalSeconden: number | null;
  productiefPercentage: number | null;
  topProject: string | null;
  aangemaaktOp: string;
}
```

- [ ] **Step 2: Update ScreenTimeCategorie to include inactief**

Change:
```typescript
export type ScreenTimeCategorie = "development" | "communicatie" | "design" | "administratie" | "afleiding" | "overig";
```
to:
```typescript
export type ScreenTimeCategorie = "development" | "communicatie" | "design" | "administratie" | "afleiding" | "overig" | "inactief";
```

- [ ] **Step 3: Run TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/types/index.ts
git commit -m "feat: add session and summary types"
```

---

### Task 3: Sessions API endpoint

**Files:**
- Create: `src/app/api/screen-time/sessies/route.ts`

- [ ] **Step 1: Create the sessions endpoint**

This endpoint fetches raw entries for a single day and groups them into sessions on-the-fly.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenTimeEntries, projecten, klanten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, gte, lte, asc } from "drizzle-orm";

const SESSION_GAP_SECONDS = 120; // 2 minutes

interface RawEntry {
  app: string;
  vensterTitel: string | null;
  categorie: string;
  projectId: number | null;
  projectNaam: string | null;
  klantNaam: string | null;
  startTijd: string;
  eindTijd: string;
  duurSeconden: number;
}

interface Sessie {
  app: string;
  categorie: string;
  projectId: number | null;
  projectNaam: string | null;
  klantNaam: string | null;
  startTijd: string;
  eindTijd: string;
  duurSeconden: number;
  venstertitels: string[];
  isIdle: boolean;
}

interface SessionBuilder {
  app: string;
  projectId: number | null;
  projectNaam: string | null;
  klantNaam: string | null;
  startTijd: string;
  eindTijd: string;
  duurSeconden: number;
  venstertitels: string[];
  isIdle: boolean;
  categorieSeconden: Record<string, number>; // track seconds per category
}

function finalizeSessie(builder: SessionBuilder): Sessie {
  // Dominant category = most seconds
  const categorie = Object.entries(builder.categorieSeconden)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "overig";

  return {
    app: builder.app,
    categorie,
    projectId: builder.projectId,
    projectNaam: builder.projectNaam,
    klantNaam: builder.klantNaam,
    startTijd: builder.startTijd,
    eindTijd: builder.eindTijd,
    duurSeconden: builder.duurSeconden,
    venstertitels: builder.venstertitels,
    isIdle: builder.isIdle,
  };
}

function newBuilder(entry: RawEntry): SessionBuilder {
  return {
    app: entry.app,
    projectId: entry.projectId,
    projectNaam: entry.projectNaam,
    klantNaam: entry.klantNaam,
    startTijd: entry.startTijd,
    eindTijd: entry.eindTijd,
    duurSeconden: entry.duurSeconden,
    venstertitels: entry.vensterTitel ? [entry.vensterTitel] : [],
    isIdle: entry.app === "Inactief",
    categorieSeconden: { [entry.categorie]: entry.duurSeconden },
  };
}

function groupIntoSessions(entries: RawEntry[]): Sessie[] {
  if (entries.length === 0) return [];

  const sessions: Sessie[] = [];
  let current = newBuilder(entries[0]);

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    const prevEnd = new Date(current.eindTijd).getTime();
    const thisStart = new Date(entry.startTijd).getTime();
    const gapSeconds = (thisStart - prevEnd) / 1000;

    const sameApp = entry.app === current.app;
    const withinGap = gapSeconds <= SESSION_GAP_SECONDS;

    if (sameApp && withinGap) {
      // Extend current session
      current.eindTijd = entry.eindTijd;
      current.duurSeconden += entry.duurSeconden;
      current.categorieSeconden[entry.categorie] = (current.categorieSeconden[entry.categorie] || 0) + entry.duurSeconden;
      if (entry.vensterTitel && !current.venstertitels.includes(entry.vensterTitel)) {
        current.venstertitels.push(entry.vensterTitel);
      }
      if (!current.projectId && entry.projectId) {
        current.projectId = entry.projectId;
        current.projectNaam = entry.projectNaam;
        current.klantNaam = entry.klantNaam;
      }
    } else {
      // Finalize and start new session
      sessions.push(finalizeSessie(current));
      current = newBuilder(entry);
    }
  }
  sessions.push(finalizeSessie(current));

  return sessions;
}

export async function GET(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const { searchParams } = new URL(req.url);
    const datum = searchParams.get("datum");
    const gebruikerId = searchParams.get("gebruikerId");

    if (!datum) {
      return NextResponse.json({ fout: "Datum is verplicht" }, { status: 400 });
    }

    const conditions = [];
    if (gebruikerId && gebruiker.rol === "admin") {
      conditions.push(eq(screenTimeEntries.gebruikerId, parseInt(gebruikerId)));
    } else {
      conditions.push(eq(screenTimeEntries.gebruikerId, gebruiker.id));
    }
    conditions.push(gte(screenTimeEntries.startTijd, `${datum}T00:00:00`));
    conditions.push(lte(screenTimeEntries.startTijd, `${datum}T23:59:59`));

    const entries = db
      .select({
        app: screenTimeEntries.app,
        vensterTitel: screenTimeEntries.vensterTitel,
        categorie: screenTimeEntries.categorie,
        projectId: screenTimeEntries.projectId,
        projectNaam: projecten.naam,
        klantNaam: klanten.bedrijfsnaam,
        startTijd: screenTimeEntries.startTijd,
        eindTijd: screenTimeEntries.eindTijd,
        duurSeconden: screenTimeEntries.duurSeconden,
      })
      .from(screenTimeEntries)
      .leftJoin(projecten, eq(screenTimeEntries.projectId, projecten.id))
      .leftJoin(klanten, eq(screenTimeEntries.klantId, klanten.id))
      .where(and(...conditions))
      .orderBy(asc(screenTimeEntries.startTijd))
      .all();

    const sessies = groupIntoSessions(entries);

    // Compute stats excluding idle
    const actiefSessies = sessies.filter(s => !s.isIdle);
    const totaalActief = actiefSessies.reduce((sum, s) => sum + s.duurSeconden, 0);
    const totaalIdle = sessies.filter(s => s.isIdle).reduce((sum, s) => sum + s.duurSeconden, 0);
    const productiefSeconden = actiefSessies
      .filter(s => ["development", "design", "administratie"].includes(s.categorie))
      .reduce((sum, s) => sum + s.duurSeconden, 0);
    const productiefPercentage = totaalActief > 0 ? Math.round((productiefSeconden / totaalActief) * 100) : 0;

    return NextResponse.json({
      sessies,
      stats: {
        totaalActief,
        totaalIdle,
        productiefPercentage,
        aantalSessies: actiefSessies.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
```

- [ ] **Step 2: Run TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/app/api/screen-time/sessies/
git commit -m "feat: add sessions API endpoint with grouping logic"
```

---

### Task 4: AI Summary endpoint

**Files:**
- Create: `src/app/api/screen-time/samenvatting/route.ts`

- [ ] **Step 1: Create the summary endpoint**

GET retrieves an existing summary for a date. POST generates one via Claude.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenTimeSamenvattingen, screenTimeEntries, projecten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

export async function GET(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const datum = new URL(req.url).searchParams.get("datum");
    if (!datum) {
      return NextResponse.json({ fout: "Datum is verplicht" }, { status: 400 });
    }

    const samenvatting = db
      .select()
      .from(screenTimeSamenvattingen)
      .where(
        and(
          eq(screenTimeSamenvattingen.gebruikerId, gebruiker.id),
          eq(screenTimeSamenvattingen.datum, datum)
        )
      )
      .get();

    return NextResponse.json({ samenvatting: samenvatting || null });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const body = await req.json();
    const { datum } = body;
    if (!datum) {
      return NextResponse.json({ fout: "Datum is verplicht" }, { status: 400 });
    }

    // Gather day's data grouped by app+project
    const entries = db
      .select({
        app: screenTimeEntries.app,
        categorie: screenTimeEntries.categorie,
        vensterTitel: screenTimeEntries.vensterTitel,
        projectNaam: projecten.naam,
        duurSeconden: screenTimeEntries.duurSeconden,
      })
      .from(screenTimeEntries)
      .leftJoin(projecten, eq(screenTimeEntries.projectId, projecten.id))
      .where(
        and(
          eq(screenTimeEntries.gebruikerId, gebruiker.id),
          gte(screenTimeEntries.startTijd, `${datum}T00:00:00`),
          lte(screenTimeEntries.startTijd, `${datum}T23:59:59`)
        )
      )
      .all();

    if (entries.length === 0) {
      return NextResponse.json({ fout: "Geen data voor deze datum" }, { status: 404 });
    }

    // Aggregate per app+project
    const perApp: Record<string, { seconden: number; categorie: string; project: string | null; titels: Set<string> }> = {};
    let totaalSeconden = 0;
    let productiefSeconden = 0;

    for (const e of entries) {
      if (e.categorie === "inactief") continue;
      const key = `${e.app}|${e.projectNaam || ""}`;
      if (!perApp[key]) {
        perApp[key] = { seconden: 0, categorie: e.categorie, project: e.projectNaam, titels: new Set() };
      }
      perApp[key].seconden += e.duurSeconden;
      if (e.vensterTitel) perApp[key].titels.add(e.vensterTitel);
      totaalSeconden += e.duurSeconden;
      if (["development", "design", "administratie"].includes(e.categorie)) {
        productiefSeconden += e.duurSeconden;
      }
    }

    const productiefPercentage = totaalSeconden > 0 ? Math.round((productiefSeconden / totaalSeconden) * 100) : 0;
    const topProject = Object.values(perApp).sort((a, b) => b.seconden - a.seconden)[0]?.project || null;

    // Build context for Claude
    const activiteitenLijst = Object.entries(perApp)
      .sort(([, a], [, b]) => b.seconden - a.seconden)
      .map(([, v]) => {
        const uren = Math.floor(v.seconden / 3600);
        const minuten = Math.round((v.seconden % 3600) / 60);
        const duur = uren > 0 ? `${uren}u ${minuten}m` : `${minuten}m`;
        const titels = Array.from(v.titels).slice(0, 5).join(", ");
        return `- ${v.categorie}: ${duur} — App: ${v.project ? `${v.project} (via ` : ""}${titels}${v.project ? ")" : ""}`;
      })
      .join("\n");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ fout: "ANTHROPIC_API_KEY niet geconfigureerd" }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Je bent een productiviteitsassistent. Genereer een dagsamenvatting voor schermtijd data.

Datum: ${datum}
Totale actieve tijd: ${Math.floor(totaalSeconden / 3600)}u ${Math.round((totaalSeconden % 3600) / 60)}m
Productief: ${productiefPercentage}%

Activiteiten:
${activiteitenLijst}

Genereer JSON met exact deze structuur:
{
  "kort": "1-2 zinnen samenvatting in het Nederlands",
  "detail": "Markdown met per project/categorie een bullet met specifieke activiteiten. Gebruik **bold** voor projectnamen. Schrijf in het Nederlands."
}

Alleen JSON, geen uitleg.`,
      }],
    });

    const tekst = response.content[0].type === "text" ? response.content[0].text : "";
    let parsed: { kort: string; detail: string };
    try {
      const jsonMatch = tekst.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { kort: "Samenvatting niet beschikbaar", detail: "" };
    } catch {
      parsed = { kort: "Samenvatting niet beschikbaar", detail: "" };
    }

    // Upsert
    const bestaand = db
      .select({ id: screenTimeSamenvattingen.id })
      .from(screenTimeSamenvattingen)
      .where(and(
        eq(screenTimeSamenvattingen.gebruikerId, gebruiker.id),
        eq(screenTimeSamenvattingen.datum, datum)
      ))
      .get();

    if (bestaand) {
      db.update(screenTimeSamenvattingen)
        .set({
          samenvattingKort: parsed.kort,
          samenvattingDetail: parsed.detail,
          totaalSeconden,
          productiefPercentage,
          topProject,
        })
        .where(eq(screenTimeSamenvattingen.id, bestaand.id))
        .run();
    } else {
      db.insert(screenTimeSamenvattingen).values({
        gebruikerId: gebruiker.id,
        datum,
        samenvattingKort: parsed.kort,
        samenvattingDetail: parsed.detail,
        totaalSeconden,
        productiefPercentage,
        topProject,
      }).run();
    }

    const samenvatting = db
      .select()
      .from(screenTimeSamenvattingen)
      .where(and(
        eq(screenTimeSamenvattingen.gebruikerId, gebruiker.id),
        eq(screenTimeSamenvattingen.datum, datum)
      ))
      .get();

    return NextResponse.json({ samenvatting });
  } catch (error) {
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Onbekende fout" },
      { status: error instanceof Error && error.message === "Niet geauthenticeerd" ? 401 : 500 }
    );
  }
}
```

- [ ] **Step 2: Run TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/app/api/screen-time/samenvatting/
git commit -m "feat: add AI daily summary endpoint"
```

---

### Task 5: Add project detection to sync endpoint

**Files:**
- Modify: `src/app/api/screen-time/sync/route.ts`

- [ ] **Step 1: Add project detection after categorization**

Read the file first. After the categorization loop (where `categorie`, `projectId`, `klantId` are assigned from rules), add project detection from window titles. Add this logic before the INSERT:

```typescript
// Project detection from window title (if no project assigned by rules)
if (!projectId && entry.venstertitel) {
  const detected = detectProjectFromTitle(entry.app, entry.venstertitel, projectCache);
  if (detected) {
    projectId = detected.projectId;
    klantId = detected.klantId;
  }
}
```

Add the helper function and project cache at the top of the POST handler (after loading regels):

```typescript
// Cache projects for title matching
const projectCache = db
  .select({ id: projecten.id, naam: projecten.naam, klantId: projecten.klantId })
  .from(projecten)
  .where(eq(projecten.isActief, 1))
  .all();

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
```

Also add `import { projecten } from "@/lib/db/schema";` if not already imported.

- [ ] **Step 2: Run TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/app/api/screen-time/sync/route.ts
git commit -m "feat: add project detection from window titles in sync"
```

---

### Task 6: Filter inactief from existing GET endpoint

**Files:**
- Modify: `src/app/api/screen-time/route.ts`

- [ ] **Step 1: Exclude inactief entries from totals**

Read the file. In the aggregation loop (where `categorieOverzicht` and `totaalSeconden` are computed), skip entries with `categorie === "inactief"`:

Change:
```typescript
for (const entry of entries) {
  categorieOverzicht[entry.categorie] = ...
  appOverzicht[entry.app] = ...
  totaalSeconden += entry.duurSeconden;
}
```
to:
```typescript
for (const entry of entries) {
  categorieOverzicht[entry.categorie] = (categorieOverzicht[entry.categorie] || 0) + entry.duurSeconden;
  if (entry.categorie !== "inactief") {
    appOverzicht[entry.app] = (appOverzicht[entry.app] || 0) + entry.duurSeconden;
    totaalSeconden += entry.duurSeconden;
  }
}
```

- [ ] **Step 2: Run TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/app/api/screen-time/route.ts
git commit -m "feat: exclude inactief from screen time totals"
```

---

## Chunk 2: Desktop Agent — Idle Tracking

### Task 7: Modify Tauri agent to log idle periods

**Files:**
- Modify: `desktop-agent/src-tauri/src/lib.rs`

- [ ] **Step 1: Update the tracking loop to log idle**

Read `desktop-agent/src-tauri/src/lib.rs`. Find the tracking loop (around line 181-205). Currently it does:
```rust
let idle = tracker::get_idle_duration();
if idle.as_secs() > 60 {
    continue;
}
```

Replace with:
```rust
let idle = tracker::get_idle_duration();
if idle.as_secs() > 60 {
    // Log idle period instead of skipping
    let storage = state.storage.lock().unwrap();
    storage.record(
        "Inactief",
        "Geen activiteit",
        None,
        track_interval as i64,
    ).ok();
    continue;
}
```

This uses the existing merge logic in `storage.rs` — consecutive "Inactief" entries will be merged into one growing idle entry.

- [ ] **Step 2: Verify compilation**

```bash
export PATH="$HOME/.cargo/bin:$PATH"
cd desktop-agent/src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/semmi/OneDrive/Claude AI/Projects/autronis-dashboard"
git add desktop-agent/src-tauri/src/lib.rs
git commit -m "feat: log idle periods in desktop agent"
```

---

## Chunk 3: React Query Hooks

### Task 8: Add hooks for sessions and summaries

**Files:**
- Modify: `src/hooks/queries/use-screen-time.ts`

- [ ] **Step 1: Add session and summary hooks**

Read the file first. Add these hooks after the existing ones:

```typescript
// --- Sessies ---

import type { ScreenTimeSessie, ScreenTimeSamenvatting } from "@/types";

interface SessiesData {
  sessies: ScreenTimeSessie[];
  stats: {
    totaalActief: number;
    totaalIdle: number;
    productiefPercentage: number;
    aantalSessies: number;
  };
}

async function fetchSessies(datum: string, gebruikerId?: number): Promise<SessiesData> {
  const params = new URLSearchParams({ datum });
  if (gebruikerId) params.set("gebruikerId", String(gebruikerId));
  const res = await fetch(`/api/screen-time/sessies?${params}`);
  if (!res.ok) throw new Error("Kon sessies niet laden");
  return res.json();
}

export function useSessies(datum: string, gebruikerId?: number) {
  return useQuery({
    queryKey: ["screen-time-sessies", datum, gebruikerId],
    queryFn: () => fetchSessies(datum, gebruikerId),
    staleTime: 30_000,
  });
}

// --- Samenvattingen ---

async function fetchSamenvatting(datum: string): Promise<ScreenTimeSamenvatting | null> {
  const res = await fetch(`/api/screen-time/samenvatting?datum=${datum}`);
  if (!res.ok) throw new Error("Kon samenvatting niet laden");
  const data = await res.json();
  return data.samenvatting;
}

export function useSamenvatting(datum: string) {
  return useQuery({
    queryKey: ["screen-time-samenvatting", datum],
    queryFn: () => fetchSamenvatting(datum),
    staleTime: 60_000,
  });
}

export function useGenereerSamenvatting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datum: string) => {
      const res = await fetch("/api/screen-time/samenvatting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datum }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.fout || "Fout bij genereren");
      }
      return res.json();
    },
    onSuccess: (_data, datum) => {
      queryClient.invalidateQueries({ queryKey: ["screen-time-samenvatting", datum] });
    },
  });
}
```

- [ ] **Step 2: Run TypeScript check and commit**

```bash
npx tsc --noEmit
git add src/hooks/queries/use-screen-time.ts
git commit -m "feat: add React Query hooks for sessions and summaries"
```

---

## Chunk 4: UI — Rebuilt Overzicht Tab

### Task 9: Rebuild Overzicht tab with sessions, timeline, and summaries

**Files:**
- Modify: `src/app/(dashboard)/schermtijd/page.tsx`

- [ ] **Step 1: Rebuild the OverzichtTab component**

Read the current page first to understand the structure. Replace the `OverzichtTab` component with these sections (top to bottom):

**1. Dagsamenvatting kaart**
- Uses `useSamenvatting(datum)` to load existing summary
- Shows `samenvattingKort` in a card at the top
- "Meer details" toggle expands to show `samenvattingDetail` (rendered as markdown-ish text)
- "Samenvatting genereren" / "Opnieuw genereren" button using `useGenereerSamenvatting()`
- Lazy auto-generation: on mount, check sessionStorage for `lastSummaryCheck`. If not set for today's date, check if yesterday has a summary. If not, auto-generate. Set sessionStorage flag.

**2. KPI cards row**
- Uses stats from `useSessies(datum)`:
  - Totale actieve tijd (formatted as Xu Ym)
  - Idle tijd
  - Productief %
  - Aantal sessies

**3. Sessie-kaarten**
- List of sessions from `useSessies(datum)`
- Each card shows:
  - Colored dot (categorie kleur) + tijdrange (HH:MM - HH:MM)
  - Categorie badge + duur
  - App naam + project naam (if linked)
  - Bestanden/pagina's extracted from venstertitels (parse first part before ` — `)
  - Idle sessions as grey minimized cards ("Inactief — 15m")

**4. Tijdlijn**
- Horizontal bar spanning the day (first activity to last)
- Each session = colored block, width proportional to duration
- Idle sessions = grey blocks
- Category colors from existing `CATEGORIE_KLEUREN` map + `inactief: "#4B5563"` (grey)
- Hover tooltip with app, project, duur

**5. Top Apps** (keep existing, but add venstertitel details)

Use `useSessies()` instead of `useScreenTime()` for the Overzicht tab. Keep the other tabs using `useScreenTime()`.

Helper function for parsing filenames from titles:
```typescript
function parseBestandenUitTitels(titels: string[]): string[] {
  return [...new Set(titels.map(t => t.split(" — ")[0]?.trim()).filter(Boolean))];
}
```

Helper function for time formatting:
```typescript
function formatTijd(seconden: number): string {
  const u = Math.floor(seconden / 3600);
  const m = Math.round((seconden % 3600) / 60);
  if (u > 0) return `${u}u ${m}m`;
  return `${m}m`;
}
```

- [ ] **Step 2: Add "inactief" to CATEGORIE_KLEUREN map**

```typescript
inactief: "#4B5563",
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Test in browser**

Visit `http://localhost:3000/schermtijd`. The Overzicht tab should now show:
- Summary card (empty initially, with "Samenvatting genereren" button)
- KPI cards with session-based stats
- Session cards with detailed info
- Timeline bar
- Idle blocks (if agent is logging idle)

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/schermtijd/page.tsx
git commit -m "feat: rebuild Overzicht tab with sessions, timeline, and AI summaries"
```

---

## Chunk 5: Final Build + Agent Rebuild

### Task 10: Rebuild desktop agent

- [ ] **Step 1: Build the agent**

```bash
export PATH="$HOME/.cargo/bin:$PATH"
cd desktop-agent && npm run tauri build -- --debug
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/semmi/OneDrive/Claude AI/Projects/autronis-dashboard"
git add desktop-agent/
git commit -m "feat: rebuild desktop agent with idle tracking"
```

---

### Task 11: Final TypeScript check and build

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Production build**

```bash
npm run build
```

- [ ] **Step 3: Manual test**

1. Start the new desktop agent build
2. Visit `/schermtijd` — verify sessions appear
3. Click "Samenvatting genereren" — verify AI summary
4. Wait for idle >60s — verify grey idle blocks appear
5. Check project auto-detection for VS Code entries

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete screen time improvements (sessions, summaries, idle, project detection)"
```
