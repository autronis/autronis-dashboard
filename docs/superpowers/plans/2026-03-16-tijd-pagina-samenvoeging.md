# Tijd Pagina Samenvoeging — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge `/tijdregistratie` and `/schermtijd` into one unified `/tijd` page with compact timer, timeline, registrations, team view, and rules/suggestions.

**Architecture:** Extract existing tab components from the 1389-line schermtijd page into separate files under `src/app/(dashboard)/tijd/`. Move HandmatigModal. Create compact timer-strip. Compose in a new page.tsx. Redirect old routes. Update all navigation references.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Zustand (timer), React Query (data fetching), lucide-react (icons)

**Spec:** `docs/superpowers/specs/2026-03-16-tijd-pagina-samenvoeging-design.md`

---

## File Structure

### Create:
- `src/app/(dashboard)/tijd/page.tsx` — Main page: header, timer strip, tabs, period selector
- `src/app/(dashboard)/tijd/constants.ts` — Shared constants (categorie kleuren/labels, helpers)
- `src/app/(dashboard)/tijd/timer-strip.tsx` — Compact inline timer component
- `src/app/(dashboard)/tijd/tab-tijdlijn.tsx` — Timeline view (extracted from schermtijd TabOverzicht + DagTimeline + WeekTimeline + SessieDetailPanel)
- `src/app/(dashboard)/tijd/tab-registraties.tsx` — Registration list (extracted from tijdregistratie)
- `src/app/(dashboard)/tijd/tab-team.tsx` — Team view (extracted from schermtijd TabTeam)
- `src/app/(dashboard)/tijd/tab-regels-suggesties.tsx` — Rules + suggestions (extracted from schermtijd TabRegels + TabSuggesties)
- `src/app/(dashboard)/tijd/handmatig-modal.tsx` — Moved from tijdregistratie

### Modify:
- `src/components/layout/sidebar.tsx` — Replace 2 items with 1 "Tijd" item
- `src/components/layout/bottom-nav.tsx` — Update Timer href to `/tijd`
- `src/components/layout/header.tsx` — Update timer link to `/tijd`
- `src/components/ui/command-palette.tsx` — Update route references
- `src/components/ui/quick-action-button.tsx` — Update route reference

### Replace with redirects:
- `src/app/(dashboard)/tijdregistratie/page.tsx` — Replace with redirect to `/tijd`
- `src/app/(dashboard)/schermtijd/page.tsx` — Replace with redirect to `/tijd`

### Delete:
- `src/app/(dashboard)/tijdregistratie/handmatig-modal.tsx` — Moved to `/tijd/`

---

## Chunk 1: Foundation — Constants, Helpers & HandmatigModal

### Task 1: Create shared constants file

**Files:**
- Create: `src/app/(dashboard)/tijd/constants.ts`

- [ ] **Step 1: Create constants.ts with unified category maps and helpers**

```typescript
// Unified category colors (hex for timeline rendering)
// Unified category labels (NL)
// Helper functions: formatTijd, datumLabel, berekenVanTot, navigeerDatum, parseBestandenUitTitels, formatTijdRange, gisterenDatum
// Types: Periode, TabId
// PRODUCTIEF_CATEGORIEEN
```

Source: lines 55-184 from `src/app/(dashboard)/schermtijd/page.tsx`
Add `meeting` to CATEGORIE_KLEUREN with same color as communicatie (`#3B82F6`).
Add `meeting` to CATEGORIE_LABELS as "Meeting".

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/tijd/constants.ts
git commit -m "feat(tijd): shared constants and helpers for merged tijd page"
```

---

### Task 2: Move HandmatigModal

**Files:**
- Create: `src/app/(dashboard)/tijd/handmatig-modal.tsx`
- Delete: `src/app/(dashboard)/tijdregistratie/handmatig-modal.tsx`

- [ ] **Step 1: Copy handmatig-modal.tsx to new location**

Copy `src/app/(dashboard)/tijdregistratie/handmatig-modal.tsx` → `src/app/(dashboard)/tijd/handmatig-modal.tsx`.
No changes needed to the file content — imports are all absolute (`@/`).

- [ ] **Step 2: Delete old file**

Remove `src/app/(dashboard)/tijdregistratie/handmatig-modal.tsx`.

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Note: will show error in tijdregistratie/page.tsx (expected — it still imports old path). This is resolved in Task 8.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/tijd/handmatig-modal.tsx
git add src/app/\(dashboard\)/tijdregistratie/handmatig-modal.tsx
git commit -m "refactor: move HandmatigModal to /tijd/ directory"
```

---

## Chunk 2: Tab Components

### Task 3: Create tab-tijdlijn.tsx

**Files:**
- Create: `src/app/(dashboard)/tijd/tab-tijdlijn.tsx`

