# Screen Time Verbeteringen — Design Spec

## Overzicht

Verbeteringen aan het bestaande screen time tracking systeem om het op Rize-niveau te brengen: sessie-groepering, AI dagsamenvattingen, idle tracking, project detectie uit venstertitels, en een gedetailleerdere UI.

## 1. Sessie-groepering

### Logica
Opeenvolgende screen time entries in dezelfde app/project worden server-side samengevoegd tot **sessies**. Een sessie breekt wanneer:
- De gebruiker >2 minuten naar een andere app/project switcht
- Er een idle periode van >2 minuten tussen zit
- De categorie verandert

### Sessie structuur
```json
{
  "id": "sessie-uuid",
  "gebruikerId": 1,
  "app": "Code",
  "categorie": "development",
  "projectId": 5,
  "projectNaam": "Autronis Dashboard",
  "startTijd": "2026-03-15T09:00:00",
  "eindTijd": "2026-03-15T11:30:00",
  "duurSeconden": 9000,
  "venstertitels": ["page.tsx — autronis-dashboard", "schema.ts — autronis-dashboard", "route.ts — autronis-dashboard"],
  "bestanden": ["page.tsx", "schema.ts", "route.ts"],
  "urls": []
}
```

### API
`GET /api/screen-time/sessies?van=YYYY-MM-DD&tot=YYYY-MM-DD&gebruikerId=N`

Retourneert sessies. **Alleen dag-queries** — geen week/maand bereik op dit endpoint (de UI haalt per dag op). Sessies worden on-the-fly berekend uit `screen_time_entries` voor die dag. Bij ~1000-2000 entries per dag (5 sec polling, 8 uur) is dit snel genoeg in SQLite. De raw entries blijven de bron van waarheid.

`duurSeconden` = som van werkelijke entry-duren binnen de sessie (niet `eindTijd - startTijd`), zodat korte gaps niet meetellen.

### Sessie-break regels
- Gap >2 minuten naar andere app → nieuwe sessie
- Idle >2 minuten → idle sessie
- **Categorie-wisselingen binnen dezelfde app** (bijv. Chrome tabs) breken NIET — de sessie krijgt de dominante categorie (meeste seconden)
- 2 minuten is hardcoded in v1

### Auth
Zelfde patroon als `GET /api/screen-time`: eigen data tenzij admin + `gebruikerId` param.

## 2. Tijdlijn view

