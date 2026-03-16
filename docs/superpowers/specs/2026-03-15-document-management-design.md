# Document Management Systeem — Design Spec

## Overzicht

Een document management systeem voor het Autronis dashboard waarmee documenten snel aangemaakt worden via het dashboard, automatisch door AI worden verwerkt (draft generatie, categorisatie, samenvatting), en opgeslagen worden in Notion als bron van waarheid.

## Aanpak

**Notion-first:** Dashboard is de invoer- en overzichtslaag, Notion is de opslag. Geen dubbele data, geen sync. Documenten worden via de Notion API aangemaakt en opgehaald.

### Migratie van bestaand systeem

Er bestaat al een SQLite `documenten` tabel en bijbehorende API routes (`/api/documenten`). Deze worden vervangen door het nieuwe Notion-based systeem:
- De bestaande `/api/documenten` routes worden herschreven om met Notion te werken
- De bestaande SQLite `documenten` tabel wordt niet meer gebruikt voor nieuwe documenten
- Eventuele bestaande data in de SQLite tabel wordt handmatig gemigreerd naar Notion indien nodig

## Document Types (vast)

| Type | Voorbeelden |
|------|-------------|
| Contracten | Klantcontracten, SLA's |
| Klantdocumenten | Proposals, opleverdocumenten |
| Interne documenten | Processen, handleidingen |
| Belangrijke info | Beslissingen, afspraken |
| Plannen & Roadmaps | Projectplannen, technische specs, roadmaps |
| Notities | Vergadernotities, brainstorms |

**Afbakening:** Bestaande `offertes` en `proposals` features in het dashboard blijven ongewijzigd. Het document type "Klantdocumenten" is bedoeld voor opleverdocumenten en overige klant-gerelateerde docs, niet voor offertes/proposals.

## Notion Structuur

6 aparte Notion databases, elk met type-specifieke properties:

### Contracten
- Titel, Klant, Status (concept/actief/verlopen), Startdatum, Einddatum, Bedrag, Samenvatting

### Klantdocumenten
- Titel, Klant, Project, Type (proposal/oplevering/overig), Samenvatting

### Interne documenten
- Titel, Categorie (proces/handleiding/overig), Eigenaar, Samenvatting

### Belangrijke info
- Titel, Urgentie (hoog/normaal), Gerelateerd aan (klant/project/intern), Samenvatting

### Plannen & Roadmaps
- Titel, Klant, Project, Status (concept/definitief), Milestones (rich text — beschrijving van milestones in de page body), Samenvatting

### Notities
- Titel, Type (vergadering/brainstorm/overig), Klant, Project, Datum, Samenvatting

Elke database bevat ook: `Aangemaakt door`, `Aangemaakt op`.

## Dashboard UI

### Quick Action Button (uitbreiding bestaand)

De floating quick action button heeft momenteel 4 acties. Om UI-overflow te voorkomen wordt het menu geherstructureerd met een submenu:

Hoofdmenu (bestaand):
- Timer starten
- Taak aanmaken
- Lead toevoegen
- Factuur aanmaken
- **Nieuw document** → opent submenu met: Contract, Klantdocument, Intern document, Belangrijke info, Plan/Roadmap, Notitie

### Documenten overzichtspagina (`/documenten`)

- Nieuwe pagina in de sidebar navigatie
- Toont recente documenten uit alle 6 Notion databases
- Filters: type, klant, datum
- Elke rij toont: titel, type-badge, klant (indien gekoppeld), datum, directe link naar Notion
- Zoekfunctie
- Loading skeleton state tijdens het ophalen van Notion data
- Lege state wanneer er nog geen documenten zijn
- Consistent met bestaande dashboard design (cards, turquoise accent, card-glow hover)

### Modal formulieren

Elk document type heeft een eigen formulier met type-specifieke velden.

Voorbeeld — Contract modal:
- Titel (verplicht)
- Klant (dropdown uit bestaande klanten, optioneel)
- Project (dropdown gefilterd op geselecteerde klant, optioneel)
- Startdatum / Einddatum
- Bedrag
- Content (groot tekstveld)
- "AI Draft" knop — genereert concept op basis van ingevulde velden
- "Opslaan" knop — verwerkt via AI en slaat op in Notion

### Command Palette (Cmd+K)

Documenten worden doorzoekbaar via de bestaande command palette:
- Zoekt in gecachte documentenlijst (niet live Notion queries per zoekopdracht)
- Resultaat toont: titel, type-badge, klant
- Actie bij selectie: opent Notion pagina in nieuw tabblad

## AI Integratie (Anthropic Claude)

Gebruikt de bestaande `@anthropic-ai/sdk` dependency, consistent met de AI assistent in het dashboard.

### 1. Draft genereren

- Gebruiker vult basisvelden in en klikt "AI Draft"
- Claude ontvangt een system prompt met Autronis context + de ingevulde velden
- Genereert een volledig concept in het Nederlands
- Gebruiker kan bewerken voordat het naar Notion gaat

### 2. Automatisch categoriseren & structureren

