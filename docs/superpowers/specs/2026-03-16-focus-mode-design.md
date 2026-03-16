# Focus Mode — Design Spec

**Datum:** 2026-03-16
**Status:** Goedgekeurd

## Samenvatting

Focus Mode is een deep work timer met full-screen overlay, automatische tijdregistratie en statistieken. Gebruikers selecteren een project + optioneel een taak, kiezen een duur (25/50/custom minuten), en werken in een afleidingsvrije overlay met countdown timer. Na afloop wordt de tijd automatisch geregistreerd en kan een optionele reflectie worden toegevoegd.

## Architectuur

### Aanpak

Aparte `useFocus` Zustand store die de bestaande tijdregistratie API aanroept. Focus Mode start onder de hood een normale tijdregistratie (categorie: "focus") en beheert z'n eigen countdown + overlay state. De bestaande `useTimer` store blijft ongewijzigd — bij focus-start wordt een eventueel actieve timer automatisch gestopt.

### Waarom deze aanpak

- Clean separation of concerns: focus-logica is geïsoleerd van timer-logica
- Alle tijd komt in dezelfde `tijdregistraties` tabel terecht
- Geen breaking changes aan bestaande functionaliteit
- Focus-specifieke metadata (geplande duur, reflectie, status) in eigen tabel

## Database

### Nieuwe tabel: `focus_sessies`

| Kolom | Type | Details |
|-------|------|---------|
| id | integer | PK, autoIncrement |
| gebruiker_id | integer | FK → gebruikers |
| project_id | integer | FK → projecten |
| taak_id | integer | nullable, FK → taken |
| geplande_duur_minuten | integer | 25, 50, of custom |
| werkelijke_duur_minuten | integer | nullable, ingevuld bij stop |
| reflectie | text | nullable, optioneel 1-zin reflectie |
| tijdregistratie_id | integer | FK → tijdregistraties |
| status | text | "actief" / "voltooid" / "afgebroken" |
| aangemaakt_op | text | datetime default now |

### Wijzigingen bestaand schema

- `tijdregistraties.categorie` enum uitbreiden met `"focus"` waarde in `schema.ts`
- `TijdCategorie` type uitbreiden met `"focus"` in `src/types/index.ts`
- `tijdregistratie_id` kolom is NOT NULL — een focus sessie bestaat altijd met een tijdregistratie

### Migratie

Na schema-wijzigingen: `npx drizzle-kit generate` → `npx drizzle-kit push`

## Zustand Store — `useFocus`

**Bestand:** `src/hooks/use-focus.ts`

### State

```typescript
interface FocusState {
  isActive: boolean
  isPaused: boolean
  projectId: number | null
  taakId: number | null
  geplandeDuur: number      // seconden
  resterend: number          // seconden
  focusSessieId: number | null
  tijdregistratieId: number | null
  showSetup: boolean
  showReflectie: boolean
}
```

### Actions

```typescript
interface FocusActions {
  openSetup: () => void
  closeSetup: () => void
  start: (projectId: number, taakId: number | null, duurMinuten: number) => Promise<void>
  pause: () => void
  resume: () => void
  stop: (reflectie?: string) => Promise<void>
  tick: () => void
  triggerComplete: () => void
  closeReflectie: () => void
  restore: () => void
}
```

### Flow

1. `openSetup()` → toont setup modal
2. `start(projectId, taakId?, duur)`:
   - Als timer actief: `PUT /api/tijdregistraties/:id` (sluit server-side record) + `useTimer.getState().stop()`
   - `POST /api/tijdregistraties` → start tijdregistratie (categorie: "focus")
   - `POST /api/focus` → maak focus sessie (rejects als er al een actieve sessie is)
   - Sla `startTimestamp` op + `geplandeDuur`
   - Start countdown
3. `tick()` → berekent `resterend = geplandeDuur - (now - startTimestamp) + totalePauzeDuur`, bij 0 → `triggerComplete()`
   - Gebruikt absolute tijd (niet `resterend -= 1`) zodat background tab throttling geen drift veroorzaakt
   - `document.visibilitychange` event forceert tick bij tab-focus
4. `triggerComplete()` → geluid + browser notificatie + `showReflectie = true`
5. `stop(reflectie?)`:
   - `PUT /api/tijdregistraties/:id` → eind_tijd + duur_minuten
   - `PUT /api/focus/:id` → werkelijke_duur, reflectie, status
6. `pause()` → slaat `pauseStartTimestamp` op, stopt tick
7. `resume()` → telt pauzeduur op bij `totalePauzeDuur`, hervat tick

### Persistentie

localStorage key: `autronis-focus`. Opgeslagen shape:

```typescript
{
  isActive: boolean
  isPaused: boolean
  projectId: number
  taakId: number | null
  geplandeDuur: number          // seconden
  startTimestamp: number         // Date.now() bij start
  totalePauzeDuur: number        // seconden, opgeteld bij elke resume
  pauseStartTimestamp: number | null  // Date.now() bij laatste pause
  focusSessieId: number
  tijdregistratieId: number
}
```

`restore()` berekent bij mount het juiste `resterend` uit `startTimestamp` + `totalePauzeDuur`.

## API Routes

### `/api/focus` — GET

Sessies ophalen met filters.

**Query params:** `van`, `tot` (ISO date strings)

**Response:** `{ sessies: FocusSessie[] }` met project- en taak-joins

### `/api/focus` — POST

Nieuwe focus sessie aanmaken.

