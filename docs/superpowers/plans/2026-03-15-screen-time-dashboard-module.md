# Screen Time Dashboard Module — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add screen time tracking infrastructure to the Autronis Dashboard — database tables, API routes, React Query hooks, and a full `/schermtijd` page with four tabs (Overzicht, Team, Regels, Suggesties).

**Architecture:** Three new database tables (`screen_time_entries`, `screen_time_regels`, `screen_time_suggesties`) with Drizzle ORM. REST API routes following existing patterns (`requireAuth()` + Bearer token auth for sync endpoint). React Query hooks for data fetching. Single page with tab navigation matching the existing dashboard design system.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + SQLite, TanStack React Query, Tailwind CSS with Autronis design tokens, Anthropic SDK for AI categorization.

**Spec:** `docs/superpowers/specs/2026-03-15-screen-time-tracker-design.md`

---

## File Structure

### New Files
- `src/lib/db/schema.ts` — MODIFY: add 3 new tables + indices
- `src/lib/auth.ts` — MODIFY: add `requireApiKey()` middleware
- `src/app/api/screen-time/sync/route.ts` — Sync endpoint (Bearer token auth)
- `src/app/api/screen-time/route.ts` — GET entries with filters
- `src/app/api/screen-time/regels/route.ts` — CRUD for categorization rules
- `src/app/api/screen-time/regels/[id]/route.ts` — PUT/DELETE single rule
- `src/app/api/screen-time/suggesties/route.ts` — GET/PUT suggestions
- `src/app/api/screen-time/categoriseer/route.ts` — AI batch categorization
- `src/hooks/queries/use-screen-time.ts` — React Query hooks
- `src/app/(dashboard)/schermtijd/page.tsx` — Main page with 4 tabs
- `src/types/index.ts` — MODIFY: add screen time types
- `src/components/layout/sidebar.tsx` — MODIFY: add nav item

---

## Chunk 1: Database & Auth Infrastructure

### Task 1: Add database tables

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 0: Update imports in schema.ts**

Add `index` to the drizzle import at the top of the file:

```typescript
import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
```

Also add `isActief` column to the existing `apiKeys` table (needed for `requireApiKey()`):

```typescript
// In the apiKeys table definition, add after laatstGebruiktOp:
isActief: integer("is_actief").default(1),
```

- [ ] **Step 1: Add `screenTimeEntries` table to schema**

Add after the last table definition in `schema.ts`:

```typescript
export const screenTimeEntries = sqliteTable("screen_time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: text("client_id"),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  app: text("app").notNull(),
  vensterTitel: text("venster_titel"),
  url: text("url"),
  categorie: text("categorie", {
    enum: ["development", "communicatie", "design", "administratie", "afleiding", "overig"],
  }).default("overig"),
  projectId: integer("project_id").references(() => projecten.id),
  klantId: integer("klant_id").references(() => klanten.id),
  startTijd: text("start_tijd").notNull(),
  eindTijd: text("eind_tijd").notNull(),
  duurSeconden: integer("duur_seconden").notNull(),
  bron: text("bron", { enum: ["agent", "handmatig"] }).default("agent"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
}, (table) => ({
  uniekClientId: uniqueIndex("uniek_client_id").on(table.clientId),
  idxGebruikerStart: index("idx_st_gebruiker_start").on(table.gebruikerId, table.startTijd),
  idxGebruikerCatStart: index("idx_st_gebruiker_cat_start").on(table.gebruikerId, table.categorie, table.startTijd),
}));
```

- [ ] **Step 2: Add `screenTimeRegels` table**

```typescript
export const screenTimeRegels = sqliteTable("screen_time_regels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["app", "url", "venstertitel"] }).notNull(),
  patroon: text("patroon").notNull(),
  categorie: text("categorie", {
    enum: ["development", "communicatie", "design", "administratie", "afleiding", "overig"],
  }).notNull(),
  projectId: integer("project_id").references(() => projecten.id),
  klantId: integer("klant_id").references(() => klanten.id),
  prioriteit: integer("prioriteit").default(0),
  isActief: integer("is_actief").default(1),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});
```

