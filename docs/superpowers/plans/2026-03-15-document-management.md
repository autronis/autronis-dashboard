# Document Management Systeem — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Notion-backed document management system to the Autronis dashboard with AI-powered draft generation, categorization, and summarization.

**Architecture:** Notion-first approach — dashboard is entry + overview layer, Notion is storage. AI (Anthropic Claude SDK, already installed) generates drafts, summaries, and metadata. No new database tables — existing `/api/documenten` routes are rewritten to use Notion API instead of SQLite.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Notion API (`@notionhq/client`), Anthropic SDK (existing), React Query, framer-motion, lucide-react, cmdk

**Spec:** `docs/superpowers/specs/2026-03-15-document-management-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/types/documenten.ts` | TypeScript interfaces for all document types |
| `src/lib/notion.ts` | Notion API client, database helpers, CRUD operations |
| `src/lib/ai/autronis-context.ts` | Static Autronis context for AI system prompts |
| `src/lib/ai/documenten.ts` | AI prompts for draft generation, summarization, categorization |
| `src/app/api/documenten/route.ts` | Rewrite: POST (create in Notion), GET (fetch from Notion) |
| `src/app/api/documenten/[id]/route.ts` | Rewrite: GET single document from Notion |
| `src/app/api/documenten/ai/route.ts` | New: POST AI draft generation endpoint |
| `src/hooks/queries/use-documenten.ts` | React Query hooks for documents |
| `src/components/documenten/document-modal.tsx` | Modal with type-specific forms + AI draft button |
| `src/components/documenten/document-list.tsx` | Document list component with filters |
| `src/app/(dashboard)/documenten/page.tsx` | Documents overview page |

**Modified files:**
| File | Change |
|------|--------|
| `src/components/ui/quick-action-button.tsx` | Add "Nieuw document" with submenu |
| `src/components/ui/command-palette.tsx` | Add "document" type to search results |
| `src/components/layout/sidebar.tsx` | Add "Documenten" nav item |
| `src/app/api/zoeken/route.ts` | Add document search from Notion cache |
| `.env.example` | Add NOTION_* env vars |
| `package.json` | Add `@notionhq/client` |

---

## Chunk 1: Foundation — Types, Notion Client, AI Context

### Task 1: Install dependencies and update env

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install Notion SDK**

Run: `npm install @notionhq/client`

- [ ] **Step 2: Update .env.example**

Add to `.env.example`:
```
# Notion
NOTION_API_KEY=
NOTION_DB_CONTRACTEN=
NOTION_DB_KLANTDOCUMENTEN=
NOTION_DB_INTERNE_DOCUMENTEN=
NOTION_DB_BELANGRIJKE_INFO=
NOTION_DB_PLANNEN=
NOTION_DB_NOTITIES=
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat: add Notion SDK and env vars for document management"
```

---

### Task 2: TypeScript types for documents

**Files:**
- Create: `src/types/documenten.ts`

- [ ] **Step 1: Create document type definitions**

```typescript
// src/types/documenten.ts

export type DocumentType = 'contract' | 'klantdocument' | 'intern' | 'belangrijke-info' | 'plan' | 'notitie';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contract: 'Contract',
  klantdocument: 'Klantdocument',
  intern: 'Intern document',
  'belangrijke-info': 'Belangrijke info',
  plan: 'Plan / Roadmap',
  notitie: 'Notitie',
};

export const DOCUMENT_TYPE_NOTION_DB_KEYS: Record<DocumentType, string> = {
  contract: 'NOTION_DB_CONTRACTEN',
  klantdocument: 'NOTION_DB_KLANTDOCUMENTEN',
  intern: 'NOTION_DB_INTERNE_DOCUMENTEN',
  'belangrijke-info': 'NOTION_DB_BELANGRIJKE_INFO',
  plan: 'NOTION_DB_PLANNEN',
  notitie: 'NOTION_DB_NOTITIES',
};

// Base document returned from Notion
export interface DocumentBase {
  notionId: string;
  titel: string;
  type: DocumentType;
  samenvatting: string;
  aangemaaktDoor: string;
  aangemaaktOp: string;
  notionUrl: string;
  klantNaam?: string;
  projectNaam?: string;
}

// Type-specific create payloads
export interface ContractPayload {
  type: 'contract';
  titel: string;
  klantId?: number;
  projectId?: number;
  status: 'concept' | 'actief' | 'verlopen';
  startdatum?: string;
  einddatum?: string;
  bedrag?: number;
  content: string;
}

export interface KlantdocumentPayload {
  type: 'klantdocument';
  titel: string;
  klantId?: number;
  projectId?: number;
  subtype: 'proposal' | 'oplevering' | 'overig';
  content: string;
}

export interface InternDocumentPayload {
  type: 'intern';
  titel: string;
  categorie: 'proces' | 'handleiding' | 'overig';
  eigenaar?: string; // Naam van de eigenaar (spec: Eigenaar property)
  content: string;
}

export interface BelangrijkeInfoPayload {
  type: 'belangrijke-info';
  titel: string;
  urgentie: 'hoog' | 'normaal';
  gerelateerdAan: 'klant' | 'project' | 'intern';
  klantId?: number;
  projectId?: number;
  content: string;
}

export interface PlanPayload {
  type: 'plan';
  titel: string;
  klantId?: number;
  projectId?: number;
  status: 'concept' | 'definitief';
  content: string;
}

export interface NotitiePayload {
  type: 'notitie';
  titel: string;
  subtype: 'vergadering' | 'brainstorm' | 'overig';
  klantId?: number;
  projectId?: number;
  datum?: string;
  content: string;
}

export type DocumentPayload =
  | ContractPayload
  | KlantdocumentPayload
  | InternDocumentPayload
  | BelangrijkeInfoPayload
  | PlanPayload
  | NotitiePayload;

// AI draft request/response
export interface AiDraftRequest {
  type: DocumentType;
  titel: string;
  klantNaam?: string;
  projectNaam?: string;
  extraContext?: string;
  velden: Record<string, string>;
}

export interface AiDraftResponse {
  content: string;
  samenvatting: string;
}

// AI categorization response
export interface AiCategorisatieResponse {
  samenvatting: string;
  extractedMetadata: {
    datums?: string[];
    bedragen?: number[];
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/documenten.ts
git commit -m "feat: add TypeScript types for document management"
```

