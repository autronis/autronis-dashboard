# Fase 1: Fundament — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Autronis dashboard project with Next.js, SQLite database (all tables), authentication, layout with sidebar/header, dark/light theme in Autronis branding, PWA support, and placeholder pages for all modules.

**Architecture:** Next.js 14+ App Router monolith with Drizzle ORM + better-sqlite3 for persistence, iron-session for cookie-based auth, shadcn/ui + Tailwind for UI, next-themes for dark/light mode. All 15 database tables created upfront. Server Components by default, Client Components only where needed (interactivity).

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, better-sqlite3, iron-session, bcrypt, next-themes, @serwist/next, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-11-autronis-dashboard-fase1-design.md`

---

## File Structure

```
src/
├── app/
│   ├── globals.css                 # Tailwind imports + Autronis custom CSS variables
│   ├── layout.tsx                  # Root layout: ThemeProvider, SessionProvider wrapper
│   ├── page.tsx                    # Dashboard placeholder (redirects if not logged in)
│   ├── login/
│   │   └── page.tsx                # Login form (Client Component)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts      # POST: verify credentials, set session cookie
│   │   │   └── logout/route.ts     # POST: destroy session cookie
│   │   └── seed/route.ts           # POST: seed database (dev only)
│   ├── tijdregistratie/page.tsx    # Placeholder
│   ├── klanten/page.tsx            # Placeholder
│   ├── financien/page.tsx          # Placeholder
│   ├── analytics/page.tsx          # Placeholder
│   ├── crm/page.tsx                # Placeholder
│   ├── agenda/page.tsx             # Placeholder
│   ├── taken/page.tsx              # Placeholder
│   └── instellingen/
│       └── page.tsx                # Settings: bedrijfsgegevens, profiel, wat is nieuw
├── components/
│   ├── ui/                         # shadcn/ui components (installed via CLI)
│   ├── layout/
│   │   ├── sidebar.tsx             # Sidebar navigation with icons, collapsible
│   │   ├── header.tsx              # Top header: logo, user info, theme toggle
│   │   ├── app-shell.tsx           # Combines sidebar + header + content area
│   │   └── theme-toggle.tsx        # Sun/moon icon button
│   └── shared/
│       └── placeholder-page.tsx    # Reusable "coming soon" placeholder
├── lib/
│   ├── db/
│   │   ├── index.ts                # Database connection singleton
│   │   ├── schema.ts               # All 15 Drizzle table definitions
│   │   └── seed.ts                 # Seed function: 2 users, bedrijfsinstellingen, demo data
│   ├── auth.ts                     # iron-session config, getSession helper, requireAuth
│   └── utils.ts                    # formatDatum, formatBedrag, timestamp helpers
├── hooks/
│   └── use-sidebar.ts              # Sidebar open/collapsed state
├── middleware.ts                    # Auth middleware: redirect to /login if no session
└── types/
    └── index.ts                    # Shared TypeScript types
public/
├── manifest.json                   # PWA manifest
└── icons/
    ├── icon-192.png                # PWA icon (generated placeholder)
    └── icon-512.png                # PWA icon (generated placeholder)
drizzle.config.ts                   # Drizzle Kit config
tailwind.config.ts                  # Tailwind config with Autronis colors
next.config.ts                      # Next.js config with @serwist/next
```

---

## Chunk 1: Project Setup & Database

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `.gitignore`

- [ ] **Step 1: Create Next.js project with create-next-app**

```bash
cd C:/Users/semmi
npx create-next-app@latest autronis-dashboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Note: This will overwrite the existing directory. Accept defaults. App Router = yes, src/ directory = yes.

Actually, since the dir already exists with git, run from inside:

```bash
cd C:/Users/semmi/autronis-dashboard
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

- [ ] **Step 2: Install dependencies**

```bash
cd C:/Users/semmi/autronis-dashboard
npm install drizzle-orm better-sqlite3 iron-session bcrypt next-themes lucide-react
npm install -D drizzle-kit @types/better-sqlite3 @types/bcrypt
```

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected: Server running on http://localhost:3000, default Next.js page visible.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with dependencies"
```

---