- [ ] **Step 3: Add `screenTimeSuggesties` table**

```typescript
export const screenTimeSuggesties = sqliteTable("screen_time_suggesties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  type: text("type", { enum: ["categorie", "tijdregistratie", "project_koppeling"] }).notNull(),
  startTijd: text("start_tijd").notNull(),
  eindTijd: text("eind_tijd").notNull(),
  voorstel: text("voorstel").notNull(), // JSON string
  status: text("status", { enum: ["openstaand", "goedgekeurd", "afgewezen"] }).default("openstaand"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  verwerktOp: text("verwerkt_op"),
});
```

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Start dev server to trigger table creation**

Run: `npm run dev`
Then visit any page to trigger DB initialization. Verify tables exist:
```bash
sqlite3 data/autronis.db ".tables" | grep screen
```
Expected: `screen_time_entries screen_time_regels screen_time_suggesties`

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat: add screen time database tables (entries, regels, suggesties)"
```

---

### Task 2: Add `requireApiKey()` auth middleware

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add `requireApiKey()` function**

Add after the existing `requireAuth()` function:

Add these imports at the top of `auth.ts`:

```typescript
import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
```

Then add the function after `requireAuth()`:

```typescript
export async function requireApiKey(req: NextRequest): Promise<number> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("API key vereist");
  }

  const token = authHeader.slice(7);
  const hash = createHash("sha256").update(token).digest("hex");

  const key = db
    .select({ aangemaaktDoor: apiKeys.aangemaaktDoor })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.isActief, 1)))
    .get();

  if (!key || !key.aangemaaktDoor) {
    throw new Error("Ongeldige API key");
  }

  db.update(apiKeys)
    .set({ laatstGebruiktOp: new Date().toISOString() })
    .where(eq(apiKeys.keyHash, hash))
    .run();

  return key.aangemaaktDoor;
}
```

Note: `apiKeys.isActief` is added in Task 1 Step 0. The `aangemaaktDoor` field serves as the user ID. Verify no circular imports exist between `auth.ts` and `db/index.ts`.

- [ ] **Step 2: Add NextRequest import if not already present**

Ensure `NextRequest` is imported from `next/server` at the top of the file.

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add requireApiKey() middleware for Bearer token auth"
```

---

### Task 3: Add screen time types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add types**

Add to the types file:

```typescript
export type ScreenTimeCategorie = "development" | "communicatie" | "design" | "administratie" | "afleiding" | "overig";

export interface ScreenTimeEntry {
  id: number;
  clientId: string | null;
  gebruikerId: number;
  app: string;
  vensterTitel: string | null;
  url: string | null;
  categorie: ScreenTimeCategorie;
  projectId: number | null;
  klantId: number | null;
  startTijd: string;
  eindTijd: string;
  duurSeconden: number;
  bron: "agent" | "handmatig";
  aangemaaktOp: string;
  // Joined fields
  projectNaam?: string;
  klantNaam?: string;
}

export interface ScreenTimeRegel {
  id: number;
  type: "app" | "url" | "venstertitel";
  patroon: string;
  categorie: ScreenTimeCategorie;
  projectId: number | null;
  klantId: number | null;
  prioriteit: number;
  isActief: number;
  aangemaaktOp: string;
  // Joined fields
  projectNaam?: string;
  klantNaam?: string;
}

export interface ScreenTimeSuggestie {
  id: number;
  gebruikerId: number;
  type: "categorie" | "tijdregistratie" | "project_koppeling";
  startTijd: string;
  eindTijd: string;
  voorstel: string; // JSON
  status: "openstaand" | "goedgekeurd" | "afgewezen";
  aangemaaktOp: string;
  verwerktOp: string | null;
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add screen time TypeScript types"
```

---

## Chunk 2: API Routes

### Task 4: Sync endpoint (for desktop agent)

**Files:**
- Create: `src/app/api/screen-time/sync/route.ts`

