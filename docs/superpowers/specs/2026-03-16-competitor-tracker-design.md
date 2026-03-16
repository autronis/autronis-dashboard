# AI Competitor Tracker — Design Spec

**Datum:** 2026-03-16
**Feature:** `/concurrenten` — AI-gestuurde concurrent monitoring
**Status:** Ontwerp goedgekeurd

## Overzicht

Een competitor tracker die wekelijks concurrenten scant op website changes, vacatures en social media activiteit. AI (Claude) analyseert de veranderingen en genereert samenvattingen, highlights, trend-indicatoren en kansen voor Autronis.

## Scope — MVP

### In scope (3 scan-categorieën):
1. **Website changes** — fetch + text extraction, diff met vorige snapshot
2. **Vacatures** — Indeed/LinkedIn publieke zoekresultaten scrapen
3. **Social activity** — Instagram posting frequentie, LinkedIn activiteit

### Buiten scope (later toevoegen):
- Google Reviews monitoring
- Tech stack detectie
- Case study tracking

### Schaal
- 3-5 concurrenten (sequential scanning, geen queue nodig)

## Architectuur

**Aanpak: Monoliet + scan-per-concurrent**

Scan-logica, AI-calls en opslag in Next.js API routes (zelfde patroon als briefing/radar). Concurrenten worden individueel gescand met status tracking. Eén API call start de scan, elk resultaat wordt apart opgeslagen zodra klaar. Frontend toont live voortgang via polling.

### Triggers
- **In-app knop** — handmatig scannen via UI
- **Webhook** — `POST /api/concurrenten/webhook` met API key, zodat n8n wekelijks kan triggeren

## Database Schema

### `concurrenten`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | integer PK | Auto-increment |
| naam | text NOT NULL | Bedrijfsnaam |
| websiteUrl | text NOT NULL | Hoofd-URL |
| linkedinUrl | text | LinkedIn bedrijfspagina URL |
| instagramHandle | text | Instagram handle (zonder @) |
| scanPaginas | text | JSON array van subpagina's om te scannen (default: ["/diensten", "/over-ons", "/pricing", "/cases"]) |
| notities | text | Vrij tekstveld voor context |
| isActief | integer DEFAULT 1 | Soft delete |
| aangemaaktOp | text | datetime('now') |
| bijgewerktOp | text | datetime('now') |

### `concurrentSnapshots`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | integer PK | Auto-increment |
| concurrentId | integer FK | → concurrenten.id |
| url | text NOT NULL | De gescande URL |
| contentHash | text NOT NULL | SHA-256 van extracted text |
| extractedText | text NOT NULL | Plaintext van de pagina |
| aangemaaktOp | text | datetime('now') |

Doel: ruwe website-inhoud bewaren voor diff-vergelijking. Bewaar laatste 2 per URL (huidige + vorige).

### `concurrentScans`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | integer PK | Auto-increment |
| concurrentId | integer FK | → concurrenten.id |
| status | text DEFAULT 'bezig' | "bezig" / "voltooid" / "mislukt" |
| scanDatum | text NOT NULL | Datum van de scan |
| websiteChanges | text (JSON) | Welke pagina's veranderd, wat is nieuw/weg |
| vacatures | text (JSON) | Gevonden vacatures met titel, bron, URL |
| socialActivity | text (JSON) | Posting frequentie, recente posts |
| aiSamenvatting | text | Claude's analyse (2-3 zinnen) |
| aiHighlights | text (JSON) | Array van opvallende punten |
| trendIndicator | text | "groeiend" / "stabiel" / "krimpend" |
| kansen | text (JSON) | Door AI gedetecteerde kansen |
| aangemaaktOp | text | datetime('now') |

## API Routes

### CRUD — concurrenten beheren
| Method | Route | Beschrijving |
|--------|-------|-------------|
| GET | `/api/concurrenten` | Lijst actieve concurrenten + laatste scan samenvatting |
| POST | `/api/concurrenten` | Nieuwe concurrent toevoegen |
| GET | `/api/concurrenten/[id]` | Detail + alle scans (historie) |
| PUT | `/api/concurrenten/[id]` | Concurrent bijwerken |
| DELETE | `/api/concurrenten/[id]` | Soft delete (isActief = 0) |

### Scanning
| Method | Route | Beschrijving |
|--------|-------|-------------|
| POST | `/api/concurrenten/scan` | Start scan voor alle actieve concurrenten |
| POST | `/api/concurrenten/scan/[id]` | Scan één specifieke concurrent |
| GET | `/api/concurrenten/scan/status` | Polling endpoint voor voortgang (zie Response Schemas) |

### Webhook
| Method | Route | Beschrijving |
|--------|-------|-------------|
| POST | `/api/concurrenten/webhook` | Twee modi: trigger scan of ontvang data (zie Webhook sectie) |