---

### Task 3: Notion API client

**Files:**
- Create: `src/lib/notion.ts`

- [ ] **Step 1: Create Notion client with database helpers**

```typescript
// src/lib/notion.ts
import { Client } from "@notionhq/client";
import { DocumentType, DocumentBase, DocumentPayload, DOCUMENT_TYPE_NOTION_DB_KEYS } from "@/types/documenten";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Retry wrapper for Notion API calls (handles 429 rate limits)
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimit = error instanceof Error && "status" in error && (error as { status: number }).status === 429;
      if (isRateLimit && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

function getNotionDbId(type: DocumentType): string {
  const envKey = DOCUMENT_TYPE_NOTION_DB_KEYS[type];
  const dbId = process.env[envKey];
  if (!dbId) throw new Error(`Notion database ID niet geconfigureerd: ${envKey}`);
  return dbId;
}

// Build Notion properties based on document type
function buildProperties(payload: DocumentPayload, samenvatting: string, aangemaaktDoor: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    Titel: { title: [{ text: { content: payload.titel } }] },
    Samenvatting: { rich_text: [{ text: { content: samenvatting } }] },
    "Aangemaakt door": { rich_text: [{ text: { content: aangemaaktDoor } }] },
    "Aangemaakt op": { date: { start: new Date().toISOString().split("T")[0] } },
    "Document type": { rich_text: [{ text: { content: payload.type } }] }, // Used to identify type when fetching single page
  };

  switch (payload.type) {
    case "contract":
      if (payload.status) base.Status = { select: { name: payload.status } };
      if (payload.startdatum) base.Startdatum = { date: { start: payload.startdatum } };
      if (payload.einddatum) base.Einddatum = { date: { start: payload.einddatum } };
      if (payload.bedrag !== undefined) base.Bedrag = { number: payload.bedrag };
      break;
    case "klantdocument":
      base.Type = { select: { name: payload.subtype } };
      break;
    case "intern":
      base.Categorie = { select: { name: payload.categorie } };
      if (payload.eigenaar) base.Eigenaar = { rich_text: [{ text: { content: payload.eigenaar } }] };
      break;
    case "belangrijke-info":
      base.Urgentie = { select: { name: payload.urgentie } };
      base["Gerelateerd aan"] = { select: { name: payload.gerelateerdAan } };
      break;
    case "plan":
      if (payload.status) base.Status = { select: { name: payload.status } };
      break;
    case "notitie":
      base.Type = { select: { name: payload.subtype } };
      if (payload.datum) base.Datum = { date: { start: payload.datum } };
      break;
  }

  // Add klant/project name if provided (resolved by API route before calling)
  return base;
}

// Convert content string to Notion blocks
function contentToBlocks(content: string): Array<Record<string, unknown>> {
  return content.split("\n\n").map((paragraph) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: paragraph } }],
    },
  }));
}

// Create a document in Notion
export async function createNotionDocument(
  payload: DocumentPayload,
  samenvatting: string,
  aangemaaktDoor: string,
  klantNaam?: string,
  projectNaam?: string
): Promise<{ notionId: string; notionUrl: string }> {
  const dbId = getNotionDbId(payload.type);
  const properties = buildProperties(payload, samenvatting, aangemaaktDoor);

  if (klantNaam) {
    properties.Klant = { rich_text: [{ text: { content: klantNaam } }] };
  }
  if (projectNaam) {
    properties.Project = { rich_text: [{ text: { content: projectNaam } }] };
  }

  const response = await withRetry(() => notion.pages.create({
    parent: { database_id: dbId },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
    children: contentToBlocks(payload.content),
  }));

  return {
    notionId: response.id,
    notionUrl: (response as { url: string }).url,
  };
}

// Fetch documents from a single Notion database
async function fetchFromDatabase(type: DocumentType, dbId: string): Promise<DocumentBase[]> {
  const response = await withRetry(() => notion.databases.query({
    database_id: dbId,
    sorts: [{ property: "Aangemaakt op", direction: "descending" }],
    page_size: 50,
  }));

  return response.results.map((page) => {
    const props = (page as { properties: Record<string, unknown> }).properties as Record<string, {
      title?: Array<{ plain_text: string }>;
      rich_text?: Array<{ plain_text: string }>;
      date?: { start: string } | null;
    }>;

    return {
      notionId: page.id,
      titel: props.Titel?.title?.[0]?.plain_text ?? "Zonder titel",
      type,
      samenvatting: props.Samenvatting?.rich_text?.[0]?.plain_text ?? "",
      aangemaaktDoor: props["Aangemaakt door"]?.rich_text?.[0]?.plain_text ?? "",
      aangemaaktOp: props["Aangemaakt op"]?.date?.start ?? "",
      notionUrl: (page as { url: string }).url,
      klantNaam: props.Klant?.rich_text?.[0]?.plain_text,
      projectNaam: props.Project?.rich_text?.[0]?.plain_text,
    };
  });
}

// Fetch all documents from all databases (sequential to respect rate limits)
export async function fetchAllDocuments(): Promise<DocumentBase[]> {
  const allDocs: DocumentBase[] = [];
  const types: DocumentType[] = ["contract", "klantdocument", "intern", "belangrijke-info", "plan", "notitie"];

  for (const type of types) {
    const envKey = DOCUMENT_TYPE_NOTION_DB_KEYS[type];
    const dbId = process.env[envKey];
    if (!dbId) continue; // Skip unconfigured databases

    try {
      const docs = await fetchFromDatabase(type, dbId);
      allDocs.push(...docs);
    } catch {
      // Skip this database and continue with others
    }
  }

  // Sort all documents by date descending
  allDocs.sort((a, b) => b.aangemaaktOp.localeCompare(a.aangemaaktOp));
  return allDocs;
}

// Fetch single document by Notion page ID
export async function fetchNotionDocument(notionId: string): Promise<DocumentBase | null> {
  try {
    const page = await withRetry(() => notion.pages.retrieve({ page_id: notionId }));
    const props = (page as { properties: Record<string, unknown> }).properties as Record<string, {
      title?: Array<{ plain_text: string }>;
      rich_text?: Array<{ plain_text: string }>;
      date?: { start: string } | null;
    }>;

    // Read type from "Document type" property (stored on creation)
    const storedType = props["Document type"]?.rich_text?.[0]?.plain_text;
    const type = (storedType as DocumentType) ?? "intern";

    return {
      notionId: page.id,
      titel: props.Titel?.title?.[0]?.plain_text ?? "Zonder titel",
      type,
      samenvatting: props.Samenvatting?.rich_text?.[0]?.plain_text ?? "",
      aangemaaktDoor: props["Aangemaakt door"]?.rich_text?.[0]?.plain_text ?? "",
      aangemaaktOp: props["Aangemaakt op"]?.date?.start ?? "",
      notionUrl: (page as { url: string }).url,
      klantNaam: props.Klant?.rich_text?.[0]?.plain_text,
      projectNaam: props.Project?.rich_text?.[0]?.plain_text,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/notion.ts
git commit -m "feat: add Notion API client with document CRUD helpers"
```