- [ ] **Step 1: Create the sync route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenTimeEntries, screenTimeRegels } from "@/lib/db/schema";
import { requireApiKey } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  let gebruikerId: number;
  try {
    gebruikerId = await requireApiKey(req);
  } catch {
    return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
  }

  const body = await req.json();
  const { entries } = body;

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ fout: "Geen entries meegegeven" }, { status: 400 });
  }

  // Load active rules for categorization
  const regels = await db
    .select()
    .from(screenTimeRegels)
    .where(eq(screenTimeRegels.isActief, 1))
    .orderBy(screenTimeRegels.prioriteit)
    .all();

  let verwerkt = 0;
  let overgeslagen = 0;
  const categorieen: Array<{ clientId: string; categorie: string; projectId: number | null }> = [];

  for (const entry of entries) {
    if (!entry.clientId || !entry.app || !entry.startTijd || !entry.eindTijd || !entry.duurSeconden) {
      overgeslagen++;
      continue;
    }

    // Check for duplicate (idempotency)
    const bestaand = await db
      .select({ id: screenTimeEntries.id })
      .from(screenTimeEntries)
      .where(eq(screenTimeEntries.clientId, entry.clientId))
      .get();

    if (bestaand) {
      overgeslagen++;
      continue;
    }

    // Apply rules for categorization
    let categorie = "overig";
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

    await db.insert(screenTimeEntries).values({
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
    });

    categorieen.push({ clientId: entry.clientId, categorie, projectId });
    verwerkt++;
  }

  // Collect new rules created during categorization for agent's local cache
  const nieuweRegels = regels
    .filter(r => categorieen.some(c => {
      const matchTarget = r.type === "app" ? c.clientId : "";
      try { return new RegExp(r.patroon, "i").test(matchTarget); } catch { return false; }
    }))
    .map(r => ({ patroon: r.patroon, categorie: r.categorie }));

  return NextResponse.json({ verwerkt, overgeslagen, categorieen, nieuweRegels });
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/screen-time/sync/route.ts
git commit -m "feat: add screen time sync endpoint with Bearer token auth"
```

---

### Task 5: Screen time GET endpoint

**Files:**
- Create: `src/app/api/screen-time/route.ts`

- [ ] **Step 1: Create the entries route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenTimeEntries, projecten, klanten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const gebruiker = await requireAuth();
  const { searchParams } = new URL(req.url);

  const van = searchParams.get("van");
  const tot = searchParams.get("tot");
  const categorie = searchParams.get("categorie");
  const gebruikerId = searchParams.get("gebruikerId");

  // Default: today
  const vandaag = new Date().toISOString().split("T")[0];
  const startDatum = van || vandaag;
  const eindDatum = tot || vandaag;

  const conditions = [];

  // Admin can view team data, otherwise own data only
  if (gebruikerId && gebruiker.rol === "admin") {
    conditions.push(eq(screenTimeEntries.gebruikerId, parseInt(gebruikerId)));
  } else {
    conditions.push(eq(screenTimeEntries.gebruikerId, gebruiker.id));
  }

  conditions.push(gte(screenTimeEntries.startTijd, `${startDatum}T00:00:00`));
  conditions.push(lte(screenTimeEntries.startTijd, `${eindDatum}T23:59:59`));

  if (categorie) {
    conditions.push(eq(screenTimeEntries.categorie, categorie));
  }

  const entries = await db
    .select({
      id: screenTimeEntries.id,
      app: screenTimeEntries.app,
      vensterTitel: screenTimeEntries.vensterTitel,
      url: screenTimeEntries.url,
      categorie: screenTimeEntries.categorie,
      startTijd: screenTimeEntries.startTijd,
      eindTijd: screenTimeEntries.eindTijd,
      duurSeconden: screenTimeEntries.duurSeconden,
      bron: screenTimeEntries.bron,
      projectNaam: projecten.naam,
      klantNaam: klanten.bedrijfsnaam,
    })
    .from(screenTimeEntries)
    .leftJoin(projecten, eq(screenTimeEntries.projectId, projecten.id))
    .leftJoin(klanten, eq(screenTimeEntries.klantId, klanten.id))
    .where(and(...conditions))
    .orderBy(desc(screenTimeEntries.startTijd))
    .all();

  // Aggregate by category
  const categorieOverzicht: Record<string, number> = {};
  const appOverzicht: Record<string, number> = {};
  let totaalSeconden = 0;

  for (const entry of entries) {
    categorieOverzicht[entry.categorie] = (categorieOverzicht[entry.categorie] || 0) + entry.duurSeconden;
    appOverzicht[entry.app] = (appOverzicht[entry.app] || 0) + entry.duurSeconden;
    totaalSeconden += entry.duurSeconden;
  }

  // Sort apps by duration
  const topApps = Object.entries(appOverzicht)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([app, seconden]) => ({ app, seconden }));

  return NextResponse.json({
    entries,
    categorieOverzicht,
    topApps,
    totaalSeconden,
  });
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/screen-time/route.ts
git commit -m "feat: add screen time GET endpoint with filters and aggregation"
```

