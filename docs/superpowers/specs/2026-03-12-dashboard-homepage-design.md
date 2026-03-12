# Autronis Dashboard — Homepage Design ("Focus + Peek")

## Overzicht

De dashboard homepage is een **werkpagina** — geen passief overzicht maar een plek waar je direct aan de slag gaat. Layout: gedeelde KPIs bovenaan, jouw werkplek links (2/3 breedte), teamgenoot status rechts (1/3 breedte).

**Uitgangspunten:**
- Data komt uit bestaande tabellen (projecten, taken, tijdregistraties, klanten)
- Pagina is gepersonaliseerd per ingelogde gebruiker
- De "andere gebruiker" kolom toont de teamgenoot (Autronis = 2 personen: Sem en Syb)
- Alle tekst in het Nederlands
- Autronis branding (turquoise accent, donkere achtergrond, card-glow hover)
- Ruime UI met grote tekst en padding (consistent met klant/project pagina's)

---

## 1. Begroeting + Datum

Boven alles, volledige breedte.

- **Begroeting:** Tijdsafhankelijk — "Goedemorgen", "Goedemiddag", "Goedenavond" + voornaam gebruiker
- **Datum:** "Donderdag 12 maart 2026" in het Nederlands

---

## 2. KPI Balk (4 kaarten, volledige breedte)

Grid van 4 kaarten (`grid-cols-2 lg:grid-cols-4`), zelfde stijl als klant detail KPIs.

| KPI | Bron | Kleur |
|-----|------|-------|
| Omzet deze maand | Som van (duurMinuten / 60 × klant.uurtarief) voor alle tijdregistraties in huidige maand | accent (turquoise) |
| Uren deze week | Som van duurMinuten voor huidige week, met subtekst "Sem X:XX · Syb X:XX" | text-primary |
| Actieve projecten | Count van projecten waar isActief=1 en status="actief" | text-primary |
| Deadlines deze week | Count van projecten met deadline in huidige week | danger (rood) als > 0, anders text-primary |

---

## 3. Twee-kolom Layout

`grid-cols-1 lg:grid-template-columns: 2fr 1fr`, gap-8.

### Linker kolom: Mijn Werkplek (2/3)

#### 3a. Snel Starten (Timer)

Card met project dropdown, omschrijving input, en Start knop. Start een timer direct vanuit het dashboard (gebruikt dezelfde Zustand timer store als de tijdregistratie pagina).

- **Project dropdown:** Alle actieve projecten met klantnaam ("Webshop Redesign — TechStart BV")
- **Omschrijving input:** Placeholder "Waar werk je aan?"
- **Start knop:** Groen accent, start timer en maakt tijdregistratie aan
- **Als timer al loopt:** Toon lopende timer met Stop knop in plaats van het startformulier

#### 3b. Mijn Taken

Card met open taken van de ingelogde gebruiker, gesorteerd op prioriteit (hoog → normaal → laag), dan op deadline.

Per taak:
- Status cirkel (klikbaar om status te wijzigen, zelfde als project detail pagina)
- Titel
- Project naam + deadline (rood als verstreken/morgen)
- Prioriteit indicator (kleur: hoog=rood, normaal=amber, laag=grijs)

Header toont "Mijn taken" + count "X open". Max 5 taken tonen, link "Alle taken bekijken" als er meer zijn.

#### 3c. Aankomende Deadlines

Card met projecten gesorteerd op deadline (dichtstbij eerst). Alleen projecten met een deadline tonen.

Per item:
- Projectnaam
- Klantnaam (subtekst)
- Deadline datum met kleurcodering:
  - Rood: verlopen of morgen
  - Amber: binnen 7 dagen
  - Grijs: later

Max 5 items tonen.

### Rechter kolom: Teamgenoot Status (1/3)

De rechter kolom toont de status van de andere gebruiker (niet de ingelogde gebruiker).

#### 3d. Live Status

Card met avatar (profielfoto of initialen), naam, en online status.

- **Aan het werk:** Groene pulserende dot + "Aan het werk" als er een lopende timer is (tijdregistratie met eindTijd=null)
- **Offline:** Grijze dot + "Offline" als er geen actieve timer is
- **Actieve timer detail:** Als aan het werk, toon omschrijving + project + duur

#### 3e. Week Overzicht

Card met staafdiagram van de teamgenoot's uren per dag (ma-vr), gebouwd met CSS divs (zelfde patroon als tijdregistratie weekoverzicht). Totaal uren groot weergegeven.

#### 3f. Taken

Compacte lijst van de teamgenoot's open taken. Kleiner formaat dan de eigen taken sectie. Alleen titel + projectnaam. Max 5 items.

---

## 4. API Route

**GET `/api/dashboard`** — Eén endpoint dat alle data voor het dashboard ophaalt.

Response:
```json
{
  "gebruiker": { "id": 1, "naam": "Sem" },
  "teamgenoot": { "id": 2, "naam": "Syb" },
  "kpis": {
    "omzetDezeMaand": 4850.00,
    "urenDezeWeek": { "totaal": 1110, "eigen": 615, "teamgenoot": 495 },
    "actieveProjecten": 5,
    "deadlinesDezeWeek": 2
  },
  "mijnTaken": [
    { "id": 1, "titel": "...", "projectNaam": "...", "deadline": "...", "prioriteit": "hoog", "status": "open" }
  ],
  "deadlines": [
    { "projectId": 1, "projectNaam": "...", "klantNaam": "...", "deadline": "2026-03-13" }
  ],
  "teamgenootStatus": {
    "actieveTimer": { "omschrijving": "...", "projectNaam": "...", "startTijd": "..." } | null,
    "urenPerDag": [120, 180, 90, 150, 0],
    "urenTotaal": 495,
    "taken": [
      { "id": 5, "titel": "...", "projectNaam": "..." }
    ]
  }
}
```

---

## 5. Mobiele Layout

Op mobiel (`< lg`):
- KPI balk: 2 kolommen
- Twee-kolom layout wordt één kolom: eerst eigen werkplek, dan teamgenoot status
- Timer "Snel starten" wordt compacter (velden stacked)

---

## 6. Interacties

- **Timer starten:** Maakt tijdregistratie aan via bestaande `/api/tijdregistraties` POST, update Zustand timer store
- **Timer stoppen:** PUT naar `/api/tijdregistraties/[id]` met eindTijd
- **Taak afvinken:** PUT naar `/api/taken/[id]` met status wijziging
- **Klik op project in deadlines:** Navigeert naar `/klanten/[klantId]/projecten/[projectId]`
- **Klik op taak:** Navigeert naar het project waar de taak bij hoort

---

## 7. Wat Niet in Scope Is

- Financiën/facturen widget (komt in Fase Facturatie)
- Agenda/kalender widget (komt in Fase Agenda)
- Notificaties systeem
- Drag & drop van taken