### Dashboard integratie
| Method | Route | Beschrijving |
|--------|-------|-------------|
| GET | `/api/dashboard/concurrenten` | Widget data: wijzigingen deze week, highlights |

## Response Schemas

### GET /api/concurrenten/scan/status
```json
{
  "actief": true,
  "concurrenten": [
    { "id": 1, "naam": "DigitalAgency.nl", "status": "voltooid" },
    { "id": 2, "naam": "WebWerkt", "status": "bezig", "stap": "vacatures" },
    { "id": 3, "naam": "AutomatePro", "status": "wachtend" },
    { "id": 4, "naam": "TechFlow", "status": "mislukt", "fout": "Timeout" }
  ]
}
```
Statussen per concurrent: `wachtend` → `bezig` → `voltooid` | `mislukt`. Veld `stap` toont huidige stap als `bezig`. Als `actief: false` is de hele scan klaar.

### GET /api/dashboard/concurrenten
```json
{
  "wijzigingenDezeWeek": 7,
  "highlights": [
    { "concurrentNaam": "DigitalAgency.nl", "tekst": "AI-diensten gelanceerd", "type": "waarschuwing" },
    { "concurrentNaam": "AutomatePro", "tekst": "Enterprise tier verwijderd", "type": "kans" }
  ],
  "laatsteScan": "2026-03-16T08:00:00Z"
}
```

### AI Prompt Structuur (Stap 4)
Claude ontvangt per concurrent:
```
Je bent een competitive intelligence analist voor Autronis (AI & automatiseringsbureau).
Analyseer de volgende scan-data van concurrent "{naam}" ({websiteUrl}).

## Website changes
{diff of null}

## Vacatures
{vacatures JSON of null}

## Social activity
{social data of null}

## Vorige scan samenvatting
{vorige aiSamenvatting of "Eerste scan — geen historie"}

Genereer een JSON response:
{
  "aiSamenvatting": "2-3 zinnen samenvatting in het Nederlands",
  "aiHighlights": ["opvallend punt 1", "opvallend punt 2"],
  "trendIndicator": "groeiend" | "stabiel" | "krimpend",
  "kansen": ["kans voor Autronis 1", "kans 2"]
}
```

## Scan Pipeline

Per concurrent, sequential:

### Stap 1 — Website changes
1. `fetch()` website URL + subpagina's (/diensten, /over-ons, /pricing, /cases)
2. Strip HTML tags → plaintext
3. SHA-256 hash berekenen
4. Vergelijk met vorige snapshot hash → als gelijk, skip
5. Als anders: tekst-diff genereren, nieuwe snapshot opslaan

### Stap 2 — Vacatures (best-effort)
1. Google Search scrape: `"{bedrijfsnaam}" vacature site:linkedin.com OR site:indeed.nl`
2. Fallback: directe Indeed.nl search URL met bedrijfsnaam
3. Extract vacature-titels en URLs uit zoekresultaten HTML
4. Vergelijk met vorige scan → markeer nieuwe vacatures
5. **Degraded mode:** als alle bronnen geblokkeerd worden, sla `null` op met error. Dit is een best-effort feature — Google/LinkedIn kunnen scraping blokkeren. De website changes scan levert altijd de meeste waarde.

### Stap 3 — Social activity (best-effort)
1. Instagram: fetch `instagram.com/{handle}/` met browser-like User-Agent headers. Extract basale metadata (bio, post count) uit de HTML. **Let op:** Instagram blokkeert vaak ongeauthenticeerde requests — dit is best-effort.
2. LinkedIn: bedrijfspagina fetch — eveneens best-effort, beperkte data zonder API.
3. Vergelijk beschikbare data met vorige scan
4. **Degraded mode:** als scraping faalt, sla `null` op. Social data is "nice to have" — website changes + vacatures zijn de kern.

### Stap 4 — AI analyse
Claude ontvangt alle ruwe data en genereert:
- `aiSamenvatting`: 2-3 zinnen over veranderingen
- `aiHighlights`: array van opvallende punten
- `trendIndicator`: groeiend/stabiel/krimpend
- `kansen`: wat Autronis hiervan kan benutten

Elke stap is fout-tolerant — bij error krijgt het JSON-veld `null` met error-notitie. Rest gaat door.

## UI Design

### /concurrenten — overzichtspagina
- **KPI-rij:** actieve concurrenten, wijzigingen deze week, groeiend aantal, laatste scan datum
- **Cards grid:** per concurrent een card met:
  - Naam + URL
  - Trend badge (groeiend/stabiel/krimpend) als rounded pill
  - AI samenvatting (2-3 zinnen)
  - Scan-categorie badges met change counts
  - AI highlights (accent border-left cards)
  - Laatste scan datum + actie-knoppen (details, scan)
- **Header:** "Concurrenten" + "Scan alles" knop + "Concurrent toevoegen" knop
- **Scan voortgang:** als scan loopt, progress indicator met per-concurrent status (done/active/pending)