---

### Task 6: Rules CRUD endpoints

**Files:**
- Create: `src/app/api/screen-time/regels/route.ts`
- Create: `src/app/api/screen-time/regels/[id]/route.ts`

- [ ] **Step 1: Create rules list + create route**

```typescript
// src/app/api/screen-time/regels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenTimeRegels, projecten, klanten } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  await requireAuth();

  const regels = await db
    .select({
      id: screenTimeRegels.id,
      type: screenTimeRegels.type,
      patroon: screenTimeRegels.patroon,
      categorie: screenTimeRegels.categorie,
      projectId: screenTimeRegels.projectId,
      klantId: screenTimeRegels.klantId,
      prioriteit: screenTimeRegels.prioriteit,
      isActief: screenTimeRegels.isActief,
      aangemaaktOp: screenTimeRegels.aangemaaktOp,
      projectNaam: projecten.naam,
      klantNaam: klanten.bedrijfsnaam,
    })
    .from(screenTimeRegels)
    .leftJoin(projecten, eq(screenTimeRegels.projectId, projecten.id))
    .leftJoin(klanten, eq(screenTimeRegels.klantId, klanten.id))
    .where(eq(screenTimeRegels.isActief, 1))
    .orderBy(desc(screenTimeRegels.prioriteit))
    .all();

  return NextResponse.json({ regels });
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  const { type, patroon, categorie, projectId, klantId, prioriteit } = body;

  if (!type || !patroon || !categorie) {
    return NextResponse.json({ fout: "Type, patroon en categorie zijn verplicht" }, { status: 400 });
  }

  // Validate regex
  try {
    new RegExp(patroon);
  } catch {
    return NextResponse.json({ fout: "Ongeldig regex patroon" }, { status: 400 });
  }

  const [regel] = await db.insert(screenTimeRegels).values({
    type,
    patroon,
    categorie,
    projectId: projectId || null,
    klantId: klantId || null,
    prioriteit: prioriteit || 0,
  }).returning();

  return NextResponse.json({ regel }, { status: 201 });
}
```

- [ ] **Step 2: Create single rule PUT/DELETE route**

```typescript
// src/app/api/screen-time/regels/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenTimeRegels } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id } = await params;
  const body = await req.json();

  if (body.patroon) {
    try {
      new RegExp(body.patroon);
    } catch {
      return NextResponse.json({ fout: "Ongeldig regex patroon" }, { status: 400 });
    }
  }

  const [updated] = await db
    .update(screenTimeRegels)
    .set(body)
    .where(eq(screenTimeRegels.id, parseInt(id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ fout: "Regel niet gevonden" }, { status: 404 });
  }

  return NextResponse.json({ regel: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAuth();
  const { id } = await params;

  await db
    .update(screenTimeRegels)
    .set({ isActief: 0 })
    .where(eq(screenTimeRegels.id, parseInt(id)));

  return NextResponse.json({ succes: true });
}
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/screen-time/regels/
git commit -m "feat: add screen time rules CRUD endpoints"
```

---

### Task 7: Suggestions endpoint

**Files:**
- Create: `src/app/api/screen-time/suggesties/route.ts`