- [ ] **Step 1: Extract TabOverzicht and supporting components**

Extract from `src/app/(dashboard)/schermtijd/page.tsx` lines 186-797:
- `getTimePosition`, `getBlockHeight`, `getCurrentTimePosition`, `isToday`, `getWeekStart` helpers
- `SessieDetailPanel` component
- `DagTimeline` component
- `WeekTimeline` component
- `TabOverzicht` component (rename to `TabTijdlijn`)

Import constants from `./constants`.
Import hooks from `@/hooks/queries/use-screen-time` and `@/hooks/queries/use-tijdregistraties`.

**Key change:** In TabTijdlijn, after fetching `useSessies()`, also fetch `useRegistraties()` for the same date range. Convert handmatige registraties to sessie-format and merge into the sessies array:

```typescript
// Convert tijdregistratie to sessie-compatible format
const handmatigeSessies: ScreenTimeSessie[] = (registraties ?? [])
  .filter(r => r.isHandmatig || !r.eindTijd) // only manual entries
  .map(r => ({
    app: "Handmatig",
    categorie: r.categorie === "meeting" ? "communicatie" : r.categorie as ScreenTimeCategorie,
    startTijd: r.startTijd,
    eindTijd: r.eindTijd ?? r.startTijd,
    duurSeconden: (r.duurMinuten ?? 0) * 60,
    beschrijving: r.omschrijving ?? "",
    projectNaam: r.projectNaam ?? null,
    klantNaam: r.klantNaam ?? null,
    isIdle: false,
    venstertitels: r.omschrijving ? [r.omschrijving] : [],
  }));
```

Merge and sort by startTijd before passing to DagTimeline/WeekTimeline.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/tijd/tab-tijdlijn.tsx
git commit -m "feat(tijd): extract TabTijdlijn with merged screen time + manual entries"
```

---

### Task 4: Create tab-registraties.tsx

**Files:**
- Create: `src/app/(dashboard)/tijd/tab-registraties.tsx`

- [ ] **Step 1: Extract registration list from tijdregistratie page**

Extract the registration list view from `src/app/(dashboard)/tijdregistratie/page.tsx`:
- Period filter state (dag/week/maand)
- Date navigation
- Registration list grouped by day with totals
- Entry display: status dot, description, project+client, category badge, times, duration
- Hover actions: repeat, edit, delete
- CSV export button
- Manual entry button (opens HandmatigModal)
- ConfirmDialog for deletes
- Empty state

Import `HandmatigModal` from `./handmatig-modal`.
Import constants from `./constants`.
Import hooks from `@/hooks/queries/use-tijdregistraties`.

**Do NOT include:** The timer controls, timer form, week bar chart — these are handled by other components.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/tijd/tab-registraties.tsx
git commit -m "feat(tijd): extract TabRegistraties with day-grouped list and manual entry"
```

---

### Task 5: Create tab-team.tsx

**Files:**
- Create: `src/app/(dashboard)/tijd/tab-team.tsx`

- [ ] **Step 1: Extract TabTeam from schermtijd page**

Extract from `src/app/(dashboard)/schermtijd/page.tsx` lines 799-913.
Import constants from `./constants`.
Import hooks from `@/hooks/queries/use-screen-time` and `@/hooks/queries/use-doelen`.

No logic changes needed — direct extraction.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/tijd/tab-team.tsx
git commit -m "feat(tijd): extract TabTeam component"
```

---

### Task 6: Create tab-regels-suggesties.tsx

**Files:**
- Create: `src/app/(dashboard)/tijd/tab-regels-suggesties.tsx`

- [ ] **Step 1: Extract and merge TabRegels + TabSuggesties**

Extract from `src/app/(dashboard)/schermtijd/page.tsx`:
- `TabRegels` (lines 915-1132)
- `TabSuggesties` (lines 1134-1294)

Combine into one component `TabRegelsSuggesties` with an internal toggle/section:
- Top section: Rules (existing TabRegels content)
- Divider
- Bottom section: Suggestions (existing TabSuggesties content)

Import constants from `./constants`.
Import hooks from `@/hooks/queries/use-screen-time`.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/tijd/tab-regels-suggesties.tsx
git commit -m "feat(tijd): extract TabRegelsSuggesties with rules and suggestions"
```

---

## Chunk 3: Timer Strip & Main Page

### Task 7: Create timer-strip.tsx

**Files:**
- Create: `src/app/(dashboard)/tijd/timer-strip.tsx`

- [ ] **Step 1: Build compact inline timer component**

Build a compact timer strip that sits in the header row:

**Collapsed state** (timer not running):
- Single button "Timer starten" (Play icon + text)

**Expanded state** (timer running or after clicking start):
- Inline row: project dropdown, description input, category select, start/stop button, elapsed time display
- All on one line (flex row, responsive wrap on mobile)
- Pulsing green dot when running