---

### Task 4: Autronis AI context

**Files:**
- Create: `src/lib/ai/autronis-context.ts`

- [ ] **Step 1: Create Autronis context file**

```typescript
// src/lib/ai/autronis-context.ts

export const AUTRONIS_CONTEXT = `
Je bent een AI-assistent van Autronis.

## Over Autronis
Autronis is een AI- en automatiseringsbureau dat MKB-bedrijven helpt slimmer, sneller en efficiënter te werken.
Opgericht door Sem en Syb.

## Diensten
- Workflow automatisering (Make.com, n8n, API-integraties)
- AI integraties (OpenAI API, custom agents, AI workflows)
- Systeem integraties (CRM, boekhouding, webshops, databases)
- Data & dashboards (realtime KPIs, rapportages, BI)

## Tone of voice
- Professioneel maar toegankelijk
- Concreet en to-the-point
- Nederlands
- Geen jargon tenzij de klant technisch is

## Schrijfstijl voor documenten
- Duidelijke koppen en structuur
- Korte paragrafen
- Actieve zinnen
- Concrete deliverables en timelines waar van toepassing
`;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/autronis-context.ts
git commit -m "feat: add Autronis AI context for document generation"
```

---

### Task 5: AI document helpers

**Files:**
- Create: `src/lib/ai/documenten.ts`

- [ ] **Step 1: Create AI document generation and categorization logic**

```typescript
// src/lib/ai/documenten.ts
import Anthropic from "@anthropic-ai/sdk";
import { AUTRONIS_CONTEXT } from "./autronis-context";
import { AiDraftRequest, AiDraftResponse, AiCategorisatieResponse, DocumentType } from "@/types/documenten";

const anthropic = new Anthropic();

const TYPE_PROMPTS: Record<DocumentType, string> = {
  contract: "Genereer een professioneel contract. Gebruik duidelijke clausules, partijen, verplichtingen en voorwaarden.",
  klantdocument: "Genereer een klantgericht document. Wees helder over deliverables en verwachtingen.",
  intern: "Genereer een intern document. Focus op duidelijke instructies en processen.",
  "belangrijke-info": "Genereer een beknopt overzicht van belangrijke informatie. Wees feitelijk en direct.",
  plan: "Genereer een projectplan of roadmap. Gebruik fases, milestones en concrete deliverables met een tijdlijn.",
  notitie: "Genereer een gestructureerde notitie met de belangrijkste punten.",
};

export async function generateDraft(request: AiDraftRequest): Promise<AiDraftResponse> {
  const veldenTekst = Object.entries(request.velden)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: `${AUTRONIS_CONTEXT}\n\n${TYPE_PROMPTS[request.type]}\n\nSchrijf in het Nederlands.`,
    messages: [
      {
        role: "user",
        content: `Maak een ${request.type} document aan met de volgende informatie:

Titel: ${request.titel}
${request.klantNaam ? `Klant: ${request.klantNaam}` : ""}
${request.projectNaam ? `Project: ${request.projectNaam}` : ""}
${veldenTekst ? `\nExtra informatie:\n${veldenTekst}` : ""}
${request.extraContext ? `\nContext: ${request.extraContext}` : ""}

Genereer het volledige document. Gebruik duidelijke koppen en structuur.`,
      },
    ],
  });

  const content = message.content[0].type === "text" ? message.content[0].text : "";

  // Generate summary
  const summaryMessage = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Geef een samenvatting van maximaal 2 zinnen van het volgende document:\n\n${content}`,
      },
    ],
  });

  const samenvatting = summaryMessage.content[0].type === "text" ? summaryMessage.content[0].text : "";

  return { content, samenvatting };
}

export async function categorizeDocument(content: string, type: DocumentType): Promise<AiCategorisatieResponse> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Analyseer het volgende ${type} document en geef:
1. Een samenvatting van maximaal 2 zinnen
2. Eventuele belangrijke datums (als array van strings in YYYY-MM-DD formaat)
3. Eventuele bedragen (als array van getallen)

Antwoord in JSON formaat:
{"samenvatting": "...", "extractedMetadata": {"datums": [...], "bedragen": [...]}}

Document:
${content}`,
      },
    ],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "{}";

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AiCategorisatieResponse;
    }
  } catch {
    // Fallback
  }

  return {
    samenvatting: "",
    extractedMetadata: {},
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/ai/documenten.ts
git commit -m "feat: add AI draft generation and categorization for documents"
```

---

## Chunk 2: API Routes

### Task 6: Rewrite documenten API routes

**Files:**
- Modify: `src/app/api/documenten/route.ts`
- Modify: `src/app/api/documenten/[id]/route.ts`

- [ ] **Step 1: Rewrite POST and add GET to main route**