- [ ] **Step 1: Create suggestions route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenTimeSuggesties, tijdregistraties } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const gebruiker = await requireAuth();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "openstaand";

  const suggesties = await db
    .select()
    .from(screenTimeSuggesties)
    .where(
      and(
        eq(screenTimeSuggesties.gebruikerId, gebruiker.id),
        eq(screenTimeSuggesties.status, status)
      )
    )
    .orderBy(desc(screenTimeSuggesties.aangemaaktOp))
    .all();

  return NextResponse.json({ suggesties });
}

export async function PUT(req: NextRequest) {
  const gebruiker = await requireAuth();
  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ fout: "ID en status zijn verplicht" }, { status: 400 });
  }

  const suggestie = await db
    .select()
    .from(screenTimeSuggesties)
    .where(
      and(
        eq(screenTimeSuggesties.id, id),
        eq(screenTimeSuggesties.gebruikerId, gebruiker.id)
      )
    )
    .get();

  if (!suggestie) {
    return NextResponse.json({ fout: "Suggestie niet gevonden" }, { status: 404 });
  }

  // If approved tijdregistratie suggestion, create the time entry
  if (status === "goedgekeurd" && suggestie.type === "tijdregistratie") {
    let voorstel;
    try {
      voorstel = JSON.parse(suggestie.voorstel);
    } catch {
      return NextResponse.json({ fout: "Ongeldig voorstel formaat" }, { status: 400 });
    }

    // Check for overlapping existing tijdregistraties
    const overlap = await db
      .select({ id: tijdregistraties.id })
      .from(tijdregistraties)
      .where(
        and(
          eq(tijdregistraties.gebruikerId, gebruiker.id),
          lte(tijdregistraties.startTijd, suggestie.eindTijd),
          gte(tijdregistraties.eindTijd, suggestie.startTijd)
        )
      )
      .get();

    if (overlap) {
      return NextResponse.json({ fout: "Er is al een tijdregistratie in deze periode" }, { status: 409 });
    }

    const startTijd = new Date(suggestie.startTijd);
    const eindTijd = new Date(suggestie.eindTijd);
    const duurMinuten = Math.round((eindTijd.getTime() - startTijd.getTime()) / 60000);

    await db.insert(tijdregistraties).values({
      gebruikerId: gebruiker.id,
      projectId: voorstel.projectId || null,
      startTijd: suggestie.startTijd,
      eindTijd: suggestie.eindTijd,
      duurMinuten,
      omschrijving: voorstel.omschrijving || `Screen time: ${voorstel.app}`,
      categorie: voorstel.categorie || "overig",
      isHandmatig: 0,
    });
  }

  await db
    .update(screenTimeSuggesties)
    .set({ status, verwerktOp: new Date().toISOString() })
    .where(eq(screenTimeSuggesties.id, id));

  return NextResponse.json({ succes: true });
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/screen-time/suggesties/route.ts
git commit -m "feat: add screen time suggestions endpoint with auto-tijdregistratie"
```

---

### Task 8: AI categorization endpoint

**Files:**
- Create: `src/app/api/screen-time/categoriseer/route.ts`

- [ ] **Step 1: Create AI categorization route**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { screenTimeEntries, screenTimeRegels } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

export async function POST() {
  await requireAuth();

  // Find uncategorized entries (categorie = "overig" and no matching rule)
  const ongecategoriseerd = await db
    .select({
      id: screenTimeEntries.id,
      app: screenTimeEntries.app,
      vensterTitel: screenTimeEntries.vensterTitel,
      url: screenTimeEntries.url,
    })
    .from(screenTimeEntries)
    .where(eq(screenTimeEntries.categorie, "overig"))
    .limit(50)
    .all();

  if (ongecategoriseerd.length === 0) {
    return NextResponse.json({ verwerkt: 0, nieuweRegels: [] });
  }

  // Get unique app+url combinations to batch
  const uniek = new Map<string, { app: string; url: string | null; vensterTitel: string | null }>();
  for (const entry of ongecategoriseerd) {
    const key = `${entry.app}|${entry.url || ""}`;
    if (!uniek.has(key)) {
      uniek.set(key, { app: entry.app, url: entry.url, vensterTitel: entry.vensterTitel });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ fout: "ANTHROPIC_API_KEY niet geconfigureerd" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const appsLijst = Array.from(uniek.values())
    .map((a) => `- App: "${a.app}", URL: "${a.url || "geen"}", Venster: "${a.vensterTitel || "geen"}"`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Categoriseer deze apps/websites in een van deze categorieën: development, communicatie, design, administratie, afleiding, overig.

${appsLijst}

Antwoord als JSON array: [{"app": "...", "url": "...", "categorie": "..."}]
Geen uitleg, alleen de JSON.`,
      },
    ],
  });

  const tekst = response.content[0].type === "text" ? response.content[0].text : "";
  let resultaten: Array<{ app: string; url: string; categorie: string }> = [];
  try {
    const jsonMatch = tekst.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      resultaten = JSON.parse(jsonMatch[0]);
    }
  } catch {
    return NextResponse.json({ fout: "AI response kon niet geparsed worden" }, { status: 500 });
  }

  const nieuweRegels: Array<{ app: string; categorie: string }> = [];

  for (const res of resultaten) {
    const categorie = res.categorie as string;
    if (!["development", "communicatie", "design", "administratie", "afleiding", "overig"].includes(categorie)) {
      continue;
    }

    // Create a new rule
    await db.insert(screenTimeRegels).values({
      type: "app",
      patroon: `^${res.app.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      categorie,
      prioriteit: 0,
    });

    nieuweRegels.push({ app: res.app, categorie });

    // Update existing entries
    await db
      .update(screenTimeEntries)
      .set({ categorie })
      .where(
        and(
          eq(screenTimeEntries.app, res.app),
          eq(screenTimeEntries.categorie, "overig")
        )
      );
  }

  return NextResponse.json({ verwerkt: resultaten.length, nieuweRegels });
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/screen-time/categoriseer/route.ts
git commit -m "feat: add AI batch categorization endpoint for screen time"
```

---

## Chunk 3: React Query Hooks & Sidebar

### Task 9: React Query hooks

**Files:**
- Create: `src/hooks/queries/use-screen-time.ts`

- [ ] **Step 1: Create the hooks file**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ScreenTimeEntry,
  ScreenTimeRegel,
  ScreenTimeSuggestie,
  ScreenTimeCategorie,
} from "@/types";

// --- Entries ---

interface ScreenTimeData {
  entries: ScreenTimeEntry[];
  categorieOverzicht: Record<ScreenTimeCategorie, number>;
  topApps: Array<{ app: string; seconden: number }>;
  totaalSeconden: number;
}

async function fetchScreenTime(van: string, tot: string, gebruikerId?: number): Promise<ScreenTimeData> {
  const params = new URLSearchParams({ van, tot });
  if (gebruikerId) params.set("gebruikerId", String(gebruikerId));
  const res = await fetch(`/api/screen-time?${params}`);
  if (!res.ok) throw new Error("Kon screen time niet laden");
  return res.json();
}

export function useScreenTime(van: string, tot: string, gebruikerId?: number) {
  return useQuery({
    queryKey: ["screen-time", van, tot, gebruikerId],
    queryFn: () => fetchScreenTime(van, tot, gebruikerId),
    staleTime: 30_000,
  });
}

// --- Regels ---

async function fetchRegels(): Promise<ScreenTimeRegel[]> {
  const res = await fetch("/api/screen-time/regels");
  if (!res.ok) throw new Error("Kon regels niet laden");
  const data = await res.json();
  return data.regels || [];
}

export function useScreenTimeRegels() {
  return useQuery({
    queryKey: ["screen-time-regels"],
    queryFn: fetchRegels,
    staleTime: 60_000,
  });
}

export function useScreenTimeRegelMutatie() {
  const queryClient = useQueryClient();
  return {
    create: useMutation({
      mutationFn: async (data: Partial<ScreenTimeRegel>) => {
        const res = await fetch("/api/screen-time/regels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.fout || "Fout bij opslaan");
        }
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["screen-time-regels"] });
      },
    }),
    update: useMutation({
      mutationFn: async ({ id, ...data }: Partial<ScreenTimeRegel> & { id: number }) => {
        const res = await fetch(`/api/screen-time/regels/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.fout || "Fout bij opslaan");
        }
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["screen-time-regels"] });
      },
    }),
    remove: useMutation({
      mutationFn: async (id: number) => {
        const res = await fetch(`/api/screen-time/regels/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Fout bij verwijderen");
        return res.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["screen-time-regels"] });
      },
    }),
  };
}

