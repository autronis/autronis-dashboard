# Screen Time Tracker — Design Spec

## Overzicht

Automatische screen time tracking voor Autronis. Bestaat uit twee delen: een Tauri desktop agent die op de machines van Sem en Syb draait, en een dashboard module die de data toont, categoriseert en koppelt aan projecten/tijdregistratie.

## Deel 1: Tauri Desktop Agent

### Functionaliteit

- Achtergrondproces dat elke 5-10 seconden de actieve app + venstertitel + URL (bij browsers) logt
- Lokale SQLite buffer voor offline resilience
- Batch sync naar dashboard API elke 30-60 seconden
- Categorisatie-engine (server-side):
  1. Check regels (app/URL pattern → categorie)
  2. Onbekende apps worden gebatcht en server-side gecategoriseerd via Anthropic API (houdt API key op één plek, vermindert kosten door batching)
  3. AI-suggesties kunnen goedgekeurd worden in het dashboard en worden dan regels
- Systeemtray icoon:
  - Status indicator (tracking aan/uit, verbinding)
  - Pauze/hervat tracking
  - Exclude huidige app
- Auto-start bij OS opstarten
- Privacy: exclude-lijst voor specifieke apps/URLs

### Tech Stack

- **Tauri 2.0** — Rust backend, webview frontend
- **Frontend:** React + TypeScript (hergebruik Autronis design tokens)
- **Lokale opslag:** SQLite via rusqlite
- **OS integratie:** platform-specifieke APIs voor actieve venster detectie
  - Windows: `windows-rs` crate (GetForegroundWindow, GetWindowText)
  - macOS: `CGWindowListCopyWindowInfo` via accessibility APIs
- **Browser URL detectie:** via UI Automation APIs (niet venstertitel — moderne browsers tonen paginatitel, niet URL). Windows: `UIAutomation` API om de adresbalk van Chromium/Firefox browsers uit te lezen. macOS: accessibility APIs.

### Sync Protocol

```
POST /api/screen-time/sync
Authorization: Bearer <user-api-token>
Content-Type: application/json

{
  "entries": [
    {
      "clientId": "a1b2c3d4-uuid",
      "app": "Code",
      "venstertitel": "page.tsx — autronis-dashboard",
      "url": null,
      "startTijd": "2026-03-15T09:00:00Z",
      "eindTijd": "2026-03-15T09:05:00Z",
      "duurSeconden": 300
    }
  ]
}
```

`gebruikerId` wordt **niet** meegegeven in de payload — de server leidt dit af uit de geauthenticeerde API key. Elke entry heeft een `clientId` (UUID) voor idempotency — dubbele syncs worden genegeerd.

### Sync Response

```json
{
  "verwerkt": 12,
  "overgeslagen": 0,
  "categorieen": [
    { "clientId": "a1b2c3d4-uuid", "categorie": "Development", "projectId": 5 }
  ],
  "nieuweRegels": [
    { "app": "Code", "categorie": "Development" }
  ]
}
```

## Deel 2: Dashboard Module

### Nieuwe pagina: `/schermtijd`

(Nederlands, consistent met de rest: `/tijdregistratie`, `/klanten`, `/financien`)

#### Persoonlijk overzicht (standaard tab)
- Dag/week/maand selector
- Totale screen time KPI
- Categorie-verdeling (Development, Communicatie, Design, Administratie, Afleiding)
  - Staafdiagram per categorie met tijdsduur
  - Percentage productief vs. niet-productief
- Top apps/websites lijst met tijdsduur
- Tijdlijn: visuele blokken per uur van de dag (welke app wanneer)

#### Team overzicht (tweede tab)
- Sem en Syb naast elkaar
- Vergelijking per categorie
- Totalen per dag/week
- Wie werkt waaraan (op basis van project-koppeling)

#### Regels & Mapping (derde tab)
- Lijst van categorisatie-regels (app/URL pattern → categorie)
- Regels aanmaken/bewerken/verwijderen
- Project/klant mapping: "VS Code + mapnaam X = Project Y"
- AI-suggesties queue: onbekende apps met AI-voorstel, goedkeuren/afwijzen/aanpassen
- Bulk-acties voor suggesties

#### Tijdregistratie-suggesties (vierde tab)
- Automatisch gegenereerde voorstellen op basis van screen time
- "Je hebt 2u in VS Code gezeten in map autronis-dashboard → koppelen aan project Autronis Dashboard?"
- Goedkeuren → maakt tijdregistratie aan
- Afwijzen → markeer als genegeerd
- Batch goedkeuren voor hele dag