Replace the content of `src/app/api/documenten/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createNotionDocument, fetchAllDocuments } from "@/lib/notion";
import { categorizeDocument } from "@/lib/ai/documenten";
import { DocumentPayload } from "@/types/documenten";
import { db } from "@/lib/db";
import { klanten, projecten } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireAuth();
    const documenten = await fetchAllDocuments();
    return NextResponse.json({ documenten });
  } catch (error) {
    if (error instanceof Error && error.message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
    }
    return NextResponse.json({ fout: "Kon documenten niet ophalen" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const gebruiker = await requireAuth();
    const payload = (await request.json()) as DocumentPayload;

    // Resolve klant/project names from IDs
    let klantNaam: string | undefined;
    let projectNaam: string | undefined;

    if ("klantId" in payload && payload.klantId) {
      const klant = db.select({ bedrijfsnaam: klanten.bedrijfsnaam }).from(klanten).where(eq(klanten.id, payload.klantId)).get();
      klantNaam = klant?.bedrijfsnaam;
    }

    if ("projectId" in payload && payload.projectId) {
      const project = db.select({ naam: projecten.naam }).from(projecten).where(eq(projecten.id, payload.projectId)).get();
      projectNaam = project?.naam;
    }

    // AI categorization
    const categorisatie = await categorizeDocument(payload.content, payload.type);

    // Create in Notion
    const result = await createNotionDocument(
      payload,
      categorisatie.samenvatting,
      gebruiker.naam,
      klantNaam,
      projectNaam
    );

    return NextResponse.json({ document: { ...result, type: payload.type } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
    }
    return NextResponse.json(
      { fout: error instanceof Error ? error.message : "Kon document niet aanmaken" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Rewrite [id] route for GET from Notion**

Replace the content of `src/app/api/documenten/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { fetchNotionDocument } from "@/lib/notion";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    const document = await fetchNotionDocument(id);
    if (!document) {
      return NextResponse.json({ fout: "Document niet gevonden" }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    if (error instanceof Error && error.message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
    }
    return NextResponse.json({ fout: "Kon document niet ophalen" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/documenten/route.ts src/app/api/documenten/\[id\]/route.ts
git commit -m "feat: rewrite documenten API routes to use Notion"
```

---

### Task 7: AI draft API route

**Files:**
- Create: `src/app/api/documenten/ai/route.ts`

- [ ] **Step 1: Create AI draft endpoint**

```typescript
// src/app/api/documenten/ai/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateDraft } from "@/lib/ai/documenten";
import { AiDraftRequest } from "@/types/documenten";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = (await request.json()) as AiDraftRequest;

    if (!body.type || !body.titel) {
      return NextResponse.json({ fout: "Type en titel zijn verplicht" }, { status: 400 });
    }

    const draft = await generateDraft(body);
    return NextResponse.json({ draft });
  } catch (error) {
    if (error instanceof Error && error.message === "Niet geauthenticeerd") {
      return NextResponse.json({ fout: "Niet geauthenticeerd" }, { status: 401 });
    }
    return NextResponse.json({ fout: "Kon AI draft niet genereren" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/documenten/ai/route.ts
git commit -m "feat: add AI draft generation endpoint"
```

---

## Chunk 3: React Query Hooks

### Task 8: Document query hooks

**Files:**
- Create: `src/hooks/queries/use-documenten.ts`

- [ ] **Step 1: Create React Query hooks for documents**

```typescript
// src/hooks/queries/use-documenten.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DocumentBase, DocumentPayload, AiDraftRequest, AiDraftResponse } from "@/types/documenten";

interface DocumentenResponse {
  documenten: DocumentBase[];
}

async function fetchDocumenten(): Promise<DocumentBase[]> {
  const res = await fetch("/api/documenten");
  if (!res.ok) throw new Error("Kon documenten niet ophalen");
  const data: DocumentenResponse = await res.json();
  return data.documenten;
}

export function useDocumenten() {
  return useQuery({
    queryKey: ["documenten"],
    queryFn: fetchDocumenten,
    staleTime: 60_000,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DocumentPayload) => {
      const res = await fetch("/api/documenten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout ?? "Kon document niet aanmaken");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documenten"] });
    },
  });
}

export function useGenerateDraft() {
  return useMutation({
    mutationFn: async (request: AiDraftRequest): Promise<AiDraftResponse> => {
      const res = await fetch("/api/documenten/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.fout ?? "Kon draft niet genereren");
      }
      const data = await res.json();
      return data.draft;
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/queries/use-documenten.ts
git commit -m "feat: add React Query hooks for documents"
```

---

## Chunk 4: UI Components

### Task 9: Document modal component

**Files:**
- Create: `src/components/documenten/document-modal.tsx`

- [ ] **Step 1: Create the document creation modal with type-specific forms**

```typescript
// src/components/documenten/document-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { useCreateDocument, useGenerateDraft } from "@/hooks/queries/use-documenten";
import { useKlanten } from "@/hooks/queries/use-klanten";
import { useToast } from "@/hooks/use-toast";
import { DocumentType, DocumentPayload, DOCUMENT_TYPE_LABELS } from "@/types/documenten";
import { Sparkles, Loader2 } from "lucide-react";

interface DocumentModalProps {
  open: boolean;
  onClose: () => void;
  initialType?: DocumentType;
}

export function DocumentModal({ open, onClose, initialType }: DocumentModalProps) {
  const [type, setType] = useState<DocumentType>(initialType ?? "notitie");
  const [titel, setTitel] = useState("");
  const [content, setContent] = useState("");
  const [klantId, setKlantId] = useState<number | undefined>();
  const [projectId, setProjectId] = useState<number | undefined>();

  // Type-specific fields
  const [status, setStatus] = useState("concept");
  const [startdatum, setStartdatum] = useState("");
  const [einddatum, setEinddatum] = useState("");
  const [bedrag, setBedrag] = useState("");
  const [subtype, setSubtype] = useState("overig");
  const [categorie, setCategorie] = useState("overig");
  const [urgentie, setUrgentie] = useState("normaal");
  const [gerelateerdAan, setGerelateerdAan] = useState("intern");
  const [datum, setDatum] = useState("");

  const { data: klanten } = useKlanten();
  const createDocument = useCreateDocument();
  const generateDraft = useGenerateDraft();
  const { addToast } = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setType(initialType ?? "notitie");
      setTitel("");
      setContent("");
      setKlantId(undefined);
      setProjectId(undefined);
      setStatus("concept");
      setStartdatum("");
      setEinddatum("");
      setBedrag("");
      setSubtype("overig");
      setCategorie("overig");
      setUrgentie("normaal");
      setGerelateerdAan("intern");
      setDatum("");
    }
  }, [open, initialType]);

  const selectedKlant = klanten?.find((k: { id: number }) => k.id === klantId) as { id: number; bedrijfsnaam: string } | undefined;

  async function handleAiDraft() {
    if (!titel) {
      addToast("Vul eerst een titel in", "waarschuwing");
      return;
    }

    try {
      const result = await generateDraft.mutateAsync({
        type,
        titel,
        klantNaam: selectedKlant?.bedrijfsnaam,
        velden: {
          ...(status && { status }),
          ...(subtype && { subtype }),
          ...(categorie && { categorie }),
        },
      });
      setContent(result.content);
      addToast("AI draft gegenereerd", "succes");
    } catch {
      addToast("Kon AI draft niet genereren", "fout");
    }
  }

  async function handleOpslaan() {
    if (!titel) {
      addToast("Titel is verplicht", "waarschuwing");
      return;
    }

    let payload: DocumentPayload;

    switch (type) {
      case "contract":
        payload = { type, titel, klantId, projectId, status: status as "concept" | "actief" | "verlopen", startdatum: startdatum || undefined, einddatum: einddatum || undefined, bedrag: bedrag ? parseFloat(bedrag) : undefined, content };
        break;
      case "klantdocument":
        payload = { type, titel, klantId, projectId, subtype: subtype as "proposal" | "oplevering" | "overig", content };
        break;
      case "intern":
        payload = { type, titel, categorie: categorie as "proces" | "handleiding" | "overig", content };
        break;
      case "belangrijke-info":
        payload = { type, titel, urgentie: urgentie as "hoog" | "normaal", gerelateerdAan: gerelateerdAan as "klant" | "project" | "intern", klantId, projectId, content };
        break;
      case "plan":
        payload = { type, titel, klantId, projectId, status: status as "concept" | "definitief", content };
        break;
      case "notitie":
        payload = { type, titel, klantId, projectId, subtype: subtype as "vergadering" | "brainstorm" | "overig", datum: datum || undefined, content };
        break;
    }

    try {
      const result = await createDocument.mutateAsync(payload);
      addToast("Document aangemaakt in Notion", "succes");
      if (result.document?.notionUrl) {
        window.open(result.document.notionUrl, "_blank");
      }
      onClose();
    } catch {
      addToast("Kon document niet aanmaken", "fout");
    }
  }

  const inputClass = "w-full rounded-lg bg-autronis-bg border border-autronis-border px-3 py-2 text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent";
  const labelClass = "block text-sm font-medium text-autronis-text-secondary mb-1";
  const selectClass = inputClass;

  return (
    <Modal open={open} onClose={onClose} titel="Nieuw document" breedte="lg">
      <div className="space-y-4">
        {/* Document type selector */}
        <div>
          <label className={labelClass}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as DocumentType)} className={selectClass}>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className={labelClass}>Titel</label>
          <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Document titel..." className={inputClass} />
        </div>

        {/* Klant (shown for types that support it) */}
        {["contract", "klantdocument", "belangrijke-info", "plan", "notitie"].includes(type) && (
          <div>
            <label className={labelClass}>Klant (optioneel)</label>
            <select value={klantId ?? ""} onChange={(e) => setKlantId(e.target.value ? parseInt(e.target.value) : undefined)} className={selectClass}>
              <option value="">Geen klant</option>
              {klanten?.map((k: { id: number; bedrijfsnaam: string }) => (
                <option key={k.id} value={k.id}>{k.bedrijfsnaam}</option>
              ))}
            </select>
          </div>
        )}

        {/* Type-specific fields */}
        {type === "contract" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                  <option value="concept">Concept</option>
                  <option value="actief">Actief</option>
                  <option value="verlopen">Verlopen</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Bedrag</label>
                <input type="number" value={bedrag} onChange={(e) => setBedrag(e.target.value)} placeholder="0.00" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Startdatum</label>
                <input type="date" value={startdatum} onChange={(e) => setStartdatum(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Einddatum</label>
                <input type="date" value={einddatum} onChange={(e) => setEinddatum(e.target.value)} className={inputClass} />
              </div>
            </div>
          </>
        )}

        {type === "klantdocument" && (
          <div>
            <label className={labelClass}>Subtype</label>
            <select value={subtype} onChange={(e) => setSubtype(e.target.value)} className={selectClass}>
              <option value="proposal">Proposal</option>
              <option value="oplevering">Oplevering</option>
              <option value="overig">Overig</option>
            </select>
          </div>
        )}

        {type === "intern" && (
          <div>
            <label className={labelClass}>Categorie</label>
            <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className={selectClass}>
              <option value="proces">Proces</option>
              <option value="handleiding">Handleiding</option>
              <option value="overig">Overig</option>
            </select>
          </div>
        )}

        {type === "belangrijke-info" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Urgentie</label>
              <select value={urgentie} onChange={(e) => setUrgentie(e.target.value)} className={selectClass}>
                <option value="normaal">Normaal</option>
                <option value="hoog">Hoog</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Gerelateerd aan</label>
              <select value={gerelateerdAan} onChange={(e) => setGerelateerdAan(e.target.value)} className={selectClass}>
                <option value="intern">Intern</option>
                <option value="klant">Klant</option>
                <option value="project">Project</option>
              </select>
            </div>
          </div>
        )}

        {type === "plan" && (
          <div>
            <label className={labelClass}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="concept">Concept</option>
              <option value="definitief">Definitief</option>
            </select>
          </div>
        )}

        {type === "notitie" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Subtype</label>
              <select value={subtype} onChange={(e) => setSubtype(e.target.value)} className={selectClass}>
                <option value="vergadering">Vergadering</option>
                <option value="brainstorm">Brainstorm</option>
                <option value="overig">Overig</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Datum</label>
              <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={inputClass} />
            </div>
          </div>
        )}

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Content</label>
            <button
              onClick={handleAiDraft}
              disabled={generateDraft.isPending}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-autronis-accent/10 text-autronis-accent hover:bg-autronis-accent/20 transition-colors disabled:opacity-50"
            >
              {generateDraft.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI Draft
            </button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Document inhoud..."
            rows={12}
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-autronis-text-secondary hover:text-autronis-text-primary transition-colors">
          Annuleren
        </button>
        <button
          onClick={handleOpslaan}
          disabled={createDocument.isPending || !titel}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-autronis-accent text-white hover:bg-autronis-accent-hover transition-colors disabled:opacity-50"
        >
          {createDocument.isPending ? "Opslaan..." : "Opslaan in Notion"}
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/documenten/document-modal.tsx
git commit -m "feat: add document creation modal with type-specific forms and AI draft"
```

---

### Task 10: Document list component

**Files:**
- Create: `src/components/documenten/document-list.tsx`

- [ ] **Step 1: Create document list with filters**

```typescript
// src/components/documenten/document-list.tsx
"use client";

import { useState } from "react";
import { useDocumenten } from "@/hooks/queries/use-documenten";
import { DocumentBase, DocumentType, DOCUMENT_TYPE_LABELS } from "@/types/documenten";
import { FileText, ExternalLink, Search } from "lucide-react";

const TYPE_COLORS: Record<DocumentType, string> = {
  contract: "bg-blue-500/10 text-blue-400",
  klantdocument: "bg-green-500/10 text-green-400",
  intern: "bg-purple-500/10 text-purple-400",
  "belangrijke-info": "bg-orange-500/10 text-orange-400",
  plan: "bg-autronis-accent/10 text-autronis-accent",
  notitie: "bg-gray-500/10 text-gray-400",
};

export function DocumentList() {
  const { data: documenten, isLoading, error } = useDocumenten();
  const [zoekterm, setZoekterm] = useState("");
  const [filterType, setFilterType] = useState<DocumentType | "alle">("alle");
  const [filterKlant, setFilterKlant] = useState("");
  const [filterDatum, setFilterDatum] = useState("");

  // Unique klant names for filter dropdown
  const klantNamen = [...new Set(documenten?.map((d: DocumentBase) => d.klantNaam).filter(Boolean) ?? [])];

  const gefilterd = documenten?.filter((doc: DocumentBase) => {
    const matchType = filterType === "alle" || doc.type === filterType;
    const matchZoek = !zoekterm || doc.titel.toLowerCase().includes(zoekterm.toLowerCase()) || doc.samenvatting.toLowerCase().includes(zoekterm.toLowerCase());
    const matchKlant = !filterKlant || doc.klantNaam === filterKlant;
    const matchDatum = !filterDatum || doc.aangemaaktOp.startsWith(filterDatum);
    return matchType && matchZoek && matchKlant && matchDatum;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-autronis-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-autronis-card border border-autronis-border p-8 text-center">
        <p className="text-autronis-text-secondary">Kon documenten niet ophalen. Probeer het opnieuw.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-autronis-text-secondary" />
          <input
            type="text"
            value={zoekterm}
            onChange={(e) => setZoekterm(e.target.value)}
            placeholder="Zoek documenten..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-autronis-card border border-autronis-border text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as DocumentType | "alle")}
          className="rounded-lg bg-autronis-card border border-autronis-border px-3 py-2 text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent"
        >
          <option value="alle">Alle types</option>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={filterKlant}
          onChange={(e) => setFilterKlant(e.target.value)}
          className="rounded-lg bg-autronis-card border border-autronis-border px-3 py-2 text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent"
        >
          <option value="">Alle klanten</option>
          {klantNamen.map((naam) => (
            <option key={naam} value={naam}>{naam}</option>
          ))}
        </select>
        <input
          type="month"
          value={filterDatum}
          onChange={(e) => setFilterDatum(e.target.value)}
          className="rounded-lg bg-autronis-card border border-autronis-border px-3 py-2 text-sm text-autronis-text-primary focus:outline-none focus:border-autronis-accent"
        />
      </div>

      {/* Document list */}
      {!gefilterd?.length ? (
        <div className="rounded-xl bg-autronis-card border border-autronis-border p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-autronis-text-secondary opacity-50" />
          <p className="text-autronis-text-secondary">
            {zoekterm || filterType !== "alle" ? "Geen documenten gevonden" : "Nog geen documenten. Maak je eerste document aan!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {gefilterd.map((doc: DocumentBase) => (
            <a
              key={doc.notionId}
              href={doc.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-autronis-card border border-autronis-border p-4 hover:border-autronis-accent/50 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-autronis-text-primary truncate">{doc.titel}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[doc.type]}`}>
                      {DOCUMENT_TYPE_LABELS[doc.type]}
                    </span>
                  </div>
                  {doc.samenvatting && (
                    <p className="text-xs text-autronis-text-secondary line-clamp-1">{doc.samenvatting}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-autronis-text-secondary">
                    {doc.klantNaam && <span>{doc.klantNaam}</span>}
                    {doc.aangemaaktOp && <span>{new Date(doc.aangemaaktOp).toLocaleDateString("nl-NL")}</span>}
                    <span>{doc.aangemaaktDoor}</span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-autronis-text-secondary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/documenten/document-list.tsx
git commit -m "feat: add document list component with search and type filter"
```

---

## Chunk 5: Pages and Navigation Integration

### Task 11: Documents overview page

**Files:**
- Create: `src/app/(dashboard)/documenten/page.tsx`

- [ ] **Step 1: Create the documenten page**

```typescript
// src/app/(dashboard)/documenten/page.tsx
"use client";

import { useState } from "react";
import { DocumentList } from "@/components/documenten/document-list";
import { DocumentModal } from "@/components/documenten/document-modal";
import { Plus } from "lucide-react";
import { DocumentType } from "@/types/documenten";

export default function DocumentenPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [initialType, setInitialType] = useState<DocumentType | undefined>();

  function openModal(type?: DocumentType) {
    setInitialType(type);
    setModalOpen(true);
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-autronis-text-primary">Documenten</h1>
          <p className="text-sm text-autronis-text-secondary mt-1">Alle documenten in Notion</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-autronis-accent text-white text-sm font-medium hover:bg-autronis-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nieuw document
        </button>
      </div>

      <DocumentList />

      <DocumentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialType={initialType}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/documenten/page.tsx
git commit -m "feat: add documenten overview page"
```

---

### Task 12: Add to sidebar navigation

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add Documenten to sidebar navItems array**

Add to the `navItems` array (after the existing items, near "Offertes" or "Wiki"):

```typescript
{ label: "Documenten", icon: FileText, href: "/documenten" },
```

Make sure `FileText` is imported from `lucide-react` (it likely already is, but verify).

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Documenten to sidebar navigation"
```

---

### Task 13: Update quick action button with document submenu

**Files:**
- Modify: `src/components/ui/quick-action-button.tsx`

- [ ] **Step 1: Add document submenu to quick action button**

The quick action button needs a submenu for documents. Modify `quick-action-button.tsx`:

1. Add `FileText` to lucide-react imports
2. Change the actions array to support an optional `submenu` property:

```typescript
interface QuickAction {
  label: string;
  icon: typeof Timer;
  href?: string;
  submenu?: { label: string; href: string }[];
}

const actions: QuickAction[] = [
  { label: "Timer starten", icon: Timer, href: "/tijdregistratie" },
  { label: "Taak aanmaken", icon: CheckSquare, href: "/taken?nieuw=true" },
  { label: "Lead toevoegen", icon: UserPlus, href: "/crm?nieuw=true" },
  { label: "Factuur aanmaken", icon: Receipt, href: "/financien/nieuw" },
  {
    label: "Nieuw document",
    icon: FileText,
    submenu: [
      { label: "Contract", href: "/documenten?nieuw=contract" },
      { label: "Klantdocument", href: "/documenten?nieuw=klantdocument" },
      { label: "Intern document", href: "/documenten?nieuw=intern" },
      { label: "Belangrijke info", href: "/documenten?nieuw=belangrijke-info" },
      { label: "Plan / Roadmap", href: "/documenten?nieuw=plan" },
      { label: "Notitie", href: "/documenten?nieuw=notitie" },
    ],
  },
];
```

3. In the render, when action has `submenu`, show nested items on hover/click instead of navigating directly.

Then in `src/app/(dashboard)/documenten/page.tsx`, add a `useSearchParams` check:

```typescript
import { useSearchParams } from "next/navigation";

// Inside component:
const searchParams = useSearchParams();

useEffect(() => {
  const nieuwType = searchParams.get("nieuw");
  if (nieuwType) {
    setInitialType(nieuwType as DocumentType);
    setModalOpen(true);
    window.history.replaceState({}, "", "/documenten");
  }
}, [searchParams]);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/quick-action-button.tsx src/app/\(dashboard\)/documenten/page.tsx
git commit -m "feat: add Nieuw document to quick action button"
```

---

### Task 14: Add documents to command palette search

**Files:**
- Modify: `src/components/ui/command-palette.tsx`
- Modify: `src/app/api/zoeken/route.ts`

- [ ] **Step 1: Add "document" to command palette types**

In `command-palette.tsx`:

1. Update the `ZoekResultaat` interface to include `"document"` in the type union:
```typescript
type: "klant" | "project" | "factuur" | "taak" | "lead" | "document";
```

2. Add `externalUrl?: string` to the `ZoekResultaat` interface for Notion links.

3. Add to the `typeIcons` and `typeLabels` objects:
```typescript
// In typeIcons:
document: FileText,

// In typeLabels:
document: "Document",
```

4. Add `{ label: "Documenten", icon: FileText, href: "/documenten" }` to the `pages` array.

5. In the click handler for search results, check for `externalUrl`:
```typescript
if (resultaat.externalUrl) {
  window.open(resultaat.externalUrl, "_blank");
} else {
  router.push(resultaat.url);
}
```

Add `FileText` to the lucide-react import if not already present.

- [ ] **Step 2: Add document search to zoeken API**

In `src/app/api/zoeken/route.ts`, add document search using a simple in-memory cache to avoid live Notion queries on every search:

```typescript
import { fetchAllDocuments } from "@/lib/notion";
import { DocumentBase } from "@/types/documenten";

// Simple in-memory cache for document search (refreshes every 60s)
let documentCache: { data: DocumentBase[]; timestamp: number } = { data: [], timestamp: 0 };
const CACHE_TTL = 60_000;

async function getCachedDocuments(): Promise<DocumentBase[]> {
  if (Date.now() - documentCache.timestamp > CACHE_TTL) {
    try {
      documentCache = { data: await fetchAllDocuments(), timestamp: Date.now() };
    } catch {
      // Return stale cache on error
    }
  }
  return documentCache.data;
}

// Inside the search handler, after existing searches:
try {
  const documenten = await getCachedDocuments();
  const matchingDocs = documenten
    .filter(doc => doc.titel.toLowerCase().includes(zoekterm.toLowerCase()))
    .slice(0, 5)
    .map(doc => ({
      id: doc.notionId,
      type: "document" as const,
      titel: doc.titel,
      subtitel: doc.samenvatting || doc.type,
      externalUrl: doc.notionUrl,
    }));
  resultaten.push(...matchingDocs);
} catch {
  // Notion search failed silently - other results still work
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/command-palette.tsx src/app/api/zoeken/route.ts
git commit -m "feat: add document search to command palette"
```

---

## Chunk 6: Verification

### Task 15: Manual verification checklist

- [ ] **Step 1: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds without TypeScript errors

- [ ] **Step 2: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts on localhost:3000

- [ ] **Step 3: Verify environment variables are set**

Check that `.env.local` has all required `NOTION_*` variables configured.

- [ ] **Step 4: Manual test — navigate to /documenten**

Expected: Page loads with empty state ("Nog geen documenten")

- [ ] **Step 5: Manual test — create a document**

1. Click "Nieuw document"
2. Select type "Notitie"
3. Fill in title
4. Click "AI Draft" → verify AI generates content
5. Click "Opslaan in Notion" → verify success toast + Notion link opens

- [ ] **Step 6: Manual test — verify document appears in list**

Refresh /documenten page. The created document should appear.

- [ ] **Step 7: Manual test — quick action button**

Click floating button → "Nieuw document" → verify it opens /documenten with modal

- [ ] **Step 8: Manual test — command palette search**

Press Cmd+K → type document title → verify it appears in results

- [ ] **Step 9: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual verification"
```