// --- Suggesties ---

async function fetchSuggesties(status: string): Promise<ScreenTimeSuggestie[]> {
  const res = await fetch(`/api/screen-time/suggesties?status=${status}`);
  if (!res.ok) throw new Error("Kon suggesties niet laden");
  const data = await res.json();
  return data.suggesties || [];
}

export function useScreenTimeSuggesties(status = "openstaand") {
  return useQuery({
    queryKey: ["screen-time-suggesties", status],
    queryFn: () => fetchSuggesties(status),
    staleTime: 30_000,
  });
}

export function useScreenTimeSuggestieMutatie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "goedgekeurd" | "afgewezen" }) => {
      const res = await fetch("/api/screen-time/suggesties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.fout || "Fout bij verwerken");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screen-time-suggesties"] });
      queryClient.invalidateQueries({ queryKey: ["tijdregistraties"] });
    },
  });
}

// --- AI Categorisatie ---

export function useCategoriseer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/screen-time/categoriseer", { method: "POST" });
      if (!res.ok) throw new Error("Fout bij categoriseren");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["screen-time"] });
      queryClient.invalidateQueries({ queryKey: ["screen-time-regels"] });
    },
  });
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/queries/use-screen-time.ts
git commit -m "feat: add React Query hooks for screen time data"
```

---

### Task 10: Add sidebar navigation item

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add Schermtijd to nav items**

Import `Monitor` from `lucide-react` and add to the `navItems` array, after Tijdregistratie:

```typescript
{ label: "Schermtijd", icon: Monitor, href: "/schermtijd" },
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Schermtijd to sidebar navigation"
```

---

## Chunk 4: Dashboard Page

### Task 11: Schermtijd page — Tab layout + Overzicht tab

**Files:**
- Create: `src/app/(dashboard)/schermtijd/page.tsx`

- [ ] **Step 1: Create the page with tab structure and Overzicht tab**

Build the page with:
- Tab navigation: Overzicht | Team | Regels | Suggesties
- State: `activeTab`, `periode` (dag/week/maand), date selector
- Overzicht tab content:
  - KPI bar: Totale schermtijd, Productief %, Top categorie
  - Category breakdown: horizontal bar chart per category with hours/minutes
  - Top Apps list: top 10 apps sorted by duration
  - Timeline: hourly blocks showing which app was active (simplified — colored blocks per hour)

Use these patterns from the existing codebase:
- `"use client"` directive
- `<PageTransition>` wrapper
- `useScreenTime()` hook for data
- Tailwind with `autronis-*` design tokens
- `tabular-nums` on all numbers
- `rounded-2xl` cards with `bg-autronis-card border border-autronis-border`
- Loading: skeleton components
- Category colors: Development = `#17B8A5` (accent), Communicatie = `#3B82F6`, Design = `#A855F7`, Administratie = `#F59E0B`, Afleiding = `#EF4444`, Overig = `#6B7280`