### Task 2: Configure Tailwind with Autronis Colors

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update tailwind.config.ts with Autronis color palette**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        autronis: {
          bg: "var(--bg)",
          card: "var(--card)",
          accent: "var(--accent)",
          "accent-hover": "var(--accent-hover)",
          success: "var(--success)",
          warning: "var(--warning)",
          danger: "var(--danger)",
          "text-primary": "var(--text-primary)",
          "text-secondary": "var(--text-secondary)",
          border: "var(--border)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Update globals.css with CSS variables for both themes**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg: #F0FDFA;
    --card: #FFFFFF;
    --accent: #0D9373;
    --accent-hover: #0F766E;
    --success: #16A34A;
    --warning: #EA580C;
    --danger: #DC2626;
    --text-primary: #0B1A1F;
    --text-secondary: #64748B;
    --border: #CCFBF1;
  }

  .dark {
    --bg: #0B1A1F;
    --card: #112B34;
    --accent: #2DD4A8;
    --accent-hover: #5EEAD4;
    --success: #22C55E;
    --warning: #F97316;
    --danger: #EF4444;
    --text-primary: #F1F5F9;
    --text-secondary: #94A3B8;
    --border: #1E3A45;
  }

  body {
    background-color: var(--bg);
    color: var(--text-primary);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts src/app/globals.css
git commit -m "feat: configure Tailwind with Autronis brand colors"
```

---

### Task 3: Database Schema with Drizzle ORM

**Files:**
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/index.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create drizzle.config.ts**

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/autronis.db",
  },
} satisfies Config;
```

- [ ] **Step 2: Create database connection singleton**

Create `src/lib/db/index.ts`:

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(path.join(dbDir, "autronis.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };
```

- [ ] **Step 3: Create full database schema**

Create `src/lib/db/schema.ts` with all 15 tables as defined in the spec:

```ts
import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamp = () => text("aangemaakt_op").default(sql`(datetime('now'))`);

// ============ GEBRUIKERS ============
export const gebruikers = sqliteTable("gebruikers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  naam: text("naam").notNull(),
  email: text("email").notNull().unique(),
  wachtwoordHash: text("wachtwoord_hash").notNull(),
  rol: text("rol", { enum: ["admin", "gebruiker"] }).default("gebruiker"),
  uurtariefStandaard: real("uurtarief_standaard"),
  themaVoorkeur: text("thema_voorkeur", { enum: ["donker", "licht"] }).default("donker"),
  tweeFactorGeheim: text("twee_factor_geheim"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ KLANTEN ============
export const klanten = sqliteTable("klanten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bedrijfsnaam: text("bedrijfsnaam").notNull(),
  contactpersoon: text("contactpersoon"),
  email: text("email"),
  telefoon: text("telefoon"),
  adres: text("adres"),
  uurtarief: real("uurtarief"),
  notities: text("notities"),
  isActief: integer("is_actief").default(1),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ PROJECTEN ============
export const projecten = sqliteTable("projecten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  klantId: integer("klant_id").references(() => klanten.id),
  naam: text("naam").notNull(),
  omschrijving: text("omschrijving"),
  status: text("status", { enum: ["actief", "afgerond", "on-hold"] }).default("actief"),
  voortgangPercentage: integer("voortgang_percentage").default(0),
  deadline: text("deadline"),
  geschatteUren: real("geschatte_uren"),
  werkelijkeUren: real("werkelijke_uren").default(0),
  isActief: integer("is_actief").default(1),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ TIJDREGISTRATIES ============
export const tijdregistraties = sqliteTable("tijdregistraties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  projectId: integer("project_id").references(() => projecten.id),
  omschrijving: text("omschrijving"),
  startTijd: text("start_tijd").notNull(),
  eindTijd: text("eind_tijd"),
  duurMinuten: integer("duur_minuten"),
  categorie: text("categorie", { enum: ["development", "meeting", "administratie", "overig"] }).default("development"),
  isHandmatig: integer("is_handmatig").default(0),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});

// ============ FACTUREN ============
export const facturen = sqliteTable("facturen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  klantId: integer("klant_id").references(() => klanten.id),
  projectId: integer("project_id").references(() => projecten.id),
  factuurnummer: text("factuurnummer").notNull().unique(),
  status: text("status", { enum: ["concept", "verzonden", "betaald", "te_laat"] }).default("concept"),
  bedragExclBtw: real("bedrag_excl_btw").notNull(),
  btwPercentage: real("btw_percentage").default(21),
  btwBedrag: real("btw_bedrag"),
  bedragInclBtw: real("bedrag_incl_btw"),
  factuurdatum: text("factuurdatum"),
  vervaldatum: text("vervaldatum"),
  betaaldOp: text("betaald_op"),
  isTerugkerend: integer("is_terugkerend").default(0),
  terugkeerInterval: text("terugkeer_interval", { enum: ["wekelijks", "maandelijks"] }),
  notities: text("notities"),
  isActief: integer("is_actief").default(1),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ FACTUUR REGELS ============
export const factuurRegels = sqliteTable("factuur_regels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  factuurId: integer("factuur_id").references(() => facturen.id, { onDelete: "cascade" }),
  omschrijving: text("omschrijving").notNull(),
  aantal: real("aantal").notNull(),
  eenheidsprijs: real("eenheidsprijs").notNull(),
  btwPercentage: real("btw_percentage").default(21),
  totaal: real("totaal"),
});

// ============ INKOMSTEN ============
export const inkomsten = sqliteTable("inkomsten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  factuurId: integer("factuur_id").references(() => facturen.id),
  klantId: integer("klant_id").references(() => klanten.id),
  omschrijving: text("omschrijving").notNull(),
  bedrag: real("bedrag").notNull(),
  datum: text("datum").notNull(),
  categorie: text("categorie"),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ UITGAVEN ============
export const uitgaven = sqliteTable("uitgaven", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  omschrijving: text("omschrijving").notNull(),
  bedrag: real("bedrag").notNull(),
  datum: text("datum").notNull(),
  categorie: text("categorie", { enum: ["software", "hardware", "kantoor", "reis", "overig"] }).default("overig"),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ DOELEN ============
export const doelen = sqliteTable("doelen", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  type: text("type", { enum: ["omzet", "uren"] }).notNull(),
  maand: integer("maand").notNull(),
  jaar: integer("jaar").notNull(),
  doelwaarde: real("doelwaarde").notNull(),
  huidigeWaarde: real("huidige_waarde").default(0),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
}, (table) => ({
  uniekDoel: uniqueIndex("uniek_doel").on(table.gebruikerId, table.type, table.maand, table.jaar),
}));

// ============ LEADS ============
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bedrijfsnaam: text("bedrijfsnaam").notNull(),
  contactpersoon: text("contactpersoon"),
  email: text("email"),
  telefoon: text("telefoon"),
  waarde: real("waarde"),
  status: text("status", { enum: ["nieuw", "contact", "offerte", "gewonnen", "verloren"] }).default("nieuw"),
  bron: text("bron"),
  notities: text("notities"),
  volgendeActie: text("volgende_actie"),
  volgendeActieDatum: text("volgende_actie_datum"),
  isActief: integer("is_actief").default(1),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ AGENDA ITEMS ============
export const agendaItems = sqliteTable("agenda_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  titel: text("titel").notNull(),
  omschrijving: text("omschrijving"),
  type: text("type", { enum: ["afspraak", "deadline", "belasting", "herinnering"] }).default("afspraak"),
  startDatum: text("start_datum").notNull(),
  eindDatum: text("eind_datum"),
  heleDag: integer("hele_dag").default(0),
  herinneringMinuten: integer("herinnering_minuten"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});

// ============ TAKEN ============
export const taken = sqliteTable("taken", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").references(() => projecten.id),
  toegewezenAan: integer("toegewezen_aan").references(() => gebruikers.id),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  titel: text("titel").notNull(),
  omschrijving: text("omschrijving"),
  status: text("status", { enum: ["open", "bezig", "afgerond"] }).default("open"),
  deadline: text("deadline"),
  prioriteit: text("prioriteit", { enum: ["laag", "normaal", "hoog"] }).default("normaal"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
  bijgewerktOp: text("bijgewerkt_op").default(sql`(datetime('now'))`),
});

// ============ NOTITIES ============
export const notities = sqliteTable("notities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  klantId: integer("klant_id").references(() => klanten.id),
  projectId: integer("project_id").references(() => projecten.id),
  leadId: integer("lead_id").references(() => leads.id),
  inhoud: text("inhoud").notNull(),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});

// ============ DOCUMENTEN ============
export const documenten = sqliteTable("documenten", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  klantId: integer("klant_id").references(() => klanten.id),
  projectId: integer("project_id").references(() => projecten.id),
  leadId: integer("lead_id").references(() => leads.id),
  naam: text("naam").notNull(),
  bestandspad: text("bestandspad").notNull(),
  type: text("type", { enum: ["contract", "offerte", "overig"] }).default("overig"),
  versie: integer("versie").default(1),
  aangemaaktDoor: integer("aangemaakt_door").references(() => gebruikers.id),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});

// ============ AUDIT LOG ============
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gebruikerId: integer("gebruiker_id").references(() => gebruikers.id),
  actie: text("actie", { enum: ["aangemaakt", "bijgewerkt", "verwijderd"] }).notNull(),
  entiteitType: text("entiteit_type").notNull(),
  entiteitId: integer("entiteit_id"),
  oudeWaarde: text("oude_waarde"),
  nieuweWaarde: text("nieuwe_waarde"),
  ipAdres: text("ip_adres"),
  aangemaaktOp: text("aangemaakt_op").default(sql`(datetime('now'))`),
});

// ============ BEDRIJFSINSTELLINGEN ============
export const bedrijfsinstellingen = sqliteTable("bedrijfsinstellingen", {
  id: integer("id").primaryKey(),
  bedrijfsnaam: text("bedrijfsnaam").default("Autronis"),
  adres: text("adres"),
  kvkNummer: text("kvk_nummer"),
  btwNummer: text("btw_nummer"),
  iban: text("iban"),
  email: text("email"),
  telefoon: text("telefoon"),
  logoPad: text("logo_pad"),
  standaardBtw: real("standaard_btw").default(21),
  betalingstermijnDagen: integer("betalingstermijn_dagen").default(30),
  herinneringNaDagen: integer("herinnering_na_dagen").default(7),
});
```

- [ ] **Step 4: Generate and run migrations**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 5: Verify database was created**

```bash
ls data/autronis.db
```

Expected: File exists.

- [ ] **Step 6: Commit**

```bash
git add drizzle.config.ts src/lib/db/ drizzle/ data/.gitkeep
git commit -m "feat: add complete database schema with all 15 tables"
```

---

### Task 4: Seed Script

**Files:**
- Create: `src/lib/db/seed.ts`
- Create: `src/app/api/seed/route.ts`

- [ ] **Step 1: Create seed function**

Create `src/lib/db/seed.ts`:

```ts
import { db } from "./index";
import { gebruikers, klanten, projecten, tijdregistraties, bedrijfsinstellingen } from "./schema";
import bcrypt from "bcrypt";

export async function seed() {
  // Check if already seeded
  const existing = db.select().from(gebruikers).all();
  if (existing.length > 0) {
    return { message: "Database is al gevuld" };
  }

  // 2 gebruikers
  const hash1 = await bcrypt.hash("Autronis2026!", 10);
  const hash2 = await bcrypt.hash("Autronis2026!", 10);

  db.insert(gebruikers).values([
    {
      naam: "Sem Gijsberts",
      email: "sem@autronis.com",
      wachtwoordHash: hash1,
      rol: "admin",
      uurtariefStandaard: 95,
      themaVoorkeur: "donker",
    },
    {
      naam: "Compagnon",
      email: "compagnon@autronis.com",
      wachtwoordHash: hash2,
      rol: "admin",
      uurtariefStandaard: 95,
      themaVoorkeur: "donker",
    },
  ]).run();

  // Bedrijfsinstellingen
  db.insert(bedrijfsinstellingen).values({
    id: 1,
    bedrijfsnaam: "Autronis",
    email: "info@autronis.com",
    standaardBtw: 21,
    betalingstermijnDagen: 30,
    herinneringNaDagen: 7,
  }).run();

  // 3 demo klanten
  db.insert(klanten).values([
    {
      bedrijfsnaam: "TechVentures B.V.",
      contactpersoon: "Jan de Vries",
      email: "jan@techventures.nl",
      telefoon: "06-12345678",
      uurtarief: 95,
      aangemaaktDoor: 1,
    },
    {
      bedrijfsnaam: "GreenEnergy Solutions",
      contactpersoon: "Lisa Bakker",
      email: "lisa@greenenergy.nl",
      telefoon: "06-87654321",
      uurtarief: 110,
      aangemaaktDoor: 1,
    },
    {
      bedrijfsnaam: "DataFlow Analytics",
      contactpersoon: "Mark Jansen",
      email: "mark@dataflow.nl",
      telefoon: "06-11223344",
      uurtarief: 95,
      aangemaaktDoor: 2,
    },
  ]).run();

  // Demo projecten
  db.insert(projecten).values([
    {
      klantId: 1,
      naam: "CRM Automatisering",
      omschrijving: "Volledig CRM systeem automatiseren met n8n workflows",
      status: "actief",
      voortgangPercentage: 35,
      deadline: "2026-06-01",
      geschatteUren: 120,
      aangemaaktDoor: 1,
    },
    {
      klantId: 1,
      naam: "Email Marketing Pipeline",
      omschrijving: "Geautomatiseerde email sequences opzetten",
      status: "actief",
      voortgangPercentage: 70,
      deadline: "2026-04-15",
      geschatteUren: 40,
      aangemaaktDoor: 1,
    },
    {
      klantId: 2,
      naam: "Data Dashboard",
      omschrijving: "Real-time energie dashboard met API koppelingen",
      status: "actief",
      voortgangPercentage: 10,
      deadline: "2026-08-01",
      geschatteUren: 200,
      aangemaaktDoor: 2,
    },
    {
      klantId: 3,
      naam: "Rapportage Automatisering",
      omschrijving: "Automatische maandrapportages genereren",
      status: "on-hold",
      voortgangPercentage: 50,
      geschatteUren: 60,
      aangemaaktDoor: 2,
    },
  ]).run();

  // Demo tijdregistraties
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  db.insert(tijdregistraties).values([
    {
      gebruikerId: 1,
      projectId: 1,
      omschrijving: "Workflow ontwerp en documentatie",
      startTijd: `${today}T09:00:00Z`,
      eindTijd: `${today}T11:30:00Z`,
      duurMinuten: 150,
      categorie: "development",
    },
    {
      gebruikerId: 1,
      projectId: 2,
      omschrijving: "Klantgesprek over email templates",
      startTijd: `${today}T13:00:00Z`,
      eindTijd: `${today}T14:00:00Z`,
      duurMinuten: 60,
      categorie: "meeting",
    },
    {
      gebruikerId: 2,
      projectId: 3,
      omschrijving: "API integratie research",
      startTijd: `${today}T10:00:00Z`,
      eindTijd: `${today}T12:00:00Z`,
      duurMinuten: 120,
      categorie: "development",
    },
  ]).run();

  return { message: "Database succesvol gevuld met demo data" };
}
```

- [ ] **Step 2: Create seed API route**

Create `src/app/api/seed/route.ts`:

```ts
import { NextResponse } from "next/server";
import { seed } from "@/lib/db/seed";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Niet beschikbaar in productie" }, { status: 403 });
  }

  const result = await seed();
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/seed.ts src/app/api/seed/route.ts
git commit -m "feat: add seed script with demo data (2 users, 3 clients, 4 projects)"
```

---

### Task 5: Utility Functions

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/types/index.ts`

- [ ] **Step 1: Create utility functions**

Create `src/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDatum(datum: string | null | undefined): string {
  if (!datum) return "—";
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDatumKort(datum: string | null | undefined): string {
  if (!datum) return "—";
  return new Date(datum).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatBedrag(bedrag: number | null | undefined): string {
  if (bedrag == null) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(bedrag);
}

export function formatUren(minuten: number | null | undefined): string {
  if (!minuten) return "0:00";
  const uren = Math.floor(minuten / 60);
  const min = minuten % 60;
  return `${uren}:${min.toString().padStart(2, "0")}`;
}

export function nuTimestamp(): string {
  return new Date().toISOString().replace(".000", "").replace(/\.\d{3}/, "");
}

export function roundBedrag(bedrag: number): number {
  return Math.round(bedrag * 100) / 100;
}
```

- [ ] **Step 2: Install clsx and tailwind-merge (needed for cn)**

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 3: Create shared TypeScript types**

Create `src/types/index.ts`:

```ts
export type ThemaVoorkeur = "donker" | "licht";
export type GebruikerRol = "admin" | "gebruiker";
export type ProjectStatus = "actief" | "afgerond" | "on-hold";
export type FactuurStatus = "concept" | "verzonden" | "betaald" | "te_laat";
export type LeadStatus = "nieuw" | "contact" | "offerte" | "gewonnen" | "verloren";
export type TaakStatus = "open" | "bezig" | "afgerond";
export type Prioriteit = "laag" | "normaal" | "hoog";
export type TijdCategorie = "development" | "meeting" | "administratie" | "overig";

export interface SessionGebruiker {
  id: number;
  naam: string;
  email: string;
  rol: GebruikerRol;
  themaVoorkeur: ThemaVoorkeur;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils.ts src/types/index.ts
git commit -m "feat: add utility functions and shared TypeScript types"
```

---

## Chunk 2: Authentication

### Task 6: Auth System with iron-session

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Create auth configuration and helpers**

Create `src/lib/auth.ts`:

```ts
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessionGebruiker } from "@/types";

export interface SessionData {
  gebruiker?: SessionGebruiker;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "autronis-dashboard-secret-key-minimaal-32-chars!!",
  cookieName: "autronis-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 dagen
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAuth(): Promise<SessionGebruiker> {
  const session = await getSession();
  if (!session.gebruiker) {
    throw new Error("Niet ingelogd");
  }
  return session.gebruiker;
}

// Simple in-memory rate limiter
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || record.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (record.count >= 5) {
    return false;
  }

  record.count++;
  return true;
}
```

- [ ] **Step 2: Create login API route**

Create `src/app/api/auth/login/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { gebruikers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData, checkRateLimit } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Te veel inlogpogingen. Probeer het over een minuut opnieuw." },
      { status: 429 }
    );
  }

  const { email, wachtwoord } = await request.json();

  if (!email || !wachtwoord) {
    return NextResponse.json(
      { error: "Email en wachtwoord zijn verplicht" },
      { status: 400 }
    );
  }

  const gebruiker = db
    .select()
    .from(gebruikers)
    .where(eq(gebruikers.email, email))
    .get();

  if (!gebruiker) {
    return NextResponse.json(
      { error: "Ongeldige inloggegevens" },
      { status: 401 }
    );
  }

  const wachtwoordKlopt = await bcrypt.compare(wachtwoord, gebruiker.wachtwoordHash);
  if (!wachtwoordKlopt) {
    return NextResponse.json(
      { error: "Ongeldige inloggegevens" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );

  session.gebruiker = {
    id: gebruiker.id,
    naam: gebruiker.naam,
    email: gebruiker.email,
    rol: gebruiker.rol as "admin" | "gebruiker",
    themaVoorkeur: (gebruiker.themaVoorkeur as "donker" | "licht") || "donker",
  };

  await session.save();
  return response;
}
```

- [ ] **Step 3: Create logout API route**

Create `src/app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Create middleware for auth protection**

Create `src/middleware.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/auth";

const publicPaths = ["/login", "/api/auth/login", "/api/seed"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    publicPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );

  if (!session.gebruiker) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Create .env.local with session secret**

Create `.env.local`:

```
SESSION_SECRET=autronis-dashboard-2026-geheim-minimaal-32-tekens!!
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/middleware.ts .env.local
git commit -m "feat: add authentication with iron-session, login/logout API, rate limiting"
```

---

### Task 7: Login Page

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create login page (Client Component)**

Create `src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFout("");
    setLaden(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, wachtwoord }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFout(data.error || "Er ging iets mis");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setFout("Kan geen verbinding maken met de server");
    } finally {
      setLaden(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-autronis-bg">
      <div className="w-full max-w-md p-8 bg-autronis-card rounded-xl border border-autronis-border shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-autronis-text-primary">
            Autronis
          </h1>
          <p className="text-autronis-text-secondary mt-2">
            Log in op het dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fout && (
            <div className="p-3 rounded-lg bg-autronis-danger/10 text-autronis-danger text-sm">
              {fout}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-autronis-text-secondary mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-autronis-bg border border-autronis-border text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent"
              placeholder="sem@autronis.com"
            />
          </div>

          <div>
            <label
              htmlFor="wachtwoord"
              className="block text-sm font-medium text-autronis-text-secondary mb-1"
            >
              Wachtwoord
            </label>
            <input
              id="wachtwoord"
              type="password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-autronis-bg border border-autronis-border text-autronis-text-primary placeholder:text-autronis-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-autronis-accent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={laden}
            className="w-full py-2 px-4 rounded-lg bg-autronis-accent text-autronis-bg font-medium hover:bg-autronis-accent-hover transition-colors disabled:opacity-50"
          >
            {laden ? "Bezig met inloggen..." : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: add login page with Autronis branding"
```

---

## Chunk 3: Layout, Navigation & Theme

### Task 8: Theme Provider Setup

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update root layout with ThemeProvider**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Autronis Dashboard",
  description: "Business dashboard voor Autronis",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add ThemeProvider with dark as default theme"
```

---

### Task 9: Layout Components (Sidebar, Header, AppShell)

**Files:**
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Create: `src/components/layout/theme-toggle.tsx`
- Create: `src/hooks/use-sidebar.ts`

- [ ] **Step 1: Create sidebar state hook**

Create `src/hooks/use-sidebar.ts`:

```ts
"use client";

import { create } from "zustand";

interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebar = create<SidebarState>((set) => ({
  isOpen: false,
  isCollapsed: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
}));
```

Note: Install zustand:

```bash
npm install zustand
```

- [ ] **Step 2: Create theme toggle component**

Create `src/components/layout/theme-toggle.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-autronis-border transition-colors"
      aria-label="Thema wisselen"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-autronis-text-secondary" />
      ) : (
        <Moon className="w-5 h-5 text-autronis-text-secondary" />
      )}
    </button>
  );
}
```

- [ ] **Step 3: Create sidebar component**

Create `src/components/layout/sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  Users,
  Euro,
  BarChart3,
  Target,
  Calendar,
  CheckSquare,
  Settings,
  ChevronLeft,
  X,
} from "lucide-react";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tijdregistratie", label: "Tijdregistratie", icon: Clock },
  { href: "/klanten", label: "Klanten", icon: Users },
  { href: "/financien", label: "Financiën", icon: Euro },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/crm", label: "CRM / Leads", icon: Target },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/taken", label: "Taken", icon: CheckSquare },
];