Use `useTimer` from `@/hooks/use-timer`.
Use `useProjecten` from `@/hooks/queries/use-tijdregistraties`.
Use `useMutation` for start/stop API calls to `/api/tijdregistraties`.

Logic extracted from `src/app/(dashboard)/tijdregistratie/page.tsx` timer section, but rendered as compact strip instead of large hero.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/tijd/timer-strip.tsx
git commit -m "feat(tijd): compact inline timer strip component"
```

---

### Task 8: Create main page.tsx

**Files:**
- Create: `src/app/(dashboard)/tijd/page.tsx`

- [ ] **Step 1: Compose main page from tab components**

```typescript
"use client";

// Imports: all tab components, TimerStrip, constants, icons, hooks, PageTransition
// State: activeTab, periode, datum
// Tabs: tijdlijn, registraties, team, regels-suggesties

// Layout:
// 1. Header row: "Tijd" title left + <TimerStrip /> right
// 2. Tab bar: 4 tabs (Tijdlijn, Registraties, Team, Regels & Suggesties)
// 3. Period selector (for tijdlijn and team tabs only)
// 4. Active tab content
```

Tab definitions:
```typescript
const TABS = [
  { id: "tijdlijn", label: "Tijdlijn", icon: Monitor },
  { id: "registraties", label: "Registraties", icon: Clock },
  { id: "team", label: "Team", icon: Users },
  { id: "regels", label: "Regels & Suggesties", icon: Shield },
];
```

KPI row (4 cards: actief, idle, productief %, sessies) — shown above tabs or below tab bar when tijdlijn tab is active. Fetch via `useSessies()`.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/tijd/page.tsx
git commit -m "feat(tijd): main page composing timer strip and tab components"
```

---

## Chunk 4: Navigation Updates & Redirects

### Task 9: Update all navigation references

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/bottom-nav.tsx`
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/ui/command-palette.tsx`
- Modify: `src/components/ui/quick-action-button.tsx`

- [ ] **Step 1: Update sidebar.tsx**

Replace the two sidebar items ("Tijdregistratie" + "Schermtijd") with one:
```typescript
{ label: "Tijd", icon: Clock, href: "/tijd" },
```

- [ ] **Step 2: Update bottom-nav.tsx**

Change `href: "/tijdregistratie"` → `href: "/tijd"` for the Timer item.

- [ ] **Step 3: Update header.tsx**

Change timer indicator link from `/tijdregistratie` → `/tijd`.

- [ ] **Step 4: Update command-palette.tsx**

Change `/tijdregistratie` references to `/tijd`.

- [ ] **Step 5: Update quick-action-button.tsx**

Change `/tijdregistratie` reference to `/tijd`.

- [ ] **Step 6: Grep for any remaining references**

Run: `grep -r "/tijdregistratie\|/schermtijd" src/ --include="*.tsx" --include="*.ts" -l`
Update any remaining files found.

- [ ] **Step 7: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/sidebar.tsx src/components/layout/bottom-nav.tsx src/components/layout/header.tsx src/components/ui/command-palette.tsx src/components/ui/quick-action-button.tsx
git commit -m "refactor: update all navigation from /tijdregistratie and /schermtijd to /tijd"
```

---

### Task 10: Create redirects for old routes

**Files:**
- Modify: `src/app/(dashboard)/tijdregistratie/page.tsx` — Replace with redirect
- Modify: `src/app/(dashboard)/schermtijd/page.tsx` — Replace with redirect

- [ ] **Step 1: Replace tijdregistratie/page.tsx with redirect**

```typescript
import { redirect } from "next/navigation";

export default function TijdregistratiePage() {
  redirect("/tijd");
}
```

- [ ] **Step 2: Replace schermtijd/page.tsx with redirect**

```typescript
import { redirect } from "next/navigation";

export default function SchermtijdPage() {
  redirect("/tijd");
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/tijdregistratie/page.tsx src/app/\(dashboard\)/schermtijd/page.tsx
git commit -m "refactor: redirect old routes /tijdregistratie and /schermtijd to /tijd"
```

---

## Chunk 5: Final Verification

### Task 11: Full build & manual test

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Verify:
- `/tijd` loads with timer strip, tabs, and KPIs
- Tijdlijn tab shows sessions timeline
- Timer start/stop works
- Registraties tab shows entries with manual entry modal
- Team tab shows user stats
- Regels & Suggesties tab works
- `/tijdregistratie` redirects to `/tijd`
- `/schermtijd` redirects to `/tijd`
- Sidebar shows single "Tijd" item
- Bottom nav Timer links to `/tijd`
- Header timer indicator links to `/tijd`

- [ ] **Step 4: Final commit if any fixes needed**