The page should be approximately 300-400 lines. Use helper components defined within the same file for the bar chart and timeline sections.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Test in browser**

Visit `http://localhost:3000/schermtijd` — should render with empty state (no data yet).

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/schermtijd/page.tsx
git commit -m "feat: add Schermtijd page with Overzicht tab"
```

---

### Task 12: Team tab

**Files:**
- Modify: `src/app/(dashboard)/schermtijd/page.tsx`

- [ ] **Step 1: Add Team tab content**

Add a `TeamTab` component within the page file:
- Fetch all users dynamically via `/api/profiel` or `useGebruikers()` hook (already exists in the codebase)
- Side-by-side cards for each team member
- Each card shows: total screen time, category breakdown bar, top 3 apps
- Uses `useScreenTime()` with `gebruikerId` parameter for each user
- Comparison row at bottom: who has more productive time

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/schermtijd/page.tsx
git commit -m "feat: add Team tab to Schermtijd page"
```

---

### Task 13: Regels tab

**Files:**
- Modify: `src/app/(dashboard)/schermtijd/page.tsx`

- [ ] **Step 1: Add Regels tab content**

Add a `RegelsTab` component:
- List of active rules with type icon, pattern, category badge, project/client name
- "Nieuwe regel" button → inline form or modal with: type (dropdown), patroon (text input), categorie (dropdown), optional project/client select
- Edit/delete buttons per rule
- "AI Categoriseren" button that triggers `useCategoriseer()` mutation — shows spinner while running, then toast with count of categorized apps
- Uses `useScreenTimeRegels()` and `useScreenTimeRegelMutatie()` hooks

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/schermtijd/page.tsx
git commit -m "feat: add Regels tab to Schermtijd page"
```

---

### Task 14: Suggesties tab

**Files:**
- Modify: `src/app/(dashboard)/schermtijd/page.tsx`

- [ ] **Step 1: Add Suggesties tab content**

Add a `SuggestiesTab` component:
- List of open suggestions as cards
- Each card shows: type badge, time range, the proposal (parsed from JSON), two action buttons (Goedkeuren / Afwijzen)
- "Alles goedkeuren" bulk action button
- Status filter: Openstaand | Goedgekeurd | Afgewezen
- Uses `useScreenTimeSuggesties()` and `useScreenTimeSuggestieMutatie()` hooks
- Toast on success: "Suggestie goedgekeurd" / "Suggestie afgewezen"
- When a tijdregistratie suggestion is approved, invalidate tijdregistraties cache too

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/schermtijd/page.tsx
git commit -m "feat: add Suggesties tab to Schermtijd page"
```