const bottomItems = [
  { href: "/instellingen", label: "Instellingen", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, isCollapsed, setOpen, setCollapsed } = useSidebar();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-autronis-card border-r border-autronis-border flex flex-col transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-autronis-border">
          {!isCollapsed && (
            <span className="text-lg font-bold text-autronis-accent">
              Autronis
            </span>
          )}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setOpen(false);
              } else {
                setCollapsed(!isCollapsed);
              }
            }}
            className="p-1.5 rounded-lg hover:bg-autronis-border transition-colors lg:block"
          >
            {isOpen && window.innerWidth < 1024 ? (
              <X className="w-5 h-5 text-autronis-text-secondary" />
            ) : (
              <ChevronLeft
                className={cn(
                  "w-5 h-5 text-autronis-text-secondary transition-transform",
                  isCollapsed && "rotate-180"
                )}
              />
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      isActive
                        ? "bg-autronis-accent/10 text-autronis-accent"
                        : "text-autronis-text-secondary hover:bg-autronis-border hover:text-autronis-text-primary"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom items */}
        <div className="border-t border-autronis-border py-4 px-2">
          <ul className="space-y-1">
            {bottomItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      isActive
                        ? "bg-autronis-accent/10 text-autronis-accent"
                        : "text-autronis-text-secondary hover:bg-autronis-border hover:text-autronis-text-primary"
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 4: Create header component**

Create `src/components/layout/header.tsx`:

```tsx
"use client";

import { Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import type { SessionGebruiker } from "@/types";

interface HeaderProps {
  gebruiker: SessionGebruiker;
}

export function Header({ gebruiker }: HeaderProps) {
  const { isCollapsed, setOpen } = useSidebar();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-autronis-card border-b border-autronis-border flex items-center justify-between px-4 transition-all duration-300",
        isCollapsed ? "left-16" : "left-64",
        "max-lg:left-0"
      )}
    >
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg hover:bg-autronis-border transition-colors lg:hidden"
      >
        <Menu className="w-5 h-5 text-autronis-text-secondary" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-autronis-accent/20 flex items-center justify-center">
            <span className="text-sm font-medium text-autronis-accent">
              {gebruiker.naam.charAt(0)}
            </span>
          </div>
          <span className="text-sm text-autronis-text-primary hidden sm:block">
            {gebruiker.naam}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-autronis-border transition-colors"
          aria-label="Uitloggen"
        >
          <LogOut className="w-5 h-5 text-autronis-text-secondary" />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Create app shell that wraps sidebar + header + content**

Create `src/components/layout/app-shell.tsx`:

```tsx
"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import type { SessionGebruiker } from "@/types";

interface AppShellProps {
  gebruiker: SessionGebruiker;
  children: React.ReactNode;
}

export function AppShell({ gebruiker, children }: AppShellProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-autronis-bg">
      <Sidebar />
      <Header gebruiker={gebruiker} />
      <main
        className={cn(
          "pt-16 transition-all duration-300 min-h-screen",
          isCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/hooks/
git commit -m "feat: add sidebar, header, theme toggle, and app shell layout"
```

---

### Task 10: Integrate AppShell into Pages

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/(dashboard)/layout.tsx` — group route for authenticated pages

- [ ] **Step 1: Create dashboard group layout**

Create `src/app/(dashboard)/layout.tsx`:

```tsx
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.gebruiker) {
    redirect("/login");
  }

  return <AppShell gebruiker={session.gebruiker}>{children}</AppShell>;
}
```

- [ ] **Step 2: Move page.tsx into dashboard group and create placeholder**

Move `src/app/page.tsx` → `src/app/(dashboard)/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-autronis-text-primary mb-2">
        Dashboard
      </h1>
      <p className="text-autronis-text-secondary">
        Welkom bij het Autronis dashboard. Hier komt het overzicht van je bedrijf.
      </p>

      {/* Placeholder cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {["Omzet deze maand", "Gewerkte uren", "Actieve projecten", "Openstaande facturen"].map(
          (label) => (
            <div
              key={label}
              className="p-6 bg-autronis-card rounded-xl border border-autronis-border"
            >
              <p className="text-sm text-autronis-text-secondary">{label}</p>
              <p className="text-2xl font-bold text-autronis-text-primary mt-1">
                —
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create shared placeholder component**

Create `src/components/shared/placeholder-page.tsx`:

```tsx
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  titel: string;
  beschrijving: string;
}

export function PlaceholderPage({ titel, beschrijving }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Construction className="w-16 h-16 text-autronis-accent/30 mb-4" />
      <h1 className="text-2xl font-bold text-autronis-text-primary mb-2">
        {titel}
      </h1>
      <p className="text-autronis-text-secondary max-w-md">{beschrijving}</p>
      <span className="mt-4 text-xs text-autronis-text-secondary/50">
        Binnenkort beschikbaar
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Create all placeholder pages inside dashboard group**

Create these files inside `src/app/(dashboard)/`:

`tijdregistratie/page.tsx`:
```tsx
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export default function TijdregistratiePage() {
  return <PlaceholderPage titel="Tijdregistratie" beschrijving="Start/stop timers, registreer uren per project en bekijk je overzichten." />;
}
```

`klanten/page.tsx`:
```tsx
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export default function KlantenPage() {
  return <PlaceholderPage titel="Klanten & Projecten" beschrijving="Beheer je klanten, projecten, uurtarieven en voortgang." />;
}
```

`financien/page.tsx`:
```tsx
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export default function FinancienPage() {
  return <PlaceholderPage titel="Financiën" beschrijving="Facturen, inkomsten, uitgaven en BTW berekeningen." />;
}
```

`analytics/page.tsx`:
```tsx
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export default function AnalyticsPage() {
  return <PlaceholderPage titel="Analytics" beschrijving="Winstgevendheid, klant rankings, bezettingsgraad en groeigrafieken." />;
}
```

`crm/page.tsx`:
```tsx
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export default function CrmPage() {
  return <PlaceholderPage titel="CRM / Leads" beschrijving="Lead pipeline, offertes en conversie tracking." />;
}
```

`agenda/page.tsx`:
```tsx
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export default function AgendaPage() {
  return <PlaceholderPage titel="Agenda" beschrijving="Kalender, deadlines, afspraken en herinneringen." />;
}
```

`taken/page.tsx`:
```tsx
import { PlaceholderPage } from "@/components/shared/placeholder-page";
export default function TakenPage() {
  return <PlaceholderPage titel="Taken" beschrijving="Taken aanmaken, toewijzen en bijhouden." />;
}
```

`instellingen/page.tsx`:
```tsx
export default function InstellingenPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-autronis-text-primary mb-6">
        Instellingen
      </h1>

      <div className="space-y-6">
        {/* Bedrijfsgegevens */}
        <div className="p-6 bg-autronis-card rounded-xl border border-autronis-border">
          <h2 className="text-lg font-semibold text-autronis-text-primary mb-4">
            Bedrijfsgegevens
          </h2>
          <p className="text-autronis-text-secondary">
            Hier kun je de gegevens van Autronis beheren voor facturen en offertes.
          </p>
        </div>

        {/* Gebruikersprofiel */}
        <div className="p-6 bg-autronis-card rounded-xl border border-autronis-border">
          <h2 className="text-lg font-semibold text-autronis-text-primary mb-4">
            Gebruikersprofiel
          </h2>
          <p className="text-autronis-text-secondary">
            Wachtwoord wijzigen, thema voorkeur en uurtarief instellen.
          </p>
        </div>

        {/* Wat is nieuw */}
        <div className="p-6 bg-autronis-card rounded-xl border border-autronis-border">
          <h2 className="text-lg font-semibold text-autronis-text-primary mb-4">
            Wat is nieuw
          </h2>
          <div className="space-y-3">
            <div className="border-l-2 border-autronis-accent pl-4">
              <p className="font-medium text-autronis-text-primary">
                Fase 1 — Fundament
              </p>
              <p className="text-sm text-autronis-text-secondary">
                Projectstructuur, database, authenticatie, layout met sidebar en header,
                donker/licht thema in Autronis huisstijl, PWA ondersteuning.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/
git commit -m "feat: add dashboard group layout with all placeholder pages"
```

---

## Chunk 4: PWA, Backup & Final Polish

### Task 11: PWA Setup

**Files:**
- Create: `public/manifest.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Create PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "Autronis Dashboard",
  "short_name": "Autronis",
  "description": "Business dashboard voor Autronis",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B1A1F",
  "theme_color": "#2DD4A8",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Create placeholder PWA icons**

Generate simple placeholder icons (turquoise square with "A"):

```bash
mkdir -p public/icons
```

Note: For now create minimal placeholder PNGs. Real icons can be added later from the Autronis logo. The agent should create simple colored PNG files using a canvas library or just note they need to be added manually.

- [ ] **Step 3: Update next.config.ts for PWA**

Note: @serwist/next requires specific setup. For Fase 1, we'll use a simple approach — just add the manifest link in the layout head. Full service worker setup can be added when push notifications are needed in Fase 6.

Update `src/app/layout.tsx` to include manifest link:

```tsx
// In the <head> or metadata:
export const metadata: Metadata = {
  title: "Autronis Dashboard",
  description: "Business dashboard voor Autronis",
  manifest: "/manifest.json",
  themeColor: "#2DD4A8",
};
```

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json public/icons/ next.config.ts src/app/layout.tsx
git commit -m "feat: add PWA manifest and icons"
```

---

### Task 12: Database Backup Utility

**Files:**
- Create: `src/lib/backup.ts`

- [ ] **Step 1: Create backup utility**

Create `src/lib/backup.ts`:

```ts
import { sqlite } from "@/lib/db";
import path from "path";
import fs from "fs";

const BACKUP_DIR = path.join(process.cwd(), "backups");
const MAX_BACKUPS = 30;

export function createBackup(): { success: boolean; message: string } {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const today = new Date().toISOString().split("T")[0];
    const backupPath = path.join(BACKUP_DIR, `autronis_backup_${today}.db`);

    // Skip if today's backup already exists
    if (fs.existsSync(backupPath)) {
      return { success: true, message: "Backup van vandaag bestaat al" };
    }

    // Use SQLite backup API (safe during concurrent writes)
    const backup = sqlite.backup(backupPath);
    backup.run();

    // Cleanup old backups
    const backups = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("autronis_backup_") && f.endsWith(".db"))
      .sort()
      .reverse();

    for (const old of backups.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(BACKUP_DIR, old));
    }

    return { success: true, message: `Backup aangemaakt: ${backupPath}` };
  } catch (error) {
    console.error("Backup fout:", error);
    return { success: false, message: `Backup mislukt: ${error}` };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/backup.ts
git commit -m "feat: add daily database backup utility with SQLite backup API"
```

---

### Task 13: .gitignore & README

**Files:**
- Modify: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Update .gitignore**

Add to `.gitignore`:

```
# Database
data/*.db
data/*.db-journal
data/*.db-wal

# Backups
backups/

# Uploads
uploads/

# Environment
.env.local
.env.production
```

- [ ] **Step 2: Create README**

Create `README.md`:

```markdown
# Autronis Business Dashboard

Intern business dashboard voor Autronis — gebouwd met Next.js, SQLite en Tailwind CSS.

## Snel starten

### Vereisten

- Node.js 18+ (aanbevolen: 20+)
- npm

### Installatie

1. Clone de repository:

\`\`\`bash
git clone <repo-url>
cd autronis-dashboard
\`\`\`

2. Installeer dependencies:

\`\`\`bash
npm install
\`\`\`

3. Maak een `.env.local` bestand:

\`\`\`bash
SESSION_SECRET=kies-een-geheim-wachtwoord-van-minimaal-32-tekens
\`\`\`

4. Start de development server:

\`\`\`bash
npm run dev
\`\`\`

5. Open http://localhost:3000

6. Seed de database (eenmalig):

\`\`\`bash
curl -X POST http://localhost:3000/api/seed
\`\`\`

### Inloggegevens (demo)

| Gebruiker | Email | Wachtwoord |
|-----------|-------|------------|
| Sem Gijsberts | sem@autronis.com | Autronis2026! |
| Compagnon | compagnon@autronis.com | Autronis2026! |

## Technologie

- **Frontend:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** SQLite (via Drizzle ORM)
- **Auth:** iron-session (encrypted cookies)
- **Thema:** Donker/licht in Autronis huisstijl

## Projectstructuur

\`\`\`
src/
├── app/           # Next.js pages en API routes
├── components/    # React componenten
├── lib/           # Database, auth, utilities
├── hooks/         # Custom React hooks
└── types/         # TypeScript types
\`\`\`

## Modules

| Module | Status |
|--------|--------|
| Dashboard | 🏗️ Placeholder |
| Tijdregistratie | 🏗️ Placeholder |
| Klanten & Projecten | 🏗️ Placeholder |
| Financiën | 🏗️ Placeholder |
| Analytics | 🏗️ Placeholder |
| CRM / Leads | 🏗️ Placeholder |
| Agenda | 🏗️ Placeholder |
| Taken | 🏗️ Placeholder |
| Instellingen | ✅ Basis |

## Database

SQLite database in `data/autronis.db`. Dagelijkse backups in `backups/`.

### Migraties

\`\`\`bash
npx drizzle-kit generate   # Genereer migratie
npx drizzle-kit push       # Pas toe op database
\`\`\`
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore README.md
git commit -m "docs: add README with setup instructions and update .gitignore"
```

---

### Task 14: Final Integration Test

- [ ] **Step 1: Start dev server and verify everything works**

```bash
npm run dev
```

- [ ] **Step 2: Seed the database**

```bash
curl -X POST http://localhost:3000/api/seed
```

Expected: `{"message":"Database succesvol gevuld met demo data"}`

- [ ] **Step 3: Test login flow**

1. Open http://localhost:3000 → should redirect to /login
2. Login with sem@autronis.com / Autronis2026!
3. Should redirect to dashboard with sidebar + header
4. Navigate through all placeholder pages
5. Toggle dark/light theme
6. Logout → redirects to /login

- [ ] **Step 4: Verify responsive behavior**

1. Resize browser to mobile width (<768px) → sidebar should be hidden, hamburger menu visible
2. Resize to tablet (768-1023px) → sidebar should show icons only
3. Full desktop (≥1024px) → full sidebar visible

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Fase 1 foundation - auth, layout, theme, PWA, all placeholder pages"
```