### Weergave
Horizontale tijdlijn van 00:00-23:59 (of eerste activiteit - laatste activiteit). Elk blokje representeert een sessie:
- **Breedte** proportioneel aan duur
- **Kleur** per categorie (development=#17B8A5, communicatie=#3B82F6, etc.)
- **Grijs** voor inactieve periodes
- **Hover** toont: app, projectnaam, venstertitel, duur, tijdrange
- **Klik** opent detail-popover met alle venstertitels en bestanden

### Positie in UI
Onder de sessie-kaarten op de Overzicht tab. Altijd zichtbaar (niet in een aparte tab).

## 3. AI Dagsamenvattingen

### Database
Nieuwe tabel `screen_time_samenvattingen`:

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| gebruiker_id | INTEGER FK | Referentie naar gebruikers |
| datum | TEXT | YYYY-MM-DD, uniek per gebruiker+datum |
| samenvatting_kort | TEXT | 1-2 zinnen overzicht |
| samenvatting_detail | TEXT | Gedetailleerd per project/categorie (markdown) |
| totaal_seconden | INTEGER | Totale schermtijd die dag |
| productief_percentage | INTEGER | Productief % |
| top_project | TEXT | Meest gewerkt aan project |
| aangemaakt_op | TEXT | Timestamp |

Unieke index op `(gebruiker_id, datum)`.

### AI Provider
Gebruikt de bestaande `@anthropic-ai/sdk` (al geïnstalleerd) met `ANTHROPIC_API_KEY` (al in `.env.local`). Zelfde setup als `/api/ai/chat` en `/api/screen-time/categoriseer`.

### Automatisch genereren
- Bij het openen van de Schermtijd pagina: check of er een samenvatting bestaat voor gisteren (via een `lastChecked` timestamp in sessionStorage om dubbele calls te voorkomen). Zo niet, en er is data, genereer automatisch.
- Niet via een cron/scheduled task (te complex voor SQLite setup), maar lazy: bij page load, max 1x per browser-sessie.

### On-demand
- Knop "Samenvatting genereren" op de Overzicht tab voor de huidige geselecteerde dag.
- Overschrijft bestaande samenvatting voor die dag.

### AI prompt
Stuurt naar Claude:
- Alle sessies van die dag (app, categorie, project, duur, venstertitels)
- Idle periodes
- Vraagt om:
  1. `samenvatting_kort`: 1-2 zinnen, bijv. "Productieve dag: 5u development aan Autronis Dashboard, 1u communicatie via Slack en Gmail."
  2. `samenvatting_detail`: Markdown met per project/categorie een bullet met specifieke activiteiten uit venstertitels, bijv. "- **Autronis Dashboard** (3u): Werkte aan schema.ts, page.tsx en sync/route.ts. Reviewde PR op GitHub."

### API
- `GET /api/screen-time/samenvatting?datum=YYYY-MM-DD` — haal bestaande samenvatting op
- `POST /api/screen-time/samenvatting` — genereer (opnieuw) voor een datum, body: `{ datum: "YYYY-MM-DD" }`

### UI
Dagsamenvatting kaart bovenaan de Overzicht tab:
- Korte samenvatting altijd zichtbaar
- "Meer details" uitklapbaar met de gedetailleerde markdown
- "Opnieuw genereren" knopje
- Lege staat als er geen samenvatting is: "Samenvatting genereren" knop

## 4. Idle Tracking

### Agent-side wijziging
Huidige gedrag: als de gebruiker >60 seconden idle is, stopt de agent met loggen.
Nieuw gedrag: als de gebruiker >60 seconden idle is, maak een entry met `app: "Inactief"` en `title: "Geen activiteit"`. De idle entry loopt door zolang de gebruiker idle blijft (wordt gemerged net als normale entries in storage.rs).

Wanneer de gebruiker weer actief wordt, eindigt de "Inactief" entry en start een nieuwe entry voor de actieve app.

### Agent-side idle loop
Tijdens idle state pollt de agent nog steeds elke `track_interval_secs` (5 sec). Zolang idle >60 sec, wordt de "Inactief" entry verlengd (merge logica in storage.rs). Zodra `get_idle_duration() < 60 sec`, stopt de idle entry en begint een nieuwe actieve entry.

### Server-side
- "Inactief" entries worden opgeslagen met categorie `"inactief"` (nieuwe enum waarde toevoegen aan `screen_time_entries.categorie`)
- In de sessie-groepering worden ze als aparte "Idle" sessies gemarkeerd
- In de UI getoond als grijze blokken
- Tellen NIET mee in productief % of totale schermtijd (gefilterd in de berekening)

### Idle drempel
60 seconden (huidige waarde). Niet configureerbaar in v1.

## 5. Project Detectie uit Venstertitels

### Parsing logica (server-side, bij sync)
Bekende patronen in venstertitels:

| App | Patroon | Extract |
|-----|---------|---------|
| VS Code / Cursor | `bestand — mapnaam — Visual Studio Code` | mapnaam |
| JetBrains IDEs | `bestand — project` | project |
| Terminal | `user@host: ~/pad/naar/project` | laatste map in pad |
| Chrome/Edge | `paginatitel — Google Chrome` | paginatitel (voor URL matching) |
| Figma | `bestandnaam — Figma` | bestandnaam |

### Matching
1. Parse mapnaam/projectnaam uit venstertitel
2. Match tegen projecten — projectlijst wordt gecached in-memory bij sync start (max ~20 rijen), matching in JS met `projectNaam.toLowerCase().includes(mapnaam.toLowerCase())`
3. **Exacte match** (1 resultaat) → automatisch `project_id` en `klant_id` setten op de entry
4. **Geen match** → laat als null, geen suggestie (te veel ruis)
5. **Meerdere matches** → laat als null

### Bestandsnamen extractie
Bestandsnamen worden niet apart opgeslagen — ze worden at-render-time geparsed uit de `venstertitels` array in de sessie. Geen extra DB kolom nodig.

### Waar
In de sync endpoint (`/api/screen-time/sync`) na categorisatie, als extra stap. Parsed de `venstertitel` van elke entry.

## 6. UI Aanpassingen Overzicht Tab

### Nieuwe layout (top → bottom)
1. **Dagsamenvatting kaart** — korte samenvatting + uitklapbaar detail
2. **KPI's** — Totale schermtijd, Productief %, Actieve tijd vs Idle, Sessies
3. **Sessie-kaarten** — per sessie: tijdblok, app icoon, projectnaam, categorie badge, duur, lijst van bestanden/URLs
4. **Tijdlijn** — horizontale balk met gekleurde sessie-blokken + grijze idle blokken
5. **Top Apps** — bestaande lijst, maar nu met venstertitel-details

### Sessie-kaarten detail
```
┌─────────────────────────────────────────────┐
│ 🟢 9:00 - 11:30  Development    2u 30m     │
│ VS Code — Autronis Dashboard               │
│ Bestanden: page.tsx, schema.ts, route.ts    │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ ⚪ 11:30 - 11:45  Inactief       15m        │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ 🔵 11:45 - 12:30  Communicatie   45m        │
│ Chrome — Slack, Gmail                        │
│ Notion — Sprint planning Q2                  │
└─────────────────────────────────────────────┘
```