### Integraties

#### Tijdregistratie
- Screen time data genereert automatisch suggesties voor tijdregistraties
- Slimme grouping: aaneengesloten blokken in dezelfde app/project worden samengevoegd
- Geen dubbele registraties: check of er al handmatige registraties overlappen

#### AI Assistent
- Het AI chat system prompt in `/api/ai/chat` wordt uitgebreid met een screen time samenvatting (totaal per categorie vandaag + top 5 apps deze week)
- AI kan vragen beantwoorden als "waar heb ik vandaag de meeste tijd aan besteed?"
- AI kan proactief inzichten geven: "je besteedt 30% van je tijd aan Slack, dat is meer dan vorige week"

## Database Schema (nieuwe tabellen)

### `screen_time_entries`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| client_id | TEXT UNIQUE | UUID van de agent, voor idempotency |
| gebruiker_id | INTEGER FK | Referentie naar gebruikers |
| app | TEXT | Applicatienaam |
| venster_titel | TEXT | Venstertitel |
| url | TEXT | URL (nullable, alleen browsers) |
| categorie | TEXT | Development/Communicatie/Design/Administratie/Afleiding/Overig |
| project_id | INTEGER FK | Gekoppeld project (nullable) |
| klant_id | INTEGER FK | Gekoppelde klant (nullable) |
| start_tijd | TEXT | ISO timestamp |
| eind_tijd | TEXT | ISO timestamp |
| duur_seconden | INTEGER | Duur in seconden |
| bron | TEXT | "agent" of "handmatig" |
| aangemaakt_op | TEXT | Timestamp |

**Indices:** `(gebruiker_id, start_tijd)`, `(gebruiker_id, categorie, start_tijd)`

### `screen_time_regels`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| type | TEXT | "app" of "url" of "venstertitel" |
| patroon | TEXT | Regex of exact match |
| categorie | TEXT | Doelcategorie |
| project_id | INTEGER FK | Optionele project-koppeling |
| klant_id | INTEGER FK | Optionele klant-koppeling |
| prioriteit | INTEGER | Volgorde van matching |
| is_actief | INTEGER | Soft delete |
| aangemaakt_op | TEXT | Timestamp |

### `screen_time_suggesties`
| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| gebruiker_id | INTEGER FK | Referentie naar gebruikers |
| type | TEXT | "categorie" of "tijdregistratie" of "project_koppeling" |
| start_tijd | TEXT | Begin van de gegroepeerde periode |
| eind_tijd | TEXT | Einde van de gegroepeerde periode |
| voorstel | TEXT | JSON met het voorstel |
| status | TEXT | "openstaand" / "goedgekeurd" / "afgewezen" |
| aangemaakt_op | TEXT | Timestamp |
| verwerkt_op | TEXT | Timestamp wanneer goedgekeurd/afgewezen |

## Authenticatie

Desktop agent authenticatie via een persoonlijke API token per gebruiker. Token wordt aangemaakt in de Instellingen pagina van het dashboard en opgeslagen in de Tauri agent config.

### `requireApiKey()` middleware
- Extraheert Bearer token uit Authorization header
- Hasht met SHA-256, zoekt op in `apiKeys` tabel
- Leidt `gebruikerId` af uit de key (niet uit de request body)
- Update `laatstGebruiktOp` timestamp
- Retourneert `gebruikerId` voor gebruik in de route handler

### Data Retentie
- Raw entries worden na 30 dagen gecompacteerd: opeenvolgende entries in dezelfde app worden samengevoegd tot blokken van minimaal 1 minuut
- Gecompacteerde data blijft 12 maanden bewaard
- Compactatie draait als server-side cron/scheduled task

## Categorieën (standaard)

| Categorie | Voorbeelden |
|-----------|-------------|
| Development | VS Code, Terminal, GitHub, GitLab, localhost |
| Communicatie | Slack, Teams, Discord, WhatsApp Web, Gmail |
| Design | Figma, Canva, Adobe apps |
| Administratie | Google Docs, Notion, Spreadsheets, Boekhouding |
| Afleiding | YouTube, Twitter/X, Reddit, Instagram, Netflix |
| Overig | Alles wat niet gecategoriseerd is |

## Privacy & Security

- Tracking kan gepauzeerd worden via systeemtray
- Exclude-lijst voor specifieke apps (bijv. wachtwoordmanager, banking)
- Venstertitels worden niet opgeslagen voor ge-excludede apps
- API tokens zijn per gebruiker, niet gedeeld
- Data is alleen zichtbaar voor de eigen gebruiker + team overzicht