Bij opslaan:
- Claude genereert een samenvatting (1-2 zinnen)
- Extraheert relevante metadata (datums, bedragen uit de tekst)
- Verifieert dat het juiste document type is gekozen

### 3. Autronis context (system prompt)

- Vaste context over Autronis: wie ze zijn, diensten, werkwijze, tone of voice
- Opgeslagen als config bestand in het project (`src/lib/ai/autronis-context.ts`)
- Meegegeven bij elk AI verzoek
- Uitbreidbaar met klantspecifieke context uit het dashboard

## Technische Architectuur

### API routes (herschrijven bestaande + nieuw)

Alle routes gebruiken de bestaande `requireAuth()` middleware.

| Route | Methode | Doel |
|-------|---------|------|
| `/api/documenten` | POST | Document aanmaken → AI verwerking → opslaan in Notion |
| `/api/documenten` | GET | Documenten ophalen uit Notion (met React Query cache) |
| `/api/documenten/ai` | POST | AI draft genereren |
| `/api/documenten/[id]` | GET | Enkel document ophalen uit Notion |

### Caching strategie

- React Query met `staleTime: 60_000` (60 seconden)
- Na aanmaken van een document: handmatige invalidatie van de documenten query
- Notion databases worden sequentieel opgehaald (niet parallel) om rate limits te respecteren (Notion: 3 req/s)
- Bij Notion API fout: toon Nederlandse foutmelding ("Kon documenten niet ophalen. Probeer het opnieuw.")

### Nieuwe bestanden

| Bestand | Doel |
|---------|------|
| `src/lib/notion.ts` | Notion API client + database helpers |
| `src/lib/ai/documenten.ts` | Claude prompts + verwerking voor documenten |
| `src/lib/ai/autronis-context.ts` | Vaste Autronis context (system prompt) |
| `src/types/documenten.ts` | TypeScript interfaces voor alle document types |
| `src/app/(dashboard)/documenten/page.tsx` | Documenten overzichtspagina |
| `src/components/documenten/document-modal.tsx` | Aanmaak modal met type-specifieke formulieren |
| `src/components/documenten/document-list.tsx` | Documentenlijst component |
| `src/hooks/queries/use-documenten.ts` | React Query hooks voor documenten |

### TypeScript types

```typescript
// src/types/documenten.ts
type DocumentType = 'contract' | 'klantdocument' | 'intern' | 'belangrijke-info' | 'plan' | 'notitie';

interface DocumentBase {
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

// Per-type interfaces extending DocumentBase
interface ContractDocument extends DocumentBase { ... }
// etc.
```

### Geen SQLite schema wijzigingen

Notion is de opslag. De bestaande `documenten` tabel in SQLite wordt niet meer actief gebruikt.

### Nieuwe environment variabelen

| Variabele | Doel |
|-----------|------|
| `NOTION_API_KEY` | Notion integration token |
| `NOTION_DB_CONTRACTEN` | Notion database ID voor contracten |
| `NOTION_DB_KLANTDOCUMENTEN` | Notion database ID voor klantdocumenten |
| `NOTION_DB_INTERNE_DOCUMENTEN` | Notion database ID voor interne documenten |
| `NOTION_DB_BELANGRIJKE_INFO` | Notion database ID voor belangrijke info |
| `NOTION_DB_PLANNEN` | Notion database ID voor plannen & roadmaps |
| `NOTION_DB_NOTITIES` | Notion database ID voor notities |

**Opmerking:** `ANTHROPIC_API_KEY` bestaat al in het project.

## Error Handling

- Alle Notion API calls worden gewrapt in try/catch
- Bij Notion rate limit (429): wacht en retry (max 2 pogingen)
- Bij Notion onbereikbaar: toon foutmelding in het Nederlands
- Bij AI fout: document kan alsnog handmatig opgeslagen worden (zonder samenvatting)
- Alle foutmeldingen volgen bestaand patroon: `{ fout: "..." }`

## User Flow

```
Gebruiker klikt "Nieuw document" → kiest type (quick action of /documenten)
    ↓
Modal opent met type-specifieke template velden
    ↓
Gebruiker vult titel, klant, etc. in
    ↓
[Optioneel] Klikt "AI Draft" → Claude genereert concept
    ↓
Gebruiker bewerkt content naar wens
    ↓
Klikt "Opslaan"
    ↓
Backend: Claude genereert samenvatting + verifieert metadata
    ↓
Backend: Notion API maakt pagina aan in juiste database
    ↓
Dashboard toont bevestiging + link naar Notion
    ↓
Document verschijnt in /documenten overzicht
```

## Koppeling met bestaande data

- Klant/project dropdown haalt data uit bestaande SQLite klanten/projecten tabellen
- Documenten koppeling aan klant/project is optioneel (interne docs hoeven geen klant)
- Op de klantpagina (`/klanten/[id]`) kan later een "Documenten" tab worden toegevoegd

## Buiten scope

- Documenten bewerken in het dashboard (Notion is de editor)
- Bestandsuploads / bijlagen
- Versiebeheer
- Configureerbare document types (vast in code)
- Notificaties bij document wijzigingen
- Paginatie (wordt pas relevant bij grote aantallen documenten)