**Body:**
```json
{
  "projectId": 1,
  "taakId": null,
  "geplandeDuurMinuten": 25,
  "tijdregistratieId": 123
}
```

**Response:** `{ sessie: FocusSessie }` (201)

### `/api/focus/[id]` — PUT

Sessie updaten (bij stop/complete).

**Body:**
```json
{
  "werkelijkeDuurMinuten": 23,
  "reflectie": "API endpoint afgemaakt",
  "status": "voltooid"
}
```

**Response:** `{ sessie: FocusSessie }`

### `/api/focus/[id]` — DELETE

Sessie verwijderen (bijv. per ongeluk gestart). Verwijdert ook gekoppelde tijdregistratie.

**Response:** `{ succes: true }`

### `/api/focus` — POST validatie

POST rejects met `{ fout: "Er is al een actieve focus sessie" }` (409) als er een sessie met `status: "actief"` bestaat voor de gebruiker. Voorkomt dubbele sessies bij meerdere tabs.

### `/api/focus/statistieken` — GET

Aggregaties voor dashboard widget en statistieken pagina.

**Query params:** `van`, `tot`

**Response:**
```json
{
  "vandaag": { "sessies": 3, "totaleDuurMinuten": 95 },
  "week": [
    { "dag": "2026-03-10", "duurMinuten": 50 },
    { "dag": "2026-03-11", "duurMinuten": 75 }
  ],
  "vorigeWeek": { "totaleDuurMinuten": 320 },
  "streak": 5,
  "perProject": [
    { "projectId": 1, "projectNaam": "Dashboard", "duurMinuten": 120, "sessies": 4 }
  ]
}
```

Alle routes met `requireAuth()`, error format: `{ fout: "message" }`.

## UI Componenten

### 1. Focus Button — Header

- **Positie:** links van timer-badge in header
- **Icoon:** `Target` (lucide-react)
- **Normaal:** teal accent kleur, klik → `openSetup()`
- **Tijdens sessie:** pulserend glow + resterende tijd als badge, klik → focus overlay openen

### 2. Focus Setup Modal

- Gebruikt bestaande `Modal` component (`breedte: "md"`)
- **Project dropdown** (verplicht) — alle actieve projecten
- **Taak dropdown** (optioneel) — gefilterd op geselecteerd project, alleen open/bezig taken
- **Duur selectie:**
  - Drie knoppen: "25 min" (Pomodoro), "50 min", "Custom"
  - Custom: number input (5-120 minuten)
- **"Start Focus" knop** — accent kleur, groot

### 3. Focus Overlay — Full Screen

- `position: fixed`, `inset: 0`, `z-index: 60` (boven header z-50)
- Achtergrond: `autronis-bg` met subtle radial gradient
- **Centered layout:**
  - Circulaire progress ring (SVG) met countdown erin
  - Timer tekst: `MM:SS` formaat, monospace, ~6rem font size
  - Project naam + taak naam eronder (text-secondary)
  - Pauze knop (toggle play/pause icoon)
  - Stop knop (met confirm dialog: "Wil je de focus sessie stoppen?")
- **Escape key** → zelfde confirm dialog
- **Geen** sidebar, header, of andere UI zichtbaar
- Framer Motion animatie bij open/close

### 4. Reflectie Modal

- Verschijnt na timer afloop OF handmatige stop
- **Textarea:** "Wat heb je gedaan?" placeholder
- **Twee knoppen:** "Opslaan" en "Overslaan"
- Opslaan → PUT focus sessie met reflectie tekst
- Overslaan → PUT focus sessie zonder reflectie (status: voltooid/afgebroken)

### 5. Dashboard Widget — "Focus vandaag"

- Card op homepage, zelfde stijl als bestaande widgets
- **Inhoud:**
  - Kop: "Focus vandaag"
  - Groot getal: totale focus-uren (bijv. "1,5 uur")
  - Subtekst: aantal sessies (bijv. "3 sessies")
  - Mini bar chart: focus minuten per dag (ma-zo), pure CSS bars
  - Accent kleur voor bars, met hover tooltip
- **Link:** "Bekijk details →" naar `/focus`

### 6. /focus Statistieken Pagina

- **Sidebar item:** "Focus" met `Target` icoon, geplaatst na "Tijdregistratie"
- **Secties:**
  1. **Vandaag:** lijst van sessies met project, duur, taak, reflectie
  2. **Week overzicht:** bar chart per dag (ma-zo)
  3. **Vergelijking vorige week:** delta percentage + richting pijl
  4. **Per-project breakdown:** tabel met project, sessies, totale duur
  5. **Streak counter:** opeenvolgende dagen met ≥1 focus sessie

## Geluid & Notificatie

- **Web Audio API:** korte synthesized "ding" toon bij timer-afloop (geen externe audio files)
- **Browser Notification:** `Notification.requestPermission()` bij eerste focus start
- Als tab niet actief → browser notification met "Focus sessie voltooid!" tekst
- Backup: `setTimeout` met exacte resterende ms als fallback voor `setInterval` throttling in background tabs

## Scope Afbakening

### Wel

- Focus timer met countdown overlay
- Automatische tijdregistratie koppeling
- Setup modal met project/taak/duur selectie
- Reflectie na sessie
- Dashboard widget
- Statistieken pagina met weekoverzicht
- Streak tracking
- Geluid + browser notificatie

### Niet (bewust uitgesloten)

- Heatmap visualisatie (kan later toegevoegd)
- Pomodoro break-timer (alleen work timer)
- Team/vergelijking features
- Integratie met externe focus apps
- Keyboard shortcuts voor focus actions