### /concurrenten/[id] — detail pagina
- **Header:** bedrijfsnaam, URL, social links, scan/bewerk knoppen
- **Tabs:** Scan historie, Website changes, Vacatures, Social
- **Scan historie tab:** timeline met dots, per scan een samenvatting
- **Overige tabs:** gedetailleerde data per categorie met raw JSON weergave

### Dashboard widget
- **Compact card** op de homepage: "Concurrent updates" met badge count
- Lijst van highlights (max 3-4 items)
- Kansen in groen gemarkeerd
- Link naar /concurrenten voor meer

## Integraties

### Daily Briefing
- Briefing API krijgt extra sectie `concurrentUpdates`
- Bij genereren worden laatste scans van die week meegenomen in de Claude prompt
- Alleen relevante updates — geen "geen wijzigingen" spam

### Learning Radar
- Als concurrent een tool/platform gebruikt dat in de radar staat, wordt dat gelinkt
- Simpele text-match in de AI prompt: scan-data + radar items → Claude detecteert overlap
- Voorbeeld: "AutomatePro gebruikt een tool uit je radar: n8n"

### Webhook voor n8n
`POST /api/concurrenten/webhook` met Bearer token (bestaande `requireApiKey()` uit `src/lib/auth.ts`).

Twee modi:
1. **Trigger mode:** `{ action: "scan" }` of `{ action: "scan", concurrentId: 3 }` — start de in-app scan pipeline
2. **Data mode:** `{ action: "data", concurrentId: 3, websiteChanges: {...}, vacatures: {...}, socialActivity: {...} }` — n8n stuurt kant-en-klare data, dashboard slaat op en genereert AI samenvatting

Dit maakt beide patronen mogelijk: n8n als simpele cron trigger, of n8n als volledige scraping pipeline.

## Error Handling & Edge Cases

### Scan fouten
- Per stap: als een stap faalt, gaat de rest door
- JSON-veld krijgt `null` + `error` key met reden
- UI toont subtiele waarschuwing

### Website niet bereikbaar
- Timeout: 10 seconden per fetch
- Bij 3 opeenvolgende mislukte scans: markeer als "scan probleem" in UI
- Geen automatische deactivatie

### Concurrent scan guard
- Als er al een scan loopt (`actief: true` op status endpoint), weiger nieuwe scan-all met `{ fout: "Scan is al bezig" }`
- Individuele scan per concurrent is wel toegestaan als die concurrent niet al gescand wordt

### Rate limiting
- 2 seconden pauze tussen website fetches
- Claude API: één call per concurrent per scan

### Data retentie
- Snapshots: laatste 2 per URL (huidige + vorige). Cleanup bij insert: na opslaan nieuwe snapshot, verwijder alle behalve de 2 nieuwste per (concurrentId, url).
- Scans: bewaar alles (historie voor trends)
- Geen automatische cleanup nodig bij 3-5 concurrenten

### Eerste scan
- Geen vorige snapshot → geen diff
- AI genereert "baseline" samenvatting
- UI toont: "Eerste scan — baseline vastgelegd"

## Bestaande patronen gevolgd

- React Query hooks in `/src/hooks/queries/use-concurrenten.ts`
- API routes met `requireAuth()`, foutmeldingen in Nederlands (`{ fout: "..." }`)
- Card-based UI met `rounded-2xl`, `card-glow`, autronis-* CSS tokens
- Soft delete via `isActief` flag
- Toast notificaties via `useToast()`
- Sidebar navigatie-item in sectie "Groei"

## Nieuwe files

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── concurrenten/
│   │       ├── page.tsx              # Overzichtspagina
│   │       └── [id]/
│   │           └── page.tsx          # Detail pagina
│   └── api/
│       └── concurrenten/
│           ├── route.ts              # GET (lijst) + POST (nieuw)
│           ├── [id]/
│           │   └── route.ts          # GET + PUT + DELETE
│           ├── scan/
│           │   ├── route.ts          # POST (start scan alles)
│           │   ├── [id]/
│           │   │   └── route.ts      # POST (scan één)
│           │   └── status/
│           │       └── route.ts      # GET (voortgang)
│           └── webhook/
│               └── route.ts          # POST (n8n webhook)
├── hooks/
│   └── queries/
│       └── use-concurrenten.ts       # React Query hooks
└── lib/
    └── db/
        └── schema.ts                 # + 3 nieuwe tabellen
```

## Bestaande files gewijzigd

- `src/lib/db/schema.ts` — 3 nieuwe tabellen toevoegen
- `src/components/layout/sidebar.tsx` — navigatie-item toevoegen
- `src/app/(dashboard)/page.tsx` — dashboard widget toevoegen
- `src/app/api/briefing/route.ts` — concurrentUpdates sectie toevoegen