---

## Chunk 5: AI Integration & Final

### Task 15: Extend AI assistant with screen time context

**Files:**
- Modify: `src/app/api/ai/chat/route.ts`

- [ ] **Step 1: Add screen time summary to AI system prompt**

In the section where business context is gathered (before the `client.messages.create` call), add a query for today's screen time:

```typescript
// Screen time vandaag
const vandaag = new Date().toISOString().split("T")[0];
const screenTimeSamenvatting = await db
  .select({
    categorie: screenTimeEntries.categorie,
    totaal: sql<number>`SUM(duur_seconden)`,
  })
  .from(screenTimeEntries)
  .where(
    and(
      eq(screenTimeEntries.gebruikerId, gebruiker.id),
      gte(screenTimeEntries.startTijd, `${vandaag}T00:00:00`)
    )
  )
  .groupBy(screenTimeEntries.categorie)
  .all();

const topAppsVandaag = await db
  .select({
    app: screenTimeEntries.app,
    totaal: sql<number>`SUM(duur_seconden)`,
  })
  .from(screenTimeEntries)
  .where(
    and(
      eq(screenTimeEntries.gebruikerId, gebruiker.id),
      gte(screenTimeEntries.startTijd, `${vandaag}T00:00:00`)
    )
  )
  .groupBy(screenTimeEntries.app)
  .orderBy(sql`SUM(duur_seconden) DESC`)
  .limit(5)
  .all();
```

Add to the system prompt string:

```
Screen time vandaag:
${screenTimeSamenvatting.map(s => `- ${s.categorie}: ${Math.round(s.totaal / 60)} minuten`).join("\n")}

Top apps vandaag:
${topAppsVandaag.map(a => `- ${a.app}: ${Math.round(a.totaal / 60)} minuten`).join("\n")}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/chat/route.ts
git commit -m "feat: add screen time context to AI assistant"
```

---

### Task 16: Final TypeScript check and build

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds without errors

- [ ] **Step 3: Manual test**

1. Visit `/schermtijd` — page loads with empty state
2. Switch between all 4 tabs — no errors
3. Create a rule in Regels tab — saves correctly
4. Check sidebar — Schermtijd link is visible and active

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "feat: complete screen time dashboard module"
```
